import { PropertiesPanel } from '../properties/PropertiesPanel'

export const RightPanel = () => {
  return (
    <aside className="w-[300px] h-full border-l border-white/[0.06] bg-[#0b0d13]/80 backdrop-blur-xl flex flex-col z-20 select-none">
      <PropertiesPanel />
    </aside>
  )
}
