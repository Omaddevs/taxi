import { ArrowLeft, Bell, Crown, Menu, MessageCircle } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Logo, Wordmark } from '../ui/Logo'

const titles = {
  '/': { title: 'Xush kelibsiz! 👋', subtitle: 'Qayerga yo‘l olmoqchisiz?' },
  '/history': { title: 'Safarlarim', subtitle: 'Barcha buyurtmalar tarixi' },
  '/cargo': { title: 'Yuk jo‘natish', subtitle: 'Tez va xavfsiz yetkazish' },
  '/drivers': { title: 'Haydovchilar', subtitle: 'Tasdiqlangan haydovchilar' },
  '/favorites': { title: 'Saqlash', subtitle: 'Saqlangan yo‘nalishlar' },
  '/wallet': { title: 'Hamyon', subtitle: 'Kartalar va to‘lovlar' },
  '/notifications': { title: 'Xabarnomalar', subtitle: 'So‘nggi yangiliklar' },
  '/promo': { title: 'Promo kodlar', subtitle: 'Chegirmalar va bonuslar' },
  '/help': { title: 'Yordam markazi', subtitle: 'Savollaringizga javob' },
  '/settings': { title: 'Sozlamalar', subtitle: 'Ilova va profil' },
  '/results': { title: 'Safar natijalari', subtitle: 'Mavjud haydovchilar' },
  '/profile': { title: 'Profil', subtitle: 'Shaxsiy ma’lumotlar' },
  '/women': { title: 'Ayollar uchun', subtitle: 'Xavfsiz taksi xizmati' },
  '/women/taxi': { title: 'Ayollar uchun Taxi', subtitle: 'Avval ayol haydovchilarga' },
  '/taxi': { title: 'Taxi', subtitle: 'Olib ketish joyini tanlang' },
  '/cars': { title: 'Avtomobil turlari', subtitle: 'Klassni tanlang' },
  '/payment': { title: 'To‘lov', subtitle: 'To‘lov usulini tanlang' },
  '/messages': { title: 'Xabarlar', subtitle: 'Haydovchi va yordam' },
  '/become-driver': { title: 'Haydovchi bo‘lish', subtitle: 'Ariza qoldiring' },
  '/roadside': { title: 'Yo‘lda yordam', subtitle: 'Usta, evakuator, shina' },
  '/map': { title: 'Smart xarita', subtitle: 'Barcha xizmatlar bir xaritada' },
  '/fuel': { title: 'Yoqilg‘i shahobchalari', subtitle: 'Metan, propan, benzin, EV' },
  '/ai': { title: 'TaxiLine AI', subtitle: 'Yordamchi, aniq tashxis emas' },
  '/ride': { title: 'Taxi chaqirish', subtitle: 'Qayerdan — qayerga' },
  '/plus': { title: 'TaxiLine Plus', subtitle: '3 ta tarif, bitta hisob' },
}

// Mobilda menyu o‘rniga "orqaga" tugmasi chiqadigan sahifalar.
const backOnMobile = ['/cargo', '/women', '/become-driver']

function headerMeta(pathname) {
  if (titles[pathname]) return titles[pathname]
  if (pathname.startsWith('/trip/')) return { title: 'Safar tafsilotlari', subtitle: 'Haydovchi va marshrut' }
  if (pathname.startsWith('/messages/')) return { title: 'Chat', subtitle: 'Xabarlar' }
  if (pathname.startsWith('/hub/')) return { title: 'Xizmatlar', subtitle: 'TaxiLine ekotizimi' }
  return { title: 'TaxiLine', subtitle: 'Yo‘l, avtomobil va kundalik xizmatlar' }
}

export function TopHeader() {
  const { user, setDrawerOpen } = useApp()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const firstName = (user.firstName || user.name || '').trim().split(/\s+/)[0]
  const baseMeta = headerMeta(pathname)
  // Home greets by name once we know it.
  const meta = pathname === '/' && firstName ? { ...baseMeta, title: `Xush kelibsiz, ${firstName}! 👋` } : baseMeta
  const showBack = backOnMobile.includes(pathname)

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:px-[max(2rem,calc((100%-1180px)/2))]">
      <div className="flex min-w-0 items-center gap-3">
        {/* Desktop: no sidebar any more — the menu lives in the drawer, opened from here. */}
        <button
          type="button"
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas transition hover:bg-brand-soft lg:flex"
          onClick={() => setDrawerOpen(true)}
          aria-label="Menyu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="hidden shrink-0 items-center gap-1.5 lg:flex" aria-label="Bosh sahifa">
          <Logo size={34} />
          <Wordmark className="text-[24px]" />
        </Link>
        <span className="hidden h-8 w-px shrink-0 bg-line lg:block" aria-hidden />
        {showBack ? (
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas lg:hidden"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas lg:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold tracking-tight lg:text-[22px]">{meta.title}</h1>
          {meta.subtitle ? <p className="hidden truncate text-sm text-muted sm:block">{meta.subtitle}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/plus"
          className="hidden h-12 items-center gap-2 rounded-full bg-brand px-5 text-sm font-extrabold text-white shadow-md shadow-brand/30 sm:flex"
        >
          <Crown className="h-4 w-4 fill-white" strokeWidth={0} />
          Plus
        </Link>
        <Link to="/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-canvas">
          <Bell className="h-5 w-5 text-ink" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </Link>
        <Link to="/messages" className="hidden h-10 w-10 items-center justify-center rounded-full bg-canvas sm:flex">
          <MessageCircle className="h-5 w-5 text-ink" />
        </Link>
        <Link
          to="/profile"
          aria-label="Profil"
          className={`ml-1 flex items-center gap-2 rounded-full bg-canvas py-1 pl-1 transition hover:bg-brand-soft ${firstName ? 'sm:pr-3' : 'pr-1'}`}
        >
          <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
          {firstName ? <span className="hidden max-w-[120px] truncate text-sm font-semibold sm:block">{firstName}</span> : null}
        </Link>
      </div>
    </header>
  )
}
