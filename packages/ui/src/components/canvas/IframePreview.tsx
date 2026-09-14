import { useRef, useEffect } from 'react'
import { useStore } from '../../store'

export const IframePreview = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const project = useStore((s) => s.project)

  useEffect(() => {
    // Optional communication with iframe
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'VERYA_READY') {
        // Bridge initialized
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const previewSrc = project?.previewUrl || 'http://localhost:3112'

  return (
    <div className="w-full h-full relative bg-[#06070a] overflow-hidden flex items-center justify-center">
      <iframe
        ref={iframeRef}
        src={previewSrc}
        className="w-full h-full border-none shadow-2xl transition-all duration-200"
        title="Verya Live Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  )
}
