import { useStore } from '../../store'
import { EmptyState } from './EmptyState'
import { LayoutSection } from './sections/LayoutSection'
import { AppearanceSection } from './sections/AppearanceSection'
import { TypographySection } from './sections/TypographySection'

const TEXT_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'label', 'li', 'dt', 'dd', 'blockquote', 'em', 'strong', 'small', 'pre', 'code'])

function isTextElement(tagName: string): boolean {
  return TEXT_TAGS.has(tagName.toLowerCase())
}

export function PropertiesPanel() {
  const selectedElement = useStore((s) => s.selectedElement)

  if (!selectedElement) {
    return <EmptyState />
  }

  const displayName =
    selectedElement.componentName
      ? selectedElement.componentName
      : `<${selectedElement.tagName}>`

  const classNames = selectedElement.className
    ? selectedElement.className.split(' ').filter(Boolean).slice(0, 3)
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Element header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              background: selectedElement.componentName ? '#6366F1' : '#10B981',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#E8EAF0',
              fontFamily: 'monospace',
            }}
          >
            {displayName}
          </span>
        </div>
        {classNames.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {classNames.map((cls) => (
              <span
                key={cls}
                style={{
                  fontSize: '10px',
                  color: '#6B7585',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '4px',
                  padding: '1px 6px',
                  fontFamily: 'monospace',
                }}
              >
                .{cls}
              </span>
            ))}
          </div>
        )}
        {selectedElement.id && (
          <span
            style={{
              fontSize: '10px',
              color: '#6B7585',
              fontFamily: 'monospace',
            }}
          >
            #{selectedElement.id}
          </span>
        )}
      </div>

      {/* Scrollable sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <LayoutSection />
        <AppearanceSection />
        {isTextElement(selectedElement.tagName) && <TypographySection />}
      </div>
    </div>
  )
}
