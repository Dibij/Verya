import { TopBar } from './TopBar'
import { LeftPanel } from './LeftPanel'
import { RightPanel } from './RightPanel'
import { BottomBar } from './BottomBar'
import { Canvas } from '../canvas/Canvas'
import { CodeEditor } from '../editor/CodeEditor'
import { TerminalPanel } from '../terminal/TerminalPanel'
import { DiffReviewModal } from '../modals/DiffReviewModal'
import { SessionsModal } from '../modals/SessionsModal'
import { useStore } from '../../store'

export const AppShell = () => {
  const activeView = useStore((s) => s.activeView)

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden select-none"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <TopBar />

      <div className="flex-1 flex overflow-hidden relative">
        <LeftPanel />

        {/* Dynamic Center Work Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {activeView === 'visual' && <Canvas />}
          {activeView === 'code' && <CodeEditor />}
          {activeView === 'split' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 h-full border-r border-white/5">
                <CodeEditor />
              </div>
              <div className="w-1/2 h-full">
                <Canvas />
              </div>
            </div>
          )}
        </div>

        <RightPanel />
      </div>

      <TerminalPanel />
      <BottomBar />

      {/* Overlays / Modals */}
      <DiffReviewModal />
      <SessionsModal />
    </div>
  )
}
