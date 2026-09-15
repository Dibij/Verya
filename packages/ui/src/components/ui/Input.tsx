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
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
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
          color: 'var(--text-primary)',
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
