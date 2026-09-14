import { useState } from 'react'
import { useStore } from '../../store'
import { api } from '../../lib/api'
import {
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Columns,
  Code2,
  FolderSync,
  Save,
  GitCommit,
  Terminal,
  Check,
} from 'lucide-react'

export const TopBar = () => {
  const project = useStore((s) => s.project)
  const session = useStore((s) => s.session)
  const setSession = useStore((s) => s.setSession)
  const viewport = useStore((s) => s.viewport)
  const setViewport = useStore((s) => s.setViewport)
  const activeView = useStore((s) => s.activeView)
  const setActiveView = useStore((s) => s.setActiveView)
  const setIsDiffModalOpen = useStore((s) => s.setIsDiffModalOpen)
  const setIsSessionsModalOpen = useStore((s) => s.setIsSessionsModalOpen)
  const isTerminalOpen = useStore((s) => s.isTerminalOpen)
  const setIsTerminalOpen = useStore((s) => s.setIsTerminalOpen)
  const changedFiles = useStore((s) => s.changedFiles)
  const addTerminalLog = useStore((s) => s.addTerminalLog)

  const [savingSession, setSavingSession] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const handleSaveSession = async () => {
    setSavingSession(true)
    try {
      const res = await api.saveSession()
      if (res.success && res.session) {
        setSession(res.session)
        setJustSaved(true)
        addTerminalLog('Session saved safely to Verya storage.')
        setTimeout(() => setJustSaved(false), 2000)
      }
    } finally {
      setSavingSession(false)
    }
  }

  const modifiedCount = session?.modifiedFiles.length || changedFiles.length

  return (
    <header className="h-12 border-b border-white/[0.07] bg-[#0b0d12]/90 backdrop-blur-xl px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Logo & Project Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <div className="w-2 h-2 rotate-45 bg-white rounded-xs" />
          </div>
          <span className="font-semibold tracking-tight text-white text-sm">Verya</span>
        </div>

        <div className="h-4 w-px bg-white/10" />

        {/* Project & Session badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/80 font-medium">{project?.name || 'Project'}</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>Isolated Session</span>
          </div>
        </div>
      </div>

      {/* Center: Viewport & View Mode controls */}
      <div className="flex items-center gap-2">
        {/* Viewport switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <button
            onClick={() => setViewport('desktop')}
            title="Desktop view"
            className={`p-1.5 rounded-md transition ${viewport === 'desktop' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            title="Tablet view (768px)"
            className={`p-1.5 rounded-md transition ${viewport === 'tablet' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            title="Mobile view (390px)"
            className={`p-1.5 rounded-md transition ${viewport === 'mobile' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Mode switcher (Visual | Split | Code) */}
        <div className="flex items-center p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <button
            onClick={() => setActiveView('visual')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${activeView === 'visual' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-white/50 hover:text-white'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visual</span>
          </button>
          <button
            onClick={() => setActiveView('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${activeView === 'split' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-white/50 hover:text-white'}`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>
          <button
            onClick={() => setActiveView('code')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${activeView === 'code' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-white/50 hover:text-white'}`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>
        </div>
      </div>

      {/* Right: Sessions, Save Session, Accept Changes, Terminal */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setIsSessionsModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/[0.05] transition border border-transparent hover:border-white/10"
        >
          <FolderSync className="w-3.5 h-3.5" />
          <span>Sessions</span>
        </button>

        {/* Save Session */}
        <button
          onClick={handleSaveSession}
          disabled={savingSession}
          title="Preserve session in Verya storage without writing to original files"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border border-white/[0.08] transition"
        >
          {justSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
          <span>{justSaved ? 'Saved' : 'Save Session'}</span>
        </button>

        {/* Accept Changes (Commit to Original Project) */}
        <button
          onClick={() => setIsDiffModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 shadow-lg shadow-emerald-950/20 transition"
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>Accept Changes</span>
          {modifiedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-[10px] text-emerald-200">
              {modifiedCount}
            </span>
          )}
        </button>

        <div className="h-4 w-px bg-white/10" />

        {/* Terminal output toggle */}
        <button
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          title="Toggle Build / Output Log"
          className={`p-1.5 rounded-lg border transition ${isTerminalOpen ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' : 'text-white/50 hover:text-white border-white/[0.06] bg-white/[0.02]'}`}
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  )
}
