import { useStore } from '../../store'
import { Terminal, X, Trash2 } from 'lucide-react'

export const TerminalPanel = () => {
  const isTerminalOpen = useStore((s) => s.isTerminalOpen)
  const setIsTerminalOpen = useStore((s) => s.setIsTerminalOpen)
  const terminalLogs = useStore((s) => s.terminalLogs)

  if (!isTerminalOpen) return null

  return (
    <div className="h-44 border-t border-white/[0.08] bg-[#07080c] flex flex-col font-mono text-xs z-30 select-none">
      {/* Terminal Header */}
      <div className="h-7 px-3 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-white/60">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px]">Output & Diagnostics</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTerminalOpen(false)}
            className="text-white/40 hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Log Output */}
      <div className="flex-1 p-2.5 overflow-y-auto space-y-1 select-text font-mono text-[11px] leading-relaxed">
        {terminalLogs.map((log, i) => (
          <div key={i} className="text-white/70 flex items-start gap-2">
            <span className="text-indigo-400/60 select-none">›</span>
            <span>{log}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
