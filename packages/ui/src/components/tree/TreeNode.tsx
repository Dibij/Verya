import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { ComponentNode } from '../../types'
import { useStore } from '../../store'
import clsx from 'clsx'

interface TreeNodeProps {
  node: ComponentNode
  depth: number
  selectedName: string | null
}

export function TreeNode({ node, depth, selectedName }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = node.name === selectedName

  const isReactComponent = /^[A-Z]/.test(node.name)

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: `${8 + depth * 14}px`,
          paddingRight: '8px',
          height: '28px',
          cursor: 'pointer',
          borderRadius: '5px',
          margin: '1px 4px',
          background: isSelected
            ? 'rgba(99, 102, 241, 0.15)'
            : 'transparent',
          border: isSelected
            ? '1px solid rgba(99, 102, 241, 0.25)'
            : '1px solid transparent',
          transition: 'background 0.1s, border 0.1s',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            ;(e.currentTarget as HTMLDivElement).style.background =
              'var(--bg-surface)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
          }
        }}
        onClick={() => {
          if (hasChildren) setExpanded((v) => !v)
        }}
      >
        {/* Expand toggle */}
        <span
          style={{
            width: '14px',
            height: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-faint)',
            marginRight: '4px',
            flexShrink: 0,
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={10} />
            ) : (
              <ChevronRight size={10} />
            )
          ) : null}
        </span>

        {/* Component color dot */}
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '2px',
            background: isReactComponent ? '#6366F1' : '#10B981',
            flexShrink: 0,
            marginRight: '7px',
          }}
        />

        {/* Name */}
        <span
          style={{
            fontSize: '12px',
            color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
            fontFamily: isReactComponent ? 'inherit' : 'monospace',
            fontWeight: isSelected ? 500 : 400,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isReactComponent ? node.name : `<${node.tagName ?? node.name}>`}
        </span>

        {/* Class badge */}
        {node.className && (
          <span
            style={{
              fontSize: '9px',
              color: 'var(--text-faint)',
              fontFamily: 'monospace',
              flexShrink: 0,
              marginLeft: '4px',
              maxWidth: '60px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            .{node.className.split(' ')[0]}
          </span>
        )}

        {/* Line number */}
        <span
          style={{
            fontSize: '9px',
            color: 'var(--text-faint)',
            flexShrink: 0,
            marginLeft: '6px',
          }}
        >
          :{node.line}
        </span>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedName={selectedName}
            />
          ))}
        </div>
      )}
    </div>
  )
}
