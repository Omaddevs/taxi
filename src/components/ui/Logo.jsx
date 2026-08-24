export function Logo({ size = 36 }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-brand text-white shadow-sm shadow-brand/30"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 32 32" width={size * 0.7} height={size * 0.7} fill="none">
        <path d="M7 20.5h18l-1.6-6a2 2 0 0 0-1.9-1.5H10.5a2 2 0 0 0-1.9 1.5L7 20.5z" fill="currentColor" />
        <circle cx="11.2" cy="22.2" r="1.7" fill="currentColor" />
        <circle cx="20.8" cy="22.2" r="1.7" fill="currentColor" />
        <rect x="12" y="10" width="8" height="3.2" rx="1" fill="currentColor" />
        <path d="M8 16.2h16" stroke="#E91E63" strokeWidth="1.4" strokeDasharray="2 2" />
      </svg>
    </div>
  )
}

export function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo />
      {compact ? null : (
        <div>
          <p className="text-[15px] font-extrabold leading-none tracking-tight text-ink">Taxiline</p>
          <p className="mt-0.5 text-[11px] text-muted">Yo‘l va xizmatlar</p>
        </div>
      )}
    </div>
  )
}
