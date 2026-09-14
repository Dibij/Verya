import { useStore } from '../../../store'
import { api } from '../../../lib/api'
import type { ElementInfo, TransformRequest } from '../../../types'
import { Section } from '../../ui/Section'
import { Select } from '../../ui/Select'
import { Input } from '../../ui/Input'
import { Label } from '../../ui/Label'

function parsePx(val: string): string {
  if (!val || val === 'auto' || val === 'none') return ''
  return val.replace('px', '')
}

function buildSelector(el: ElementInfo) {
  return {
    tagName: el.tagName,
    className: el.className ? el.className.split(' ')[0] : undefined,
    componentName: el.componentName ?? undefined,
  }
}

function useTransform() {
  const project = useStore((s) => s.project)
  const componentTree = useStore((s) => s.componentTree)
  const selectedElement = useStore((s) => s.selectedElement)

  return async (property: string, value: string, unit?: string) => {
    if (!selectedElement || !project) return
    // Try to find the file from componentTree first, fall back to entryFile
    let file = project.entryFile
    if (selectedElement.componentName) {
      const node = componentTree.find((n) => n.name === selectedElement.componentName)
      if (node) file = node.file
    }

    const req: TransformRequest = {
      file,
      selector: buildSelector(selectedElement),
      changes: [{ property, value, unit }],
    }
    const result = await api.transform(req)
    if (!result.success) {
      console.warn('[transform] failed:', result.error)
    }
  }
}

const DISPLAY_OPTIONS = [
  { value: 'block', label: 'block' },
  { value: 'flex', label: 'flex' },
  { value: 'grid', label: 'grid' },
  { value: 'inline', label: 'inline' },
  { value: 'inline-block', label: 'inline-block' },
  { value: 'inline-flex', label: 'inline-flex' },
  { value: 'none', label: 'none' },
]

const FLEX_DIRECTION_OPTIONS = [
  { value: 'row', label: 'row' },
  { value: 'row-reverse', label: 'row-reverse' },
  { value: 'column', label: 'column' },
  { value: 'column-reverse', label: 'column-reverse' },
]

const ALIGN_ITEMS_OPTIONS = [
  { value: 'flex-start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'flex-end', label: 'end' },
  { value: 'stretch', label: 'stretch' },
  { value: 'baseline', label: 'baseline' },
]

const JUSTIFY_CONTENT_OPTIONS = [
  { value: 'flex-start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'flex-end', label: 'end' },
  { value: 'space-between', label: 'space-between' },
  { value: 'space-around', label: 'space-around' },
  { value: 'space-evenly', label: 'space-evenly' },
]

export function LayoutSection() {
  const el = useStore((s) => s.selectedElement)
  const transform = useTransform()

  if (!el) return null

  const cs = el.computedStyle

  return (
    <>
      <Section title="Layout">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Label>Display</Label>
          <Select
            value={cs.display || 'block'}
            onChange={(v) => transform('display', v)}
            options={DISPLAY_OPTIONS}
            style={{ flex: 1 }}
          />
        </div>

        {cs.display === 'flex' || cs.display === 'inline-flex' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Label>Direction</Label>
              <Select
                value={cs.flexDirection || 'row'}
                onChange={(v) => transform('flexDirection', v)}
                options={FLEX_DIRECTION_OPTIONS}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Label>Align</Label>
              <Select
                value={cs.alignItems || 'flex-start'}
                onChange={(v) => transform('alignItems', v)}
                options={ALIGN_ITEMS_OPTIONS}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Label>Justify</Label>
              <Select
                value={cs.justifyContent || 'flex-start'}
                onChange={(v) => transform('justifyContent', v)}
                options={JUSTIFY_CONTENT_OPTIONS}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Label>Gap</Label>
              <Input
                type="number"
                value={parsePx(cs.gap) || '0'}
                onChange={(v) => transform('gap', v, 'px')}
                suffix="px"
                style={{ flex: 1 }}
              />
            </div>
          </>
        ) : null}
      </Section>

      <Section title="Size">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
          }}
        >
          {[
            { label: 'W', prop: 'width', val: cs.width },
            { label: 'H', prop: 'height', val: cs.height },
          ].map(({ label, prop, val }) => (
            <div key={prop} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: '#3D4357', width: '12px' }}>{label}</span>
              <Input
                type="text"
                value={val === 'auto' ? 'auto' : parsePx(val)}
                onChange={(v) => transform(prop, v.includes('px') || v === 'auto' ? v : `${v}px`)}
                placeholder="auto"
                style={{ flex: 1 }}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing">
        <div style={{ marginBottom: '6px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontSize: '10px', color: '#3D4357', width: '48px' }}>Padding</span>
            {[
              { label: 'T', prop: 'paddingTop', val: cs.paddingTop },
              { label: 'R', prop: 'paddingRight', val: cs.paddingRight },
              { label: 'B', prop: 'paddingBottom', val: cs.paddingBottom },
              { label: 'L', prop: 'paddingLeft', val: cs.paddingLeft },
            ].map(({ label, prop, val }) => (
              <div key={prop} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#3D4357' }}>{label}</span>
                <Input
                  type="number"
                  value={parsePx(val) || '0'}
                  onChange={(v) => transform(prop, v, 'px')}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#3D4357', width: '48px' }}>Margin</span>
            {[
              { label: 'T', prop: 'marginTop', val: cs.marginTop },
              { label: 'R', prop: 'marginRight', val: cs.marginRight },
              { label: 'B', prop: 'marginBottom', val: cs.marginBottom },
              { label: 'L', prop: 'marginLeft', val: cs.marginLeft },
            ].map(({ label, prop, val }) => (
              <div key={prop} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#3D4357' }}>{label}</span>
                <Input
                  type="number"
                  value={parsePx(val) || '0'}
                  onChange={(v) => transform(prop, v, 'px')}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  )
}
