import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { api } from '../../lib/api'
import { FileCode, Save, Check, AlertTriangle } from 'lucide-react'

export const CodeEditor = () => {
  const activeFile = useStore((s) => s.activeFile)
  const activeFileContent = useStore((s) => s.activeFileContent)
  const setActiveFileContent = useStore((s) => s.setActiveFileContent)
  const project = useStore((s) => s.project)
  const addTerminalLog = useStore((s) => s.addTerminalLog)

  const [code, setCode] = useState(activeFileContent)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCode(activeFileContent)
  }, [activeFileContent])

  const handleSave = async () => {
    if (!activeFile) return
    setIsSaving(true)
    setError(null)

    const ok = await api.saveFile(activeFile, code)
    if (ok) {
      setSaved(true)
      addTerminalLog(`Saved ${activeFile}`)
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError('Save failed — see the output log for details.')
      addTerminalLog(`✖ Failed to save ${activeFile}`)
    }
    setIsSaving(false)
  }

  const isDirty = code !== activeFileContent
  const lines = code.split('\n')

  return (
    <div className="flex-1 h-full flex flex-col verya-themed bg-[var(--code-bg)] border-r border-white/5 font-mono text-sm">
      {/* Editor Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-white/70 min-w-0">
          <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs truncate max-w-[280px]">
            {activeFile ? activeFile.replace(/\\/g, '/') : project?.entryFile || 'Source Code'}
          </span>
          {isDirty && (
            <span className="text-[10px] text-amber-400 shrink-0">● unsaved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {error && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
          <button
            onClick={handleSave}
            disabled={isSaving || !activeFile || !isDirty}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-40 text-indigo-300 text-xs border border-indigo-500/30 transition"
          >
            {saved ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isSaving ? 'Saving…' : saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor Body with Line Numbers */}
      <div className="flex-1 flex overflow-auto text-xs leading-5">
        {/* Line numbers */}
        <div className="py-3 px-3 select-none text-right text-white/20 bg-black/20 border-r border-white/5">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setActiveFileContent(e.target.value)
          }}
          spellCheck={false}
          className="flex-1 p-3 bg-transparent text-gray-200 resize-none outline-none font-mono selection:bg-indigo-500/30 whitespace-pre"
        />
      </div>
    </div>
  )
}
