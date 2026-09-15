import { type ReactNode } from 'react'

interface SectionProps {
  title: string
  children: ReactNode
}

export function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
        <div
          style={{
            flex: 1,
            height: '1px',
            background: 'var(--border-subtle)',
          }}
        />
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
