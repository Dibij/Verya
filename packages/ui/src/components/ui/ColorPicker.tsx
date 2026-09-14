import { useRef } from 'react'

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  label?: string
}

function toHex(color: string): string {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return '#000000'
  if (color.startsWith('#')) return color
  // Try to parse rgb/rgba
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (match) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0')
    const g = parseInt(match[2]).toString(16).padStart(2, '0')
    const b = parseInt(match[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  return '#000000'
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hexValue = toHex(value)

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {label && (
        <span style={{ fontSize: '11px', color: '#6B7585', flexShrink: 0, width: '64px' }}>
          {label}
        </span>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '6px',
          height: '28px',
          padding: '0 6px',
          flex: 1,
        }}
      >
        {/* Color swatch — clicking it triggers the hidden native picker */}
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            background: hexValue,
            flexShrink: 0,
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.15)',
            position: 'relative',
          }}
        >
          <input
            ref={inputRef}
            type="color"
            value={hexValue}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer',
            }}
          />
        </div>
        <input
          type="text"
          defaultValue={hexValue}
          key={hexValue}
          onBlur={handleHexInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleHexInput(e as unknown as React.ChangeEvent<HTMLInputElement>)
          }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#E8EAF0',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}
        />
      </div>
    </div>
  )
}
