// Home-screen services (mobile strip and desktop grid).
// An item without `to` is not live yet: it carries a "Tez orada" badge and a tap shows `soon` as a toast.
// `bleed` art sits low in the tile and is clipped by its left edge (the vehicle drives in from the left).
export const SERVICES = [
  { to: '/cargo', label: 'Yetkazish', img: '/home/cargo-front.webp', bleed: true },
  { to: '/promo', label: 'Promo kodlar', img: '/home/promo-code.webp' },
  { label: 'Avtobus', img: '/home/bus-front.webp', badge: 'Tez orada', soon: 'Shaharlararo avtobus — tez orada', bleed: true },
  { to: '/history', label: 'Safarlarim', img: '/home/history.webp' },
  { to: '/wallet', label: 'To‘lovlar', img: '/home/wallet.webp' },
  { to: '/drivers', label: 'Haydovchilar', img: '/home/drivers.webp' },
  { to: '/help', label: 'Yordam', img: '/home/help.webp' },
]
