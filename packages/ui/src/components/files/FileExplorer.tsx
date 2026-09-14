import { useEffect } from 'react'
import { useStore } from '../../store'
import { api } from '../../lib/api'
import type { FileNode } from '../../types'
import { Folder, FileCode, Image, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const FileItem = ({ node, depth = 0 }: { node: FileNode; depth?: number }) => {
  const [isOpen, setIsOpen] = useState(depth < 2)
  const setActiveFile = useStore((s) => s.setActiveFile)
  const setActiveFileContent = useStore((s) => s.setActiveFileContent)
  const setActiveView = useStore((s) => s.setActiveView)

  const isDir = node.type === 'directory'

  const handleClick = async () => {
    if (isDir) {
      setIsOpen(!isOpen)
    } else {
      setActiveFile(node.path)
      const res = await api.getFile(node.path)
      if (res?.content) {
        setActiveFileContent(res.content)
      }
      setActiveView('split')
    }
  }

  const getIcon = () => {
    if (isDir) return <Folder className="w-3.5 h-3.5 text-indigo-400/80" />
    if (node.name.endsWith('.tsx') || node.name.endsWith('.jsx')) {
      return <FileCode className="w-3.5 h-3.5 text-cyan-400/80" />
    }
    if (node.name.endsWith('.css')) {
      return <FileText className="w-3.5 h-3.5 text-amber-400/80" />
    }
    if (/\.(png|jpg|jpeg|svg|webp)$/i.test(node.name)) {
      return <Image className="w-3.5 h-3.5 text-emerald-400/80" />
    }
    return <FileText className="w-3.5 h-3.5 text-white/40" />
  }

  return (
    <div>
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className="flex items-center gap-1.5 py-1 pr-2 rounded hover:bg-white/[0.04] cursor-pointer text-xs text-white/70 hover:text-white transition select-none"
      >
        {isDir && (
          <span className="text-white/30">
            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
        {!isDir && <span className="w-3" />}
        {getIcon()}
        <span className="truncate">{node.name}</span>
      </div>

      {isDir && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileItem key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export const FileExplorer = () => {
  const files = useStore((s) => s.files)
  const setFiles = useStore((s) => s.setFiles)

  useEffect(() => {
    api.getFiles().then((f) => setFiles(f))
  }, [setFiles])

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {files.length === 0 ? (
        <div className="p-4 text-center text-xs text-white/30">Loading project files...</div>
      ) : (
        files.map((node) => <FileItem key={node.path} node={node} />)
      )}
    </div>
  )
}
