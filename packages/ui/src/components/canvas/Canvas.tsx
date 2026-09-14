import { useStore } from '../../store'
import { IframePreview } from './IframePreview'

export const Canvas = () => {
  const viewport = useStore((s) => s.viewport)

  const getViewportStyles = () => {
    switch (viewport) {
      case 'mobile':
        return 'w-[390px] h-[844px] max-h-[92%] rounded-[40px] border-[10px] border-[#1e2330] shadow-[0_25px_60px_rgba(0,0,0,0.8)]'
      case 'tablet':
        return 'w-[768px] h-[1024px] max-h-[92%] rounded-[24px] border-[8px] border-[#1e2330] shadow-[0_25px_60px_rgba(0,0,0,0.8)]'
      case 'desktop':
      default:
        return 'w-full h-full'
    }
  }

  return (
    <div className="flex-1 h-full relative overflow-hidden bg-[#090b10] flex items-center justify-center p-4">
      {/* Background canvas grid dots */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className={`relative transition-all duration-300 overflow-hidden ${getViewportStyles()}`}>
        <IframePreview />
      </div>
    </div>
  )
}
