import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { api } from '../../lib/api'
import type { SessionMetadata } from '../../types'
import { X, FolderSync, Trash2, Calendar, FileText, CheckCircle2 } from 'lucide-react'

export const SessionsModal = () => {
  const isSessionsModalOpen = useStore((s) => s.isSessionsModalOpen)
  const setIsSessionsModalOpen = useStore((s) => s.setIsSessionsModalOpen)
  const project = useStore((s) => s.project)
  const [sessions, setSessions] = useState<SessionMetadata[]>([])
  const [loading, setLoading] = useState(false)

  const loadSessions = async () => {
    setLoading(true)
    const list = await api.getSessions(false)
    setSessions(list)
    setLoading(false)
  }

  useEffect(() => {
    if (isSessionsModalOpen) {
      loadSessions()
    }
  }, [isSessionsModalOpen])

  if (!isSessionsModalOpen) return null

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (id === project?.sessionId) {
      alert('Cannot delete the currently active session.')
      return
    }
    const confirmed = confirm('Are you sure you want to delete this session? Your original project files will not be affected.')
    if (confirmed) {
      await api.deleteSession(id)
      loadSessions()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-2xl bg-[#0c0e14] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="h-14 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
              <FolderSync className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Verya Editing Sessions</h2>
              <p className="text-white/40 text-[11px]">
                Isolated workspaces preserve your experiments without affecting your original project.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSessionsModalOpen(false)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center p-8 text-white/30">Loading session history...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center p-8 text-white/40">No saved sessions found.</div>
          ) : (
            sessions.map((s) => {
              const isCurrent = s.id === project?.sessionId
              return (
                <div
                  key={s.id}
                  className={`p-4 rounded-xl border transition flex items-center justify-between ${
                    isCurrent
                      ? 'bg-indigo-600/10 border-indigo-500/40'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{s.name}</span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-300 font-medium">
                          Active Session
                        </span>
                      )}
                      {s.saved && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Saved</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-white/40">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(s.updatedAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {s.modifiedFiles.length} file(s) modified
                      </span>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={(e) => handleDelete(s.id, e)}
                      title="Delete session"
                      className="p-2 rounded-lg text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="h-12 px-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-end">
          <button
            onClick={() => setIsSessionsModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
