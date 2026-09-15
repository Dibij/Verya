import { useStore } from '../../../store'
import { api } from '../../../lib/api'
import type { ElementInfo, TransformRequest } from '../../../types'
import { Section } from '../../ui/Section'
import { ColorPicker } from '../../ui/ColorPicker'
import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react'

function buildSelector(el: ElementInfo) {
  return {
    tagName: el.tagName,
    className: el.className ? el.className.split(' ')[0] : undefined,
    componentName: el.componentName ?? undefined,
    index: el.index,
  }
}

function useTransform() {
  const project = useStore((s) => s.project)
  const componentTree = useStore((s) => s.componentTree)
  const selectedElement = useStore((s) => s.selectedElement)
  const updateSelectedElementStyle = useStore((s) => s.updateSelectedElementStyle)

  return async (property: string, value: string, unit?: string) => {
    if (!selectedElement || !project) return

    let finalValue = value
    if (unit && !finalValue.endsWith(unit) && /^-?\d+(\.\d+)?$/.test(finalValue.trim())) {
      finalValue = `${finalValue.trim()}${unit}`
    }

    // Optimistically update store state so UI inputs reflect change immediately
    updateSelectedElementStyle(property, finalValue)

    let file = project.entryFile
    if (selectedElement.componentName) {
      const node = componentTree.find((n) => n.name === selectedElement.componentName)
      if (node) file = node.file
    }
    const req: TransformRequest = {
      file,
      selector: buildSelector(selectedElement),
      changes: [{ property, value: finalValue, unit }],
    }
    const result = await api.transform(req)
    if (!result.success) console.warn('[transform] failed:', result.error)
  }
}

function parsePx(val: string): string {
  if (!val) return ''
  return val.replace('px', '')
}

const FONT_WEIGHT_OPTIONS = [
  { value: '100', label: '100 Thin' },
  { value: '200', label: '200 ExtraLight' },
  { value: '300', label: '300 Light' },
  { value: '400', label: '400 Regular' },
  { value: '500', label: '500 Medium' },
  { value: '600', label: '600 SemiBold' },
  { value: '700', label: '700 Bold' },
  { value: '800', label: '800 ExtraBold' },
  { value: '900', label: '900 Black' },
]

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', icon: <AlignLeft size={12} /> },
  { value: 'center', icon: <AlignCenter size={12} /> },
  { value: 'right', icon: <AlignRight size={12} /> },
  { value: 'justify', icon: <AlignJustify size={12} /> },
]

export function TypographySection() {
  const el = useStore((s) => s.selectedElement)
  const transform = useTransform()

  if (!el) return null

  const cs = el.computedStyle
  const fontSize = parsePx(cs.fontSize) || '16'
  const letterSpacing = parsePx(cs.letterSpacing) || '0'

  return (
    <Section title="Typography">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#6B7585', flexShrink: 0, width: '64px' }}>
          Size
        </span>
        <Input
          type="number"
          value={fontSize}
          onChange={(v) => transform('fontSize', v, 'px')}
          suffix="px"
          min={1}
          max={200}
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#6B7585', flexShrink: 0, width: '64px' }}>
          Weight
        </span>
        <Select
          value={cs.fontWeight || '400'}
          onChange={(v) => transform('fontWeight', v)}
          options={FONT_WEIGHT_OPTIONS}
          style={{ flex: 1 }}
        />
      </div>

      <ColorPicker
        label="Color"
        value={cs.color || '#E8EAF0'}
        onChange={(v) => transform('color', v)}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#6B7585', flexShrink: 0, width: '64px' }}>
          Line H.
        </span>
        <Input
          type="text"
          value={cs.lineHeight || '1.5'}
          onChange={(v) => transform('lineHeight', v)}
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#6B7585', flexShrink: 0, width: '64px' }}>
          Tracking
        </span>
        <Input
          type="number"
          value={letterSpacing}
          onChange={(v) => transform('letterSpacing', v, 'px')}
          suffix="px"
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#6B7585', flexShrink: 0, width: '64px' }}>
          Align
        </span>
        <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
          {TEXT_ALIGN_OPTIONS.map(({ value, icon }) => (
            <button
              key={value}
              onClick={() => transform('textAlign', value)}
              style={{
                flex: 1,
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  cs.textAlign === value
                    ? 'rgba(99, 102, 241, 0.2)'
                    : 'rgba(255,255,255,0.05)',
                border:
                  cs.textAlign === value
                    ? '1px solid rgba(99, 102, 241, 0.4)'
                    : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '5px',
                cursor: 'pointer',
                color: cs.textAlign === value ? '#818CF8' : '#6B7585',
                transition: 'all 0.15s',
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
    </Section>
  )
}
