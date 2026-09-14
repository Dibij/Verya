import { useState } from 'react'
import { useStore } from '../../store'
import { api } from '../../lib/api'
import { Image as ImageIcon, Upload, Replace, Check } from 'lucide-react'

export const AssetBrowser = () => {
  const selectedElement = useStore((s) => s.selectedElement)
  const project = useStore((s) => s.project)
  const addTerminalLog = useStore((s) => s.addTerminalLog)

  const [replaced, setReplaced] = useState(false)
  const [customUrl, setCustomUrl] = useState('')

  const mockAssets = [
    { name: 'logo.svg', url: '/logo.svg', type: 'svg' },
    { name: 'hero-banner.png', url: '/hero.png', type: 'image' },
    { name: 'avatar-user.jpg', url: '/avatar.jpg', type: 'image' },
    { name: 'dashboard-preview.png', url: '/dashboard.png', type: 'image' },
  ]

  const handleApplyAsset = async (assetUrl: string) => {
    if (!selectedElement || !project) return

    const res = await api.transform({
      file: project.entryFile,
      selector: {
        tagName: selectedElement.tagName,
        className: selectedElement.className,
        componentName: selectedElement.componentName ?? undefined,
      },
      changes: [
        {
          property: 'backgroundImage',
          value: `url(${assetUrl})`,
        },
      ],
    })

    if (res.success) {
      setReplaced(true)
      addTerminalLog(`Updated asset reference on <${selectedElement.tagName}>`)
      setTimeout(() => setReplaced(false), 2000)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
      {/* External URL Input */}
      <div className="space-y-1.5">
        <label className="text-white/60 text-[11px] block">Image URL / Asset</label>
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="https://... or /image.png"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => customUrl && handleApplyAsset(customUrl)}
            disabled={!customUrl || !selectedElement}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 disabled:opacity-40 transition"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Asset Grid */}
      <div>
        <div className="flex items-center justify-between text-white/50 text-[11px] mb-2">
          <span>Project Assets</span>
          <span className="text-[10px] text-white/30">Click to apply</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {mockAssets.map((asset) => (
            <div
              key={asset.name}
              onClick={() => handleApplyAsset(asset.url)}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/40 cursor-pointer transition flex flex-col items-center justify-center gap-1.5 text-center group"
            >
              <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-white/40 group-hover:text-indigo-400 transition">
                <ImageIcon className="w-5 h-5" />
              </div>
              <span className="truncate w-full text-[11px] text-white/70 group-hover:text-white">
                {asset.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {replaced && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2 text-xs">
          <Check className="w-4 h-4" />
          <span>Asset applied to selected element!</span>
        </div>
      )}
    </div>
  )
}
