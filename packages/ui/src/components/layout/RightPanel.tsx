import { PropertiesPanel } from '../properties/PropertiesPanel'

export const RightPanel = () => {
  return (
    <aside
      className="w-[300px] h-full backdrop-blur-xl flex flex-col z-20 select-none"
      style={{
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-subtle)',
      }}
    >
      <PropertiesPanel />
    </aside>
  )
}
