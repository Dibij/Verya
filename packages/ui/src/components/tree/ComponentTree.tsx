import { useStore } from '../../store'
import { TreeNode } from './TreeNode'
import { Layers } from 'lucide-react'

export function ComponentTree() {
  const componentTree = useStore((s) => s.componentTree)
  const selectedElement = useStore((s) => s.selectedElement)

  if (componentTree.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          gap: '10px',
          textAlign: 'center',
        }}
      >
        <Layers size={20} color="#3D4357" />
        <p
          style={{
            fontSize: '11px',
            color: '#3D4357',
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          No component tree available.
          <br />
          Click an element in the
          <br />
          preview to analyze it.
        </p>
      </div>
    )
  }

  const selectedName = selectedElement?.componentName ?? null

  return (
    <div style={{ padding: '4px 0' }}>
      {componentTree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedName={selectedName}
        />
      ))}
    </div>
  )
}
