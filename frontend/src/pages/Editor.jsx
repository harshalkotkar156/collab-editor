import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCollaboration } from '../hooks/useCollaboration'

function UserAvatar({ user }) {
  return (
    <div
      className="relative flex items-center group"
      title={user.name}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-[#0f1117] shrink-0 avatar-pulse"
        style={{ backgroundColor: user.color }}
      >
        {user.name?.[0]?.toUpperCase() || '?'}
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1e2130] border border-white/10 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {user.name}
      </div>
    </div>
  )
}

function ConnectionBadge({ connected, synced }) {
  if (!connected) return (
    <div className="flex items-center gap-1.5 text-xs text-red-400">
      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Offline
    </div>
  )
  if (!synced) return (
    <div className="flex items-center gap-1.5 text-xs text-yellow-400">
      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
      Syncing…
    </div>
  )
  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      Live
    </div>
  )
}

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  const {
    content,
    users,
    connected,
    synced,
    title,
    user,
    textareaRef,
    handleChange,
    handleCursorMove,
    updateTitle,
  } = useCollaboration(id)

  // Sync word count
  useEffect(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0
    setWordCount(words)
  }, [content])

  // Sync title input when remote title changes
  useEffect(() => {
    if (!isEditingTitle) setTitleInput(title)
  }, [title, isEditingTitle])

  function handleTitleBlur() {
    setIsEditingTitle(false)
    const trimmed = titleInput.trim() || 'Untitled Document'
    updateTitle(trimmed)
  }

  function handleTitleKeyDown(e) {
    if (e.key === 'Enter') e.target.blur()
    if (e.key === 'Escape') {
      setTitleInput(title)
      setIsEditingTitle(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const allUsers = [{ id: 'me', name: user.name + ' (you)', color: user.color }, ...users]

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-[#0f1117]/90 backdrop-blur border-b border-white/5 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                autoFocus
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="bg-white/5 border border-emerald-400/40 text-white text-sm font-medium px-3 py-1.5 rounded-lg outline-none w-full max-w-md"
                maxLength={100}
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-white text-sm font-medium hover:text-emerald-300 transition-colors truncate max-w-md block text-left"
                title="Click to rename"
              >
                {title || 'Untitled Document'}
              </button>
            )}
          </div>

          {/* Right side: status + presence + share */}
          <div className="flex items-center gap-4 shrink-0">
            <ConnectionBadge connected={connected} synced={synced} />

            {/* Active users */}
            <div className="flex items-center -space-x-1.5">
              {allUsers.slice(0, 5).map(u => (
                <UserAvatar key={u.id} user={u} />
              ))}
              {allUsers.length > 5 && (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50 border-2 border-[#0f1117]">
                  +{allUsers.length - 5}
                </div>
              )}
            </div>

            {/* Share */}
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 hover:border-emerald-400/40 text-white/50 hover:text-emerald-400 transition-all"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Presence bar (other users' names) ───────────────────── */}
      {users.length > 0 && (
        <div className="bg-white/[0.02] border-b border-white/5 px-6 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-2 flex-wrap">
            <span className="text-white/30 text-xs">Also editing:</span>
            {users.map(u => (
              <span
                key={u.id}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: u.color + '20', color: u.color }}
              >
                {u.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Editor ──────────────────────────────────────────────── */}
      <main className="flex-1 flex justify-center px-6 py-10">
        <div className="w-full max-w-3xl">
          {!synced && connected ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white/30 text-sm">Loading document…</p>
              </div>
            </div>
          ) : (
            <div className="fade-in">
              {/* Paper card */}
              <div className="bg-[#14161f] border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-12 py-10">
                  <textarea
                    ref={textareaRef}
                    className="editor-textarea"
                    value={content}
                    onChange={handleChange}
                    onKeyUp={handleCursorMove}
                    onClick={handleCursorMove}
                    onSelect={handleCursorMove}
                    placeholder="Start typing… share the URL to collaborate with teammates."
                    spellCheck={true}
                    autoCorrect="on"
                  />
                </div>
              </div>

              {/* Footer stats */}
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-white/20 text-xs font-mono">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'} · {content.length} chars
                </p>
                <p className="text-white/20 text-xs font-mono">
                  ID: {id?.slice(0, 8)}…
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
