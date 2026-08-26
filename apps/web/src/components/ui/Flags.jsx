// Bayroqlar SVG sifatida chiziladi — emoji bayroqlar Windows/Chrome’da ko‘rinmaydi.
function FlagFrame({ children, className = '' }) {
  return (
    <span className={`inline-flex shrink-0 overflow-hidden rounded-md ring-1 ring-black/10 ${className}`}>
      <svg viewBox="0 0 32 22" className="h-full w-full" aria-hidden="true">
        {children}
      </svg>
    </span>
  )
}

export function FlagUz({ className = 'h-6 w-8' }) {
  return (
    <FlagFrame className={className}>
      <rect width="32" height="7" fill="#0099B5" />
      <rect y="7" width="32" height="0.6" fill="#CE1126" />
      <rect y="7.6" width="32" height="6.8" fill="#fff" />
      <rect y="14.4" width="32" height="0.6" fill="#CE1126" />
      <rect y="15" width="32" height="7" fill="#1EB53A" />
      <circle cx="5.4" cy="3.5" r="2.2" fill="#fff" />
      <circle cx="6.6" cy="3.1" r="2.2" fill="#0099B5" />
      <g fill="#fff">
        <circle cx="9.6" cy="1.9" r="0.4" />
        <circle cx="11.3" cy="1.9" r="0.4" />
        <circle cx="13" cy="1.9" r="0.4" />
        <circle cx="9.6" cy="3.5" r="0.4" />
        <circle cx="11.3" cy="3.5" r="0.4" />
        <circle cx="13" cy="3.5" r="0.4" />
        <circle cx="9.6" cy="5.1" r="0.4" />
        <circle cx="11.3" cy="5.1" r="0.4" />
        <circle cx="13" cy="5.1" r="0.4" />
      </g>
    </FlagFrame>
  )
}

export function FlagRu({ className = 'h-6 w-8' }) {
  return (
    <FlagFrame className={className}>
      <rect width="32" height="22" fill="#fff" />
      <rect y="7.33" width="32" height="7.34" fill="#0039A6" />
      <rect y="14.67" width="32" height="7.33" fill="#D52B1E" />
    </FlagFrame>
  )
}

export function FlagGb({ className = 'h-6 w-8' }) {
  return (
    <FlagFrame className={className}>
      <rect width="32" height="22" fill="#012169" />
      <path d="M0 0l32 22M32 0L0 22" stroke="#fff" strokeWidth="4.4" />
      <path d="M0 0l32 22M32 0L0 22" stroke="#C8102E" strokeWidth="2.4" />
      <path d="M16 0v22M0 11h32" stroke="#fff" strokeWidth="7.3" />
      <path d="M16 0v22M0 11h32" stroke="#C8102E" strokeWidth="4.4" />
    </FlagFrame>
  )
}
