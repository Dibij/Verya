import { useStore } from '../../store'
import { ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'

export const BottomBar = () => {
  const session = useStore((s) => s.session)
  const changedFiles = useStore((s) => s.changedFiles)
  const buildStatus = useStore((s) => s.buildStatus)
  const setIsDiffModalOpen = useStore((s) => s.setIsDiffModalOpen)
  const isTerminalOpen = useStore((s) => s.isTerminalOpen)
  const setIsTerminalOpen = useStore((s) => s.setIsTerminalOpen)

  const count = session?.modifiedFiles.length || changedFiles.length

  return (
    <footer className="h-7 border-t border-white/[0.06] bg-[#090b10] px-3 flex items-center justify-between text-[11px] text-white/50 select-none z-20">
      {/* Left: Session Safety Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Original project safe</span>
        </div>

        <span className="text-white/20">•</span>

        {count > 0 ? (
          <button
            onClick={() => setIsDiffModalOpen(true)}
            className="text-amber-300 hover:underline flex items-center gap-1"
          >
            <span>{count} file(s) modified in session</span>
          </button>
        ) : (
          <span>No uncommitted session changes</span>
        )}
      </div>

      {/* Right: Build & Preview Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          className="hover:text-white flex items-center gap-1.5 transition"
        >
          {buildStatus === 'ready' && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Preview Ready</span>
            </>
          )}
          {buildStatus === 'compiling' && (
            <>
              <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
              <span>Compiling...</span>
            </>
          )}
          {buildStatus === 'error' && (
            <>
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Build Error</span>
            </>
          )}
        </button>
      </div>
    </footer>
  )
}
