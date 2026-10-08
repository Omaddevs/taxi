// Home-screen services (mobile strip and desktop grid).
export const SERVICES = [
  { to: '/cargo', label: 'Yetkazish', img: '/home/parcel.webp' },
  { to: '/fuel', label: 'Yoqilg‘i', img: '/home/fuel.webp' },
  // ?ijara=1 opens the Skuter ijara sheet over this page (components/rent/RentMarketHost.jsx).
  { to: '?ijara=1', label: 'Skuter ijara', img: '/home/scooter-rent.webp', badge: 'Yangi' },
  { to: '/hub/auto-service', label: 'Avtoservis', img: '/home/service.webp' },
  { to: '/roadside', label: 'Yo‘lda yordam', img: '/cars/tow.png', wide: true },
  { to: '/map', label: 'Smart xarita', img: '/home/smart-map.png' },
  { to: '/promo', label: 'Promo kodlar', img: '/home/promo.webp' },
  { to: '/notifications', label: 'Xabarnomalar', img: '/home/notifications.png' },
  { to: '/history', label: 'Safarlarim', img: '/home/history.webp' },
  { to: '/wallet', label: 'To‘lovlar', img: '/home/wallet.webp' },
  { to: '/favorites', label: 'Sevimlilar', img: '/home/favorites.webp' },
  { to: '/drivers', label: 'Haydovchilar', img: '/home/drivers.webp' },
  { to: '/help', label: 'Yordam', img: '/home/help.webp' },
]
