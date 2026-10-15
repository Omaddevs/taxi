// Payment method and card network marks. Wallet apps sit on a white tile in both themes (their
// logos are drawn for white); cash is a free-standing illustration; card networks are their own
// card-shaped badges.

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

const NETWORK_LOGO = {
  uzcard: { src: '/payments/uzcard.webp', alt: 'Uzcard' },
  humo: { src: '/payments/humo.webp', alt: 'Humo' },
  visa: { src: '/payments/visa.webp', alt: 'Visa' },
  mastercard: { src: '/payments/mastercard.webp', alt: 'Mastercard' },
}

/** The card network's own badge (a small rounded card). Height comes from `className`. */
export function NetworkMark({ network, className = 'h-8' }) {
  const logo = NETWORK_LOGO[network]
  if (!logo) return null
  return <img src={logo.src} alt={logo.alt} className={`aspect-[1.6] w-auto shrink-0 rounded-[6px] object-contain shadow-[0_1px_3px_rgba(0,0,0,0.12)] ${className}`} />
}
