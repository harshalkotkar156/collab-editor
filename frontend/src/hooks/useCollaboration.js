import { useEffect, useRef, useState, useCallback } from 'react'
import * as Y from 'yjs'
import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:4000'

// 10 distinct user colors
const USER_COLORS = [
  '#6ee7b7', '#60a5fa', '#f472b6', '#fb923c',
  '#a78bfa', '#facc15', '#34d399', '#f87171',
  '#38bdf8', '#e879f9',
]

function randomColor() {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
}

function getOrCreateUser() {
  const stored = sessionStorage.getItem('collab-user')
  if (stored) return JSON.parse(stored)
  const adjectives = ['Swift', 'Calm', 'Bold', 'Bright', 'Keen', 'Quick', 'Sharp', 'Wise']
  const animals = ['Fox', 'Owl', 'Bear', 'Wolf', 'Hawk', 'Lynx', 'Deer', 'Hare']
  const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${animals[Math.floor(Math.random() * animals.length)]}`
  const user = { name, color: randomColor() }
  sessionStorage.setItem('collab-user', JSON.stringify(user))
  return user
}

export function useCollaboration(documentId) {
  const [content, setContent] = useState('')
  const [users, setUsers] = useState([])
  const [connected, setConnected] = useState(false)
  const [synced, setSynced] = useState(false)
  const [title, setTitle] = useState('Untitled Document')

  const socketRef = useRef(null)
  const ydocRef = useRef(null)
  const ytextRef = useRef(null)
  const userRef = useRef(getOrCreateUser())
  const isApplyingRemote = useRef(false) // prevent echo loops
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!documentId) return

    // ── 1. Init Yjs document ──────────────────────────────────────────
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText('content')
    ydocRef.current = ydoc
    ytextRef.current = ytext

    // ── 2. Connect Socket.io ──────────────────────────────────────────
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join-document', { documentId, user: userRef.current })
    })

    socket.on('disconnect', () => setConnected(false))

    // ── 3. Receive full Yjs state on join ─────────────────────────────
    socket.on('sync-state', ({ update }) => {
      isApplyingRemote.current = true
      Y.applyUpdate(ydoc, new Uint8Array(update))
      isApplyingRemote.current = false
      setContent(ytext.toString())
      setSynced(true)
    })

    // ── 4. Receive incremental Yjs updates from other users ───────────
    socket.on('yjs-update', ({ update }) => {
      isApplyingRemote.current = true
      const before = ytext.toString()
      Y.applyUpdate(ydoc, new Uint8Array(update))
      const after = ytext.toString()
      isApplyingRemote.current = false

      if (before !== after) {
        // Preserve cursor position during remote update
        const el = textareaRef.current
        if (el) {
          const selStart = el.selectionStart
          const selEnd = el.selectionEnd
          setContent(after)
          // Restore cursor after React re-render
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = selStart
              textareaRef.current.selectionEnd = selEnd
            }
          })
        } else {
          setContent(after)
        }
      }
    })

    // ── 5. Presence updates ───────────────────────────────────────────
    socket.on('presence-update', ({ users }) => {
      setUsers(users.filter(u => u.id !== socket.id))
    })

    // ── 6. Title updates from other users ────────────────────────────
    socket.on('title-update', ({ title }) => setTitle(title))

    // ── 7. Observe Yjs text changes to broadcast ──────────────────────
    ytext.observe((event) => {
      if (isApplyingRemote.current) return
      // Encode only the delta (not full state) for efficiency
      const update = Y.encodeStateAsUpdate(ydoc)
      socket.emit('yjs-update', { documentId, update: Array.from(update) })
    })

    return () => {
      socket.disconnect()
      ydoc.destroy()
      setSynced(false)
      setConnected(false)
      setUsers([])
    }
  }, [documentId])

  // ── Handle local text changes from the textarea ───────────────────────────
  const handleChange = useCallback((e) => {
    const newValue = e.target.value
    const ytext = ytextRef.current
    const ydoc = ydocRef.current
    if (!ytext || !ydoc) return

    const oldValue = ytext.toString()

    // Compute the diff: find changed region
    let start = 0
    while (start < oldValue.length && start < newValue.length && oldValue[start] === newValue[start]) start++
    let endOld = oldValue.length
    let endNew = newValue.length
    while (endOld > start && endNew > start && oldValue[endOld - 1] === newValue[endNew - 1]) { endOld--; endNew-- }

    // Apply as a Yjs transaction — this triggers ytext.observe above
    ydoc.transact(() => {
      if (endOld > start) ytext.delete(start, endOld - start)
      if (endNew > start) ytext.insert(start, newValue.slice(start, endNew))
    })

    setContent(newValue)
  }, [])

  // ── Broadcast cursor position ─────────────────────────────────────────────
  const handleCursorMove = useCallback((e) => {
    const socket = socketRef.current
    if (!socket || !documentId) return
    socket.emit('cursor-update', {
      documentId,
      cursor: { start: e.target.selectionStart, end: e.target.selectionEnd },
    })
  }, [documentId])

  // ── Update title ──────────────────────────────────────────────────────────
  const updateTitle = useCallback((newTitle) => {
    setTitle(newTitle)
    const socket = socketRef.current
    if (socket && documentId) {
      socket.emit('title-update', { documentId, title: newTitle })
    }
    // Persist to DB via REST
    fetch(`/api/documents/${documentId}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    }).catch(console.error)
  }, [documentId])

  return {
    content,
    users,
    connected,
    synced,
    title,
    user: userRef.current,
    textareaRef,
    handleChange,
    handleCursorMove,
    updateTitle,
  }
}
