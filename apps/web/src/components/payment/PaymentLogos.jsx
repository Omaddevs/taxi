// Payment method and card network marks. Wallet apps sit on a white tile in both themes (their
// logos are drawn for white); cash is a free-standing illustration.

const APP_LOGO = {
  click: { src: '/payments/click.webp', alt: 'Click', pad: 'px-1.5' },
  payme: { src: '/payments/payme.webp', alt: 'Payme', pad: 'p-1' },
  uzum: { src: '/payments/uzum.webp', alt: 'Uzum Bank', pad: 'p-0.5' },
}

export function PaymentLogo({ id, className = '', dim = false }) {
  if (id === 'cash') {
    return <img src="/payments/cash.webp" alt="" className={`h-9 w-12 shrink-0 object-contain ${dim ? 'opacity-50' : ''} ${className}`} />
  }
  const logo = APP_LOGO[id]
  if (!logo) return null
  return (
    <span
      className={`flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#ffffff] ring-1 ring-black/[0.06] ${logo.pad} ${dim ? 'opacity-50 grayscale-[35%]' : ''} ${className}`}
    >
      <img src={logo.src} alt={logo.alt} className="max-h-full max-w-full object-contain" />
    </span>
  )
}

/** Small network mark for a card face or a list row. `light` draws it for a dark/colour card. */
export function NetworkMark({ network, light = false, className = '' }) {
  const fg = light ? '#ffffff' : '#1a2b3c'
  if (network === 'visa') {
    return (
      <svg viewBox="0 0 64 22" className={`h-5 w-auto ${className}`} role="img" aria-label="Visa">
        <text x="0" y="19" fontFamily="Arial Black, Arial, sans-serif" fontSize="22" fontStyle="italic" fontWeight="900" fill={light ? '#ffffff' : '#1a1f71'} letterSpacing="1">
          VISA
        </text>
      </svg>
    )
  }
  if (network === 'mastercard') {
    return (
      <svg viewBox="0 0 40 24" className={`h-6 w-auto ${className}`} role="img" aria-label="Mastercard">
        <circle cx="14" cy="12" r="11" fill="#eb001b" />
        <circle cx="26" cy="12" r="11" fill="#f79e1b" />
        <path d="M20 3.4a11 11 0 0 1 0 17.2 11 11 0 0 1 0-17.2z" fill="#ff5f00" />
      </svg>
    )
  }
  if (network === 'humo') {
    return (
      <svg viewBox="0 0 76 22" className={`h-5 w-auto ${className}`} role="img" aria-label="Humo">
        <circle cx="10" cy="11" r="9" fill="none" stroke={light ? '#ffffff' : '#00a1e0'} strokeWidth="3.4" />
        <text x="23" y="17" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" fill={fg} textLength="51" lengthAdjust="spacingAndGlyphs">
          HUMO
        </text>
      </svg>
    )
  }
  if (network === 'uzcard') {
    return (
      <svg viewBox="0 0 92 22" className={`h-5 w-auto ${className}`} role="img" aria-label="Uzcard">
        <rect x="0" y="2" width="18" height="18" rx="4" fill={light ? '#ffffff' : '#1d4f91'} />
        <text x="4" y="16" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="900" fill={light ? '#1d4f91' : '#ffffff'}>
          U
        </text>
        <text x="23" y="17" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" fill={fg} textLength="67" lengthAdjust="spacingAndGlyphs">
          UZCARD
        </text>
      </svg>
    )
  }
  return null
}
