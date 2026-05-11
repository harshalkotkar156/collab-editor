const Y = require('yjs')
const Document = require('../models/Document')

// In-memory map: documentId → { ydoc, clients: Set, saveTimeout }
const rooms = new Map()

// How often to auto-save to MongoDB (ms)
const SAVE_INTERVAL = 3000

async function getOrCreateRoom(documentId) {
  if (rooms.has(documentId)) return rooms.get(documentId)

  const ydoc = new Y.Doc()

  // Load persisted Yjs state from MongoDB if it exists
  try {
    const dbDoc = await Document.findById(documentId)
    if (dbDoc && dbDoc.yState) {
      const stateBuffer = Buffer.from(dbDoc.yState, 'base64')
      Y.applyUpdate(ydoc, stateBuffer)
    }
  } catch (err) {
    console.error(`Failed to load Yjs state for ${documentId}:`, err.message)
  }

  const room = { ydoc, clients: new Map(), saveTimeout: null }
  rooms.set(documentId, room)
  return room
}

async function saveRoomToDb(documentId) {
  const room = rooms.get(documentId)
  if (!room) return
  try {
    const state = Y.encodeStateAsUpdate(room.ydoc)
    const stateBase64 = Buffer.from(state).toString('base64')
    // Also extract plain text content for display in document list
    const ytext = room.ydoc.getText('content')
    const content = ytext.toString().slice(0, 500) // preview only
    await Document.findByIdAndUpdate(documentId, { yState: stateBase64, content })
  } catch (err) {
    console.error(`Failed to save document ${documentId}:`, err.message)
  }
}

function scheduleSave(documentId) {
  const room = rooms.get(documentId)
  if (!room) return
  if (room.saveTimeout) clearTimeout(room.saveTimeout)
  room.saveTimeout = setTimeout(() => saveRoomToDb(documentId), SAVE_INTERVAL)
}

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)
    let currentDocId = null
    let currentUser = null

    // ── JOIN a document room ──────────────────────────────────────────
    socket.on('join-document', async ({ documentId, user }) => {
      // Leave previous room if any
      if (currentDocId) {
        socket.leave(currentDocId)
        const prevRoom = rooms.get(currentDocId)
        if (prevRoom) {
          prevRoom.clients.delete(socket.id)
          broadcastPresence(io, currentDocId, prevRoom)
        }
      }

      currentDocId = documentId
      currentUser = user
      socket.join(documentId)

      const room = await getOrCreateRoom(documentId)
      room.clients.set(socket.id, {
        id: socket.id,
        name: user.name,
        color: user.color,
        cursor: null,
      })

      // Send current Yjs state to the newly joined client
      const currentState = Y.encodeStateAsUpdate(room.ydoc)
      socket.emit('sync-state', { update: Array.from(currentState) })

      // Broadcast updated presence list to everyone in the room
      broadcastPresence(io, documentId, room)

      console.log(`${user.name} joined document ${documentId}`)
    })

    // ── RECEIVE a Yjs update from a client, broadcast to others ──────
    socket.on('yjs-update', ({ documentId, update }) => {
      const room = rooms.get(documentId)
      if (!room) return

      // Apply the update to the server-side Yjs doc (source of truth)
      const updateBuffer = new Uint8Array(update)
      Y.applyUpdate(room.ydoc, updateBuffer)

      // Broadcast the same update to all OTHER clients in the room
      socket.to(documentId).emit('yjs-update', { update })

      // Schedule a debounced save to MongoDB
      scheduleSave(documentId)
    })

    // ── CURSOR position update ────────────────────────────────────────
    socket.on('cursor-update', ({ documentId, cursor }) => {
      const room = rooms.get(documentId)
      if (!room) return
      const client = room.clients.get(socket.id)
      if (client) client.cursor = cursor
      // Broadcast cursor to everyone else
      socket.to(documentId).emit('cursor-update', {
        userId: socket.id,
        name: currentUser?.name,
        color: currentUser?.color,
        cursor,
      })
    })

    // ── TITLE update ──────────────────────────────────────────────────
    socket.on('title-update', ({ documentId, title }) => {
      socket.to(documentId).emit('title-update', { title })
      // Persist title to MongoDB
      Document.findByIdAndUpdate(documentId, { title }).catch(console.error)
    })

    // ── DISCONNECT ────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
      if (!currentDocId) return
      const room = rooms.get(currentDocId)
      if (room) {
        room.clients.delete(socket.id)
        broadcastPresence(io, currentDocId, room)
        // If room is empty, save and clean up after a delay
        if (room.clients.size === 0) {
          setTimeout(async () => {
            const r = rooms.get(currentDocId)
            if (r && r.clients.size === 0) {
              await saveRoomToDb(currentDocId)
              rooms.delete(currentDocId)
              console.log(`Room ${currentDocId} cleaned up`)
            }
          }, 30000) // 30 sec grace period
        }
      }
    })
  })
}

function broadcastPresence(io, documentId, room) {
  const users = Array.from(room.clients.values()).map(({ id, name, color, cursor }) => ({
    id, name, color, cursor,
  }))
  io.to(documentId).emit('presence-update', { users })
}

module.exports = { setupSocketHandlers }
