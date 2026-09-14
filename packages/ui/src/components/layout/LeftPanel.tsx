import { useStore } from '../../store'
import { ComponentTree } from '../tree/ComponentTree'
import { FileExplorer } from '../files/FileExplorer'
import { DesignSystemPanel } from '../design/DesignSystemPanel'
import { AssetBrowser } from '../assets/AssetBrowser'
import { Layers, FolderTree, Sparkles, Image as ImageIcon } from 'lucide-react'

export const LeftPanel = () => {
  const leftTab = useStore((s) => s.leftTab)
  const setLeftTab = useStore((s) => s.setLeftTab)

  return (
    <aside className="w-[280px] h-full border-r border-white/[0.06] bg-[#0b0d13]/80 backdrop-blur-xl flex flex-col z-20 select-none">
      {/* Tab Navigation */}
      <div className="h-10 border-b border-white/[0.06] px-2 flex items-center gap-1 bg-white/[0.01]">
        <button
          onClick={() => setLeftTab('components')}
          title="Component Hierarchy"
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 text-xs transition ${
            leftTab === 'components'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-white/40 hover:text-white/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="text-[11px]">Tree</span>
        </button>

        <button
          onClick={() => setLeftTab('files')}
          title="Project Files"
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 text-xs transition ${
            leftTab === 'files'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-white/40 hover:text-white/80'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span className="text-[11px]">Files</span>
        </button>

        <button
          onClick={() => setLeftTab('design')}
          title="Design System & Glassmorphism"
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 text-xs transition ${
            leftTab === 'design'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-white/40 hover:text-white/80'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[11px]">Design</span>
        </button>

        <button
          onClick={() => setLeftTab('assets')}
          title="Asset Browser"
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 text-xs transition ${
            leftTab === 'assets'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-white/40 hover:text-white/80'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span className="text-[11px]">Assets</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {leftTab === 'components' && <ComponentTree />}
        {leftTab === 'files' && <FileExplorer />}
        {leftTab === 'design' && <DesignSystemPanel />}
        {leftTab === 'assets' && <AssetBrowser />}
      </div>
    </aside>
  )
}
