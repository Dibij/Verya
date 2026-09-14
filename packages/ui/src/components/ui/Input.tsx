interface InputProps {
  value: string | number
  onChange: (value: string) => void
  type?: 'text' | 'number'
  placeholder?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
  className?: string
  style?: React.CSSProperties
}

export function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
  suffix,
  min,
  max,
  step,
  className,
  style,
}: InputProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '6px',
        height: '28px',
        overflow: 'hidden',
        ...style,
      }}
    >
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#E8EAF0',
          fontSize: '12px',
          padding: '0 8px',
          width: '100%',
          fontFamily: 'inherit',
        }}
      />
      {suffix && (
        <span
          style={{
            fontSize: '10px',
            color: '#3D4357',
            paddingRight: '6px',
            flexShrink: 0,
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  )
}
