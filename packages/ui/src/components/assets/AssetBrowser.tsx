import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { api } from '../../lib/api'
import { buildSelector, resolveTargetFile } from '../../lib/selector'
import type { FileNode } from '../../types'
import { Image as ImageIcon, Check } from 'lucide-react'

const IMAGE_EXT_RE = /\.(png|jpe?g|svg|webp|gif|avif|ico)$/i

function collectImageFiles(nodes: FileNode[], out: FileNode[] = []): FileNode[] {
  for (const node of nodes) {
    if (node.type === 'directory') {
      if (node.children) collectImageFiles(node.children, out)
    } else if (IMAGE_EXT_RE.test(node.name)) {
      out.push(node)
    }
  }
  return out
}

export const AssetBrowser = () => {
  const selectedElement = useStore((s) => s.selectedElement)
  const project = useStore((s) => s.project)
  const componentTree = useStore((s) => s.componentTree)
  const files = useStore((s) => s.files)
  const addTerminalLog = useStore((s) => s.addTerminalLog)
  const setBuildStatus = useStore((s) => s.setBuildStatus)

  const [replaced, setReplaced] = useState(false)
  const [customUrl, setCustomUrl] = useState('')

  const projectAssets = useMemo(() => collectImageFiles(files), [files])

  const handleApplyAsset = async (assetUrl: string) => {
    if (!selectedElement || !project) return

    const target = resolveTargetFile(selectedElement, project, componentTree)
    setBuildStatus('compiling')
    const res = await api.transform({
      file: target.file,
      selector: buildSelector(selectedElement),
      changes: [
        {
          property: 'backgroundImage',
          value: `url(${assetUrl})`,
        },
      ],
    })

    if (res.success) {
      setBuildStatus('ready')
      setReplaced(true)
      addTerminalLog(`Updated asset reference on <${selectedElement.tagName}>`)
      setTimeout(() => setReplaced(false), 2000)
    } else {
      setBuildStatus('error')
      addTerminalLog(`✖ Asset apply failed: ${res.error ?? 'unknown error'}`)
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
          <span className="text-[10px] text-white/30">
            {selectedElement ? 'Click to apply' : 'Select an element first'}
          </span>
        </div>

        {projectAssets.length === 0 ? (
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/40 text-center">
            No image assets found in this project.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {projectAssets.map((asset) => (
              <button
                key={asset.path}
                onClick={() => handleApplyAsset(`/${asset.path}`)}
                disabled={!selectedElement}
                title={asset.path}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/40 cursor-pointer transition flex flex-col items-center justify-center gap-1.5 text-center group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-white/40 group-hover:text-indigo-400 transition">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="truncate w-full text-[11px] text-white/70 group-hover:text-white">
                  {asset.name}
                </span>
              </button>
            ))}
          </div>
        )}
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
