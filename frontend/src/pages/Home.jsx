import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL;
const BASE_URL = import.meta.env.VITE_SOCKET_URL;

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function Home() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    axios.get(`${BASE_URL}/api/documents`)
      .then(res => setDocs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function createDocument() {
    setCreating(true)
    try {
      const res = await axios.post(`${BASE_URL}/api/documents`)

      navigate(`${CLIENT_URL}/doc/${res.data._id}`)
    } catch (err) {
      console.error(err)
      setCreating(false)
    }
  }

  async function deleteDocument(e, id) {
    e.stopPropagation()
    await axios.delete(`${BASE_URL}/api/documents/${id}`)
    setDocs(prev => prev.filter(d => d._id !== id))
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-white font-semibold tracking-tight">CollabDocs</span>
        </div>
        <button
          onClick={createDocument}
          disabled={creating}
          className="flex items-center gap-2 bg-emerald-400 text-[#0f1117] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-300 transition-colors disabled:opacity-60"
        >
          {creating ? (
            <span className="w-4 h-4 border-2 border-[#0f1117]/30 border-t-[#0f1117] rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          )}
          New Document
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-semibold text-white mb-2">Your Documents</h1>
        <p className="text-white/40 text-sm mb-8">Click any document to open it. Share the URL with teammates to collaborate live.</p>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-24 fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">No documents yet.</p>
            <button onClick={createDocument} className="mt-4 text-emerald-400 text-sm hover:underline">
              Create your first document →
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {docs.map((doc) => (
              <div
                key={doc._id}
                onClick={() => navigate(`/doc/${doc._id}`)}
                className="group flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl px-5 py-4 cursor-pointer transition-all fade-in"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-white/5 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{doc.title || 'Untitled Document'}</p>
                    <p className="text-white/30 text-xs mt-0.5">{timeAgo(doc.updatedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-white/20 text-xs font-mono hidden sm:block">{doc._id.slice(0, 8)}…</span>
                  <button
                    onClick={(e) => deleteDocument(e, doc._id)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
