interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: SliderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          color: '#6B7585',
          flexShrink: 0,
          width: '64px',
        }}
      >
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span
        style={{
          fontSize: '11px',
          color: '#E8EAF0',
          flexShrink: 0,
          minWidth: '36px',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
        {unit}
      </span>
    </div>
  )
}
