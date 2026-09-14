import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { api } from '../../lib/api'
import type { SessionDiffResponse } from '../../types'
import {
  X,
  GitCommit,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'

export const DiffReviewModal = () => {
  const isDiffModalOpen = useStore((s) => s.isDiffModalOpen)
  const setIsDiffModalOpen = useStore((s) => s.setIsDiffModalOpen)
  const project = useStore((s) => s.project)
  const setSession = useStore((s) => s.setSession)
  const clearChangedFiles = useStore((s) => s.clearChangedFiles)
  const addTerminalLog = useStore((s) => s.addTerminalLog)

  const [loading, setLoading] = useState(false)
  const [diffData, setDiffData] = useState<SessionDiffResponse | null>(null)
  const [selectedFileIndex, setSelectedFileIndex] = useState(0)
  const [applying, setApplying] = useState(false)
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isDiffModalOpen && project?.sessionId) {
      setLoading(true)
      api.getSessionDiff(project.sessionId).then((data) => {
        setDiffData(data)
        setLoading(false)
      })
    }
  }, [isDiffModalOpen, project?.sessionId])

  if (!isDiffModalOpen) return null

  const handleAccept = async () => {
    if (!project?.sessionId) return
    setApplying(true)

    try {
      const res = await api.acceptChanges(project.sessionId)
      if (res?.success) {
        setAppliedSuccess(`Applied ${res.accepted.length} file(s) to original project. Backup created at: ${res.backupPath}`)
        addTerminalLog(`✔ Successfully applied session changes to ${project.originalRoot}`)
        clearChangedFiles()
        // Refresh session
        api.saveSession().then((s) => {
          if (s.session) setSession(s.session)
        })
        setTimeout(() => {
          setIsDiffModalOpen(false)
          setAppliedSuccess(null)
        }, 2200)
      }
    } finally {
      setApplying(false)
    }
  }

  const selectedFile = diffData?.files[selectedFileIndex]

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-5xl h-[85vh] bg-[#0c0e14] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
              <GitCommit className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Review & Accept Changes</h2>
              <p className="text-white/40 text-[11px]">
                Compare session workspace modifications before applying to your original project.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDiffModalOpen(false)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/40">
            Computing diff with original source...
          </div>
        ) : !diffData || diffData.files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-white/50 p-6 text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400/80 mb-2" />
            <span className="text-sm text-white/80 font-medium">No modifications detected</span>
            <p className="text-[11px] text-white/40 max-w-sm">
              Your session workspace matches the original project files. Make visual changes in the canvas to see them reflected here.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* File List */}
            <div className="w-72 border-r border-white/10 bg-white/[0.01] flex flex-col">
              <div className="p-3 border-b border-white/5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                Modified Files ({diffData.files.length})
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {diffData.files.map((file, idx) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full p-2.5 rounded-xl text-left flex items-start gap-2 transition ${
                      selectedFileIndex === idx
                        ? 'bg-indigo-600/20 text-white border border-indigo-500/40'
                        : 'text-white/60 hover:bg-white/[0.03] hover:text-white'
                    }`}
                  >
                    <FileCode className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium text-[11px]">{file.path}</div>
                      {file.hasConflict && (
                        <div className="flex items-center gap-1 text-[10px] text-rose-400 mt-1 font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>External Conflict</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Diff Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#07080c]">
              {selectedFile && (
                <>
                  <div className="h-10 px-4 flex items-center justify-between border-b border-white/5 bg-white/[0.01] font-mono text-[11px] text-white/60">
                    <span className="truncate">{selectedFile.path}</span>
                    {selectedFile.hasConflict ? (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Conflict: Modified outside Verya
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Clean diff
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-5">
                    {selectedFile.diff.split('\n').map((line, i) => {
                      const isAdded = line.startsWith('+') && !line.startsWith('+++')
                      const isRemoved = line.startsWith('-') && !line.startsWith('---')
                      const isHeader = line.startsWith('---') || line.startsWith('+++')

                      let bg = 'transparent'
                      let color = '#d1d5db'
                      if (isAdded) {
                        bg = 'rgba(16, 185, 129, 0.12)'
                        color = '#34d399'
                      } else if (isRemoved) {
                        bg = 'rgba(244, 63, 94, 0.12)'
                        color = '#fb7185'
                      } else if (isHeader) {
                        color = '#9ca3af'
                      }

                      return (
                        <div
                          key={i}
                          style={{ backgroundColor: bg, color }}
                          className="px-2 rounded-xs whitespace-pre"
                        >
                          {line}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="h-16 px-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Changes will be safely committed with an automatic checkpoint backup.</span>
          </div>

          <div className="flex items-center gap-3">
            {appliedSuccess && (
              <span className="text-emerald-400 text-xs font-medium">{appliedSuccess}</span>
            )}

            <button
              onClick={() => setIsDiffModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-white/70 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleAccept}
              disabled={applying || !diffData || diffData.files.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 disabled:opacity-40 transition"
            >
              <span>{applying ? 'Applying...' : 'Confirm & Apply to Project'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
