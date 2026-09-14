interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  style?: React.CSSProperties
}

export function Select({ value, onChange, options, style }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '6px',
        color: '#E8EAF0',
        fontSize: '12px',
        height: '28px',
        padding: '0 24px 0 8px',
        outline: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236B7585'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        ...style,
      }}
    >
      {options.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          style={{ background: '#1A1D26', color: '#E8EAF0' }}
        >
          {opt.label}
        </option>
      ))}
    </select>
  )
}
