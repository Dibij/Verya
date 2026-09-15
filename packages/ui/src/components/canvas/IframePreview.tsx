import { useRef, useEffect } from 'react'
import { useStore } from '../../store'

export const IframePreview = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const project = useStore((s) => s.project)
  const theme = useStore((s) => s.theme)
  const interactMode = useStore((s) => s.interactMode)

  // Sync theme changes to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'VERYA_THEME', theme }, '*')
    }
  }, [theme])

  // Sync interactMode changes to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'VERYA_MODE', mode: interactMode ? 'interact' : 'edit' },
        '*'
      )
    }
  }, [interactMode])

  const handleIframeLoad = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'VERYA_THEME', theme }, '*')
      iframeRef.current.contentWindow.postMessage(
        { type: 'VERYA_MODE', mode: interactMode ? 'interact' : 'edit' },
        '*'
      )
    }
  }

  const previewSrc = project?.previewUrl || 'http://localhost:3112'

  return (
    <div
      className="w-full h-full relative overflow-hidden flex items-center justify-center transition-colors duration-200"
      style={{ background: theme === 'light' ? '#ffffff' : '#0b0d13' }}
    >
      <iframe
        ref={iframeRef}
        src={previewSrc}
        onLoad={handleIframeLoad}
        className="w-full h-full border-none shadow-2xl transition-all duration-200"
        style={{ background: theme === 'light' ? '#ffffff' : '#0b0d13' }}
        title="Verya Live Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  )
}
