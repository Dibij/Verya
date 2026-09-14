import { useState } from 'react'
import { useStore } from '../../store'
import { api } from '../../lib/api'
import { Sparkles, Check, Wand2 } from 'lucide-react'

export const DesignSystemPanel = () => {
  const selectedElement = useStore((s) => s.selectedElement)
  const project = useStore((s) => s.project)
  const glassPreset = useStore((s) => s.glassPreset)
  const setGlassPreset = useStore((s) => s.setGlassPreset)
  const addTerminalLog = useStore((s) => s.addTerminalLog)

  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const handleApplyGlass = async () => {
    if (!selectedElement || !project) return
    setApplying(true)

    try {
      // Build changes for Glassmorphism
      const changes = [
        {
          property: 'backgroundColor',
          value: `rgba(255, 255, 255, ${glassPreset.surfaceOpacity / 100})`,
        },
        {
          property: 'backdropFilter',
          value: `blur(${glassPreset.blur}px)`,
        },
        {
          property: 'borderRadius',
          value: `${glassPreset.borderRadius}px`,
        },
        {
          property: 'borderColor',
          value: `rgba(255, 255, 255, ${glassPreset.borderOpacity / 100})`,
        },
        {
          property: 'borderWidth',
          value: '1px',
        },
        {
          property: 'boxShadow',
          value:
            glassPreset.shadow === 'glow'
              ? `0 10px 30px -5px ${glassPreset.accentColor}40`
              : '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        },
      ]

      const res = await api.transform({
        file: project.entryFile,
        selector: {
          tagName: selectedElement.tagName,
          className: selectedElement.className,
          componentName: selectedElement.componentName ?? undefined,
        },
        changes,
      })

      if (res.success) {
        setApplied(true)
        addTerminalLog(`Applied Glassmorphism preset to <${selectedElement.tagName}>`)
        setTimeout(() => setApplied(false), 2000)
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
      {/* Header card */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20">
        <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Glassmorphism System</span>
        </div>
        <p className="text-white/50 text-[11px] leading-relaxed">
          Intelligently transforms surfaces into modern frosted glass with controlled blur, subtle borders, and soft depth.
        </p>
      </div>

      {/* Preset Controls */}
      <div className="space-y-3 bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
        {/* Surface Opacity */}
        <div>
          <div className="flex justify-between text-white/60 mb-1">
            <span>Surface Opacity</span>
            <span className="font-mono text-indigo-300">{glassPreset.surfaceOpacity}%</span>
          </div>
          <input
            type="range"
            min="2"
            max="40"
            value={glassPreset.surfaceOpacity}
            onChange={(e) => setGlassPreset({ surfaceOpacity: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-1 bg-white/10 rounded-lg cursor-pointer"
          />
        </div>

        {/* Blur */}
        <div>
          <div className="flex justify-between text-white/60 mb-1">
            <span>Backdrop Blur</span>
            <span className="font-mono text-indigo-300">{glassPreset.blur}px</span>
          </div>
          <input
            type="range"
            min="4"
            max="40"
            value={glassPreset.blur}
            onChange={(e) => setGlassPreset({ blur: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-1 bg-white/10 rounded-lg cursor-pointer"
          />
        </div>

        {/* Border Opacity */}
        <div>
          <div className="flex justify-between text-white/60 mb-1">
            <span>Border Opacity</span>
            <span className="font-mono text-indigo-300">{glassPreset.borderOpacity}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            value={glassPreset.borderOpacity}
            onChange={(e) => setGlassPreset({ borderOpacity: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-1 bg-white/10 rounded-lg cursor-pointer"
          />
        </div>

        {/* Corner Radius */}
        <div>
          <div className="flex justify-between text-white/60 mb-1">
            <span>Corner Radius</span>
            <span className="font-mono text-indigo-300">{glassPreset.borderRadius}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="48"
            value={glassPreset.borderRadius}
            onChange={(e) => setGlassPreset({ borderRadius: Number(e.target.value) })}
            className="w-full accent-indigo-500 h-1 bg-white/10 rounded-lg cursor-pointer"
          />
        </div>

        {/* Accent Color */}
        <div>
          <div className="flex justify-between text-white/60 mb-1.5">
            <span>Accent Glow</span>
            <span className="font-mono text-indigo-300">{glassPreset.accentColor}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={glassPreset.accentColor}
              onChange={(e) => setGlassPreset({ accentColor: e.target.value })}
              className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
            />
            <div className="flex gap-1.5">
              {['#6366f1', '#ff7a18', '#10b981', '#06b6d4', '#f43f5e'].map((col) => (
                <button
                  key={col}
                  onClick={() => setGlassPreset({ accentColor: col })}
                  style={{ backgroundColor: col }}
                  className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApplyGlass}
        disabled={!selectedElement || applying}
        className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition shadow-lg ${
          selectedElement
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
            : 'bg-white/5 text-white/30 cursor-not-allowed'
        }`}
      >
        {applied ? (
          <>
            <Check className="w-4 h-4 text-emerald-300" />
            <span>Applied to Element</span>
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            <span>{selectedElement ? `Apply to <${selectedElement.tagName}>` : 'Select element to apply'}</span>
          </>
        )}
      </button>

      {/* Other System Presets */}
      <div className="pt-2">
        <span className="text-[10px] uppercase font-semibold tracking-wider text-white/30 block mb-2">
          Other Presets (Coming soon)
        </span>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-white/50">
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 opacity-60">Dark Premium</div>
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 opacity-60">Neo Brutalism</div>
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 opacity-60">Minimal SaaS</div>
          <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 opacity-60">Soft Cyberpunk</div>
        </div>
      </div>
    </div>
  )
}
