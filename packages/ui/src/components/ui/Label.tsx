interface LabelProps {
  children: React.ReactNode
  htmlFor?: string
}

export function Label({ children, htmlFor }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        fontSize: '11px',
        fontWeight: 500,
        color: 'var(--text-muted)',
        letterSpacing: '0.03em',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </label>
  )
}
