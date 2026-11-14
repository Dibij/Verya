import { useStore } from '../../../store'
import { useTransform } from '../../../lib/useTransform'
import { Section } from '../../ui/Section'
import { Slider } from '../../ui/Slider'
import { Input } from '../../ui/Input'
import { ColorPicker } from '../../ui/ColorPicker'

function parseOpacity(val: string): number {
  const n = parseFloat(val)
  if (isNaN(n)) return 100
  // opacity is 0-1 in computed style
  return Math.round(n * 100)
}

function parsePx(val: string): number {
  if (!val) return 0
  return parseInt(val) || 0
}

const SHADOW_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: '0 1px 3px rgba(0,0,0,0.3)', label: 'Small' },
  { value: '0 4px 12px rgba(0,0,0,0.4)', label: 'Medium' },
  { value: '0 8px 24px rgba(0,0,0,0.5)', label: 'Large' },
  { value: '0 20px 60px rgba(0,0,0,0.6)', label: 'X-Large' },
]

export function AppearanceSection() {
  const el = useStore((s) => s.selectedElement)
  const transform = useTransform()

  if (!el) return null

  const cs = el.computedStyle
  const opacity = parseOpacity(cs.opacity)
  const borderRadius = parsePx(cs.borderRadius)
  const borderWidth = parsePx(cs.borderWidth)

  return (
    <>
      <Section title="Appearance">
        <ColorPicker
          label="Background"
          value={cs.backgroundColor || '#000000'}
          onChange={(v) => transform('backgroundColor', v)}
        />
        <Slider
          label="Opacity"
          value={opacity}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => transform('opacity', String(v / 100))}
        />
      </Section>

      <Section title="Border">
        <ColorPicker
          label="Color"
          value={cs.borderColor || 'transparent'}
          onChange={(v) => transform('borderColor', v)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '64px', flexShrink: 0 }}>Width</span>
          <Input
            type="number"
            value={borderWidth}
            onChange={(v) => transform('borderWidth', v, 'px')}
            suffix="px"
            min={0}
            max={20}
            style={{ flex: 1 }}
          />
        </div>
        <Slider
          label="Radius"
          value={borderRadius}
          min={0}
          max={48}
          step={1}
          unit="px"
          onChange={(v) => transform('borderRadius', String(v), 'px')}
        />
      </Section>

      <Section title="Shadow">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '64px', flexShrink: 0 }}>Shadow</span>
          <select
            value={
              SHADOW_OPTIONS.find((o) => o.value === cs.boxShadow)?.value ?? 'none'
            }
            onChange={(e) => transform('boxShadow', e.target.value)}
            style={{
              flex: 1,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              height: '28px',
              padding: '0 8px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          >
            {SHADOW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-panel)' }}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </Section>
    </>
  )
}
