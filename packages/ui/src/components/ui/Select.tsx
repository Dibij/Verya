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
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
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
          style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)' }}
        >
          {opt.label}
        </option>
      ))}
    </select>
  )
}
