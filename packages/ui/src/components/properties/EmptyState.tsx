import { Layers } from 'lucide-react'

export function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '12px',
        padding: '32px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Layers size={18} color="rgba(99, 102, 241, 0.6)" />
      </div>
      <div>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            margin: '0 0 6px 0',
            fontWeight: 500,
          }}
        >
          Nothing selected
        </p>
        <p
          style={{
            fontSize: '11px',
            color: 'var(--text-faint)',
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Click any element in
          <br />
          the preview to inspect
          <br />
          and edit its properties.
        </p>
      </div>
    </div>
  )
}
