import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Gift,
  LogIn,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { ScrollTopButton, SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import { Cover } from '../components/rent/shared'
import { mainPrice, som, useRentals } from '../components/rent/rentData'
import { Logo, Wordmark } from '../components/ui/Logo'
import { useAuth } from '../context/AuthContext'
import { VEHICLE_TYPE, VEHICLE_TYPES } from '../data/rentals'
import { breadcrumbJsonLd } from '../seo/pages'
import { useJsonLd, useSeo } from '../seo/useSeo'
import { FaqItem } from './Landing'

// "Skuter ijara" ommaviy sahifasi — asosiy landing bilan bir xil vizual til (kulrang + brend
// panelli hero, qorong‘i afzalliklar bloki), lekin ijaraga moslangan. E’lonlar jonli: /rentals
// (moderatsiyadan o‘tgan, faol). Ijara bozorining o‘zi ilova ichida (?ijara=…) — mehmonni
// avval kirishga yuboramiz, kirgan foydalanuvchini to‘g‘ri bozorga.

const NAV = [
  { to: '/haydovchi-bolish', label: 'Haydovchi bo‘lish' },
  { to: '/news', label: 'Yangiliklar' },
  { to: '/skuter-ijara', label: 'Skuter ijara', active: true },
]

const ADVANTAGES = [
  { icon: Clock, title: 'Soatbay yoki kunlik', text: 'Bir soatga ham, bir haftaga ham — o‘zingizga qulay muddat', tone: 'brand' },
  { icon: MapPin, title: 'Yaqin atrofda', text: 'Xaritada sizga eng yaqin skuter va velosipedlar', tone: 'light' },
  { icon: MessageCircle, title: 'Egasi bilan to‘g‘ridan-to‘g‘ri', text: 'Vositachisiz: qo‘ng‘iroq qiling yoki Telegram’da yozing', tone: 'brand' },
  { icon: BadgeCheck, title: 'Tekshirilgan e’lonlar', text: 'Har bir e’lon moderatsiyadan o‘tib, keyin chiqadi', tone: 'light' },
  { icon: Zap, title: 'Elektr va oddiy', text: 'Skuter, samokat, velosiped va mototsikllar', tone: 'brand' },
  { icon: Wallet, title: 'Joylash bepul', text: 'Transportingizni ijaraga bering va daromad qiling', tone: 'light' },
]

const RENTER_STEPS = [
  { title: 'Transport tanlang', text: 'Katalog yoki xaritada turini, narxini va manzilini ko‘ring' },
  { title: 'Egasi bilan bog‘laning', text: 'Qo‘ng‘iroq qiling yoki Telegram’da yozib, vaqtni kelishing' },
  { title: 'Oling va yo‘lga chiqing', text: 'Hujjat va garovni joyida rasmiylashtiring — yo‘lingiz ochiq' },
]

const OWNER_STEPS = [
  { title: 'Ro‘yxatdan o‘ting', text: 'Telefon raqam yoki Telegram orqali bir daqiqada' },
  { title: 'E’lon joylang', text: 'Rasm, narx (soat/kun/hafta), manzil va garovni kiriting' },
  { title: 'Mijozlar o‘zi topadi', text: 'Tasdiqlangach e’loningiz katalog va xaritada chiqadi' },
]

const RENT_FAQ = [
  {
    q: 'Ijaraga olish uchun nima kerak?',
    a: 'Odatda shaxsni tasdiqlovchi hujjat va kelishilgan garov. Mototsikl va kuchli skuterlar uchun haydovchilik guvohnomasi talab qilinadi — bu e’lon kartochkasida “Guvohnoma kerak” deb ko‘rsatiladi.',
  },
  {
    q: 'To‘lov qanday amalga oshiriladi?',
    a: 'To‘lov va garov transport egasi bilan to‘g‘ridan-to‘g‘ri, transportni olayotganda kelishiladi. TaxiLine e’lonlar va aloqa uchun platforma vazifasini bajaradi.',
  },
  {
    q: 'Narxlar qanday belgilanadi?',
    a: 'Har bir egasi narxni o‘zi belgilaydi: soatlik, kunlik yoki haftalik. Uzoq muddatga olsangiz, haftalik narx odatda ancha arzon chiqadi.',
  },
  {
    q: 'O‘z skuterimni qanday ijaraga beraman?',
    a: 'Ro‘yxatdan o‘ting, “Skuter ijara” bo‘limida “Joylash”ni bosing va formani to‘ldiring. E’lon admin tomonidan tekshirilgach, katalog va xaritada ko‘rinadi. Joylash bepul.',
  },
  {
    q: 'E’lonlar ishonchlimi?',
    a: 'Har bir e’lon chiqishidan oldin moderatsiyadan o‘tadi. Shunday bo‘lsa ham, transportni olishdan oldin uning holatini ko‘zdan kechiring va shartlarni aniq kelishib oling.',
  },
]

// Mehmon → kirish sahifasi; kirgan foydalanuvchi → ilova ichidagi ijara bozori.
function useRentLinks() {
  const { status } = useAuth()
  const authed = status === 'authed'
  return {
    authed,
    browse: authed ? '/?ijara=1' : '/login',
    map: authed ? '/?ijara=xarita' : '/login',
    post: authed ? '/?ijara=yangi' : '/register',
    listing: (id) => (authed ? `/?ijara=1&elon=${encodeURIComponent(id)}` : '/login'),
  }
}

function ScooterImage({ className = '' }) {
  return <img src="/rent/scooter.webp" alt="TaxiLine skuteri" width={720} height={502} fetchPriority="high" draggable={false} className={`select-none ${className}`} />
}

function NavLinks({ className = '', onNavigate }) {
  return NAV.map((item) => (
    <Link
      key={item.to}
      to={item.to}
      onClick={onNavigate}
      aria-current={item.active ? 'page' : undefined}
      className={`${className} ${item.active ? 'underline decoration-ink decoration-2 underline-offset-[6px]' : ''}`}
    >
      {item.label}
    </Link>
  ))
}

function AdvantageCard({ icon: Icon, title, text, tone }) {
  const brand = tone === 'brand'
  return (
    <article
      className={`flex h-[214px] w-[158px] shrink-0 snap-start flex-col rounded-[16px] p-5 sm:h-[226px] sm:w-[168px] 2xl:h-[290px] 2xl:w-[216px] 2xl:rounded-[20px] 2xl:p-6 ${
        brand ? 'bg-brand' : 'bg-white'
      } text-ink`}
    >
      <Icon className={`h-9 w-9 ${brand ? 'text-ink' : 'text-brand'}`} strokeWidth={1.7} />
      <h3 className="mt-auto text-[18px] font-extrabold leading-[1.15] tracking-tight 2xl:text-[23px]">{title}</h3>
      <p className={`mt-2.5 text-[12px] leading-[1.4] 2xl:text-[14px] ${brand ? 'text-ink/85' : 'text-ink/70'}`}>{text}</p>
    </article>
  )
}

const DOTS = 3

function Hero({ total }) {
  const links = useRentLinks()
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState(0)
  const scroller = useRef(null)

  function onScroll() {
    const el = scroller.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setActive(max > 0 ? Math.round((el.scrollLeft / max) * (DOTS - 1)) : 0)
  }

  function goTo(index) {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ left: ((el.scrollWidth - el.clientWidth) * index) / (DOTS - 1), behavior: 'smooth' })
  }

  const dots = (
    <div className="flex gap-4 sm:gap-5">
      {Array.from({ length: DOTS }, (_, i) => (
        <button key={i} type="button" onClick={() => goTo(i)} aria-label={`${i + 1}-sahifa`} className="flex h-5 items-center">
          <span className={`block h-[3px] w-12 rounded-full transition-colors sm:w-16 ${i === active ? 'bg-brand' : 'bg-white/15'}`} />
        </button>
      ))}
    </div>
  )

  return (
    <section className="mx-auto max-w-[1600px] px-3 pt-3 sm:px-6 sm:pt-6">
      <div className="relative overflow-hidden rounded-[28px] bg-[#f3f4f6] sm:rounded-[40px]">
        <div className="relative grid lg:grid-cols-2">
          {/* ── Chap: kulrang panel ── */}
          <div className="relative px-5 pb-2 pt-5 sm:px-10 sm:pt-8 lg:px-14 lg:pb-[250px] lg:pt-10 2xl:px-20 2xl:pb-[320px] 2xl:pt-14">
            {/* Fondagi katta "S" (Skuter) */}
            <svg aria-hidden="true" viewBox="0 0 600 600" className="pointer-events-none absolute -left-16 -top-6 w-[460px] sm:w-[600px] lg:w-[680px] 2xl:w-[820px]">
              <path d="M470 150 H 210 Q 110 150 110 250 Q 110 340 210 340 H 330 Q 430 340 430 440 Q 430 540 330 540 H 60" fill="none" stroke="#e7e9ed" strokeWidth="96" />
            </svg>

            <div className="relative z-30 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2.5 2xl:gap-3" aria-label="TaxiLine">
                <Logo size={40} className="sm:h-12! sm:w-12! 2xl:h-14! 2xl:w-14!" />
                <Wordmark className="text-[21px] sm:text-[25px] 2xl:text-[29px]" />
              </Link>
              <div className="flex items-center gap-1.5 lg:hidden">
                <Link to="/login" className="spin-border flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-extrabold text-white">
                  <LogIn className="h-4 w-4" /> Kirish
                </Link>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-ink"
                  aria-label="Menyu"
                  aria-expanded={menuOpen}
                >
                  {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {menuOpen ? (
              <div className="absolute inset-x-4 top-[68px] z-40 rounded-2xl bg-white p-2 shadow-[0_20px_40px_rgba(15,29,42,0.18)] sm:inset-x-10 lg:hidden">
                <NavLinks onNavigate={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-[15px] font-bold text-ink hover:bg-canvas" />
                <Link to="/aksiyalar#random" className="flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-bold text-brand-dark hover:bg-canvas">
                  <Gift className="h-4 w-4" /> Random mijoz
                </Link>
              </div>
            ) : null}

            <p className="relative mt-12 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-brand-dark shadow-sm sm:mt-14 lg:mt-[70px] 2xl:mt-[96px] 2xl:text-[14px]">
              <span className="h-2 w-2 rounded-full bg-brand" /> Skuter ijara
            </p>
            <h1 className="relative mt-4 text-[38px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[52px] lg:text-[54px] xl:text-[60px] 2xl:text-[78px]">
              Shahar bo‘ylab
              <br />
              erkin harakat
            </h1>

            <div className="relative z-20 mx-auto -mb-14 mt-6 w-[86%] max-w-[480px] sm:-mb-20 lg:hidden">
              <ScooterImage className="h-auto w-full drop-shadow-[0_22px_18px_rgba(15,29,42,0.28)]" />
            </div>
          </div>

          {/* ── O‘ng: brend panel ── */}
          <div className="relative overflow-hidden bg-brand px-5 pb-16 pt-24 sm:px-10 sm:pt-32 lg:overflow-visible lg:px-10 lg:pb-[190px] lg:pt-10 xl:px-14 2xl:px-20 2xl:pb-[240px] 2xl:pt-14">
            <svg aria-hidden="true" viewBox="0 0 600 600" className="pointer-events-none absolute -right-16 top-6 w-[460px] sm:w-[560px] lg:-right-10 lg:top-10 lg:w-[640px]">
              <circle cx="190" cy="430" r="120" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="64" />
              <circle cx="470" cy="430" r="120" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="64" />
              <path d="M190 430 L 300 170 H 400 M300 170 L 470 430" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="56" strokeLinejoin="round" />
            </svg>

            <nav className="relative z-30 hidden items-center justify-end gap-5 lg:flex xl:gap-7">
              <NavLinks className="whitespace-nowrap text-[14px] font-semibold text-ink/90 transition hover:text-ink 2xl:text-[16px]" />
              <Link
                to="/aksiyalar#random"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/30 px-3.5 py-1.5 text-[14px] font-bold text-ink ring-1 ring-ink/10 transition hover:bg-white/50 2xl:text-[16px]"
              >
                <Gift className="h-4 w-4" /> Random mijoz
              </Link>
              <Link
                to="/login"
                className="spin-border flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-[13px] font-extrabold text-white shadow-[0_8px_18px_rgba(15,29,42,0.25)] transition hover:bg-[#0f1d2a]"
              >
                <LogIn className="h-4 w-4" /> Kirish
              </Link>
            </nav>

            <h2 className="relative text-[32px] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[44px] lg:mt-[92px] lg:text-[38px] xl:text-[44px] 2xl:mt-[120px] 2xl:text-[64px]">
              Skuter, samokat
              <br />
              va velosiped ijarasi
            </h2>
            <p className="relative mt-4 max-w-[460px] text-[15px] leading-[1.5] text-ink/85 sm:text-[17px] 2xl:max-w-[560px] 2xl:text-[21px]">
              soatbay yoki kunlik — yaqin atrofdagi transportni toping va egasi bilan to‘g‘ridan-to‘g‘ri kelishing
            </p>

            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to={links.browse}
                className="spin-border inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-ink px-8 text-[14px] font-bold uppercase tracking-[0.03em] text-white shadow-[0_10px_20px_rgba(15,29,42,0.25)] transition hover:bg-[#0f1d2a] 2xl:h-14 2xl:px-10 2xl:text-[16px]"
              >
                <Search className="h-4 w-4" /> Ijaraga olish
              </Link>
              <Link
                to={links.post}
                className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-7 text-[14px] font-bold uppercase tracking-[0.03em] text-ink transition hover:bg-white/85 2xl:h-14 2xl:px-9 2xl:text-[16px]"
              >
                <Plus className="h-4 w-4" /> E’lon joylash
              </Link>
            </div>
            {total > 0 ? (
              <p className="relative mt-5 text-[13px] font-semibold text-ink/75 2xl:text-[15px]">
                Hozir <span className="font-extrabold text-ink">{total} ta</span> e’lon ijaraga tayyor
              </p>
            ) : null}
          </div>
        </div>

        {/* ── Pastki qorong‘i blok ── */}
        <div id="afzalliklar" className="relative z-10 -mt-8 scroll-mt-24 rounded-[28px] bg-[#1d2229] sm:-mt-10 sm:rounded-[40px]">
          <div className="pointer-events-none absolute bottom-[calc(100%-36px)] left-[8%] z-20 hidden w-[34%] max-w-[520px] lg:block">
            <ScooterImage className="h-auto w-full drop-shadow-[0_26px_22px_rgba(0,0,0,0.35)]" />
          </div>

          <div className="grid gap-9 px-5 pb-8 pt-12 sm:px-10 sm:pb-12 sm:pt-16 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 lg:px-14 lg:pb-16 lg:pt-24 2xl:px-20 2xl:pb-20 2xl:pt-32">
            <div className="min-w-0">
              <h2 className="text-[30px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[40px] xl:text-[46px] 2xl:text-[60px]">
                Nega TaxiLine
                <br />
                ijarasi qulay
              </h2>
              <p className="mt-4 text-[15px] leading-[1.5] text-white/75 sm:text-[17px] 2xl:text-[21px]">
                ijara oluvchi va beruvchi uchun —
                <br className="hidden sm:block" /> kartalarni varaqlang
              </p>
              <a
                href="#elonlar"
                className="mt-8 inline-flex h-12 items-center rounded-full bg-brand px-8 text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink transition hover:bg-[#5ee3eb]"
              >
                E’lonlarni ko‘rish
              </a>
              <div className="mt-14 hidden lg:block">{dots}</div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-3 lg:gap-5">
                <div
                  ref={scroller}
                  onScroll={onScroll}
                  className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto sm:gap-4 lg:w-[352px] lg:flex-none 2xl:w-[452px] 2xl:gap-5"
                >
                  {ADVANTAGES.map((a) => (
                    <AdvantageCard key={a.title} {...a} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => goTo(active >= DOTS - 1 ? 0 : active + 1)}
                  aria-label="Keyingi"
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10 sm:flex"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-7 lg:hidden">{dots}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionTitle({ eyebrow, title, text, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-[720px]">
        <p className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-brand-dark 2xl:text-[15px]">{eyebrow}</p>
        <h2 className="mt-3 text-[32px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[44px] 2xl:text-[58px]">{title}</h2>
        {text ? <p className="mt-4 text-[15px] leading-[1.55] text-ink/70 sm:text-[17px] 2xl:text-[20px]">{text}</p> : null}
      </div>
      {action}
    </div>
  )
}

function VehicleTypes({ counts }) {
  const links = useRentLinks()
  return (
    <section id="turlar" className="mx-auto max-w-[1600px] scroll-mt-24 px-3 pt-16 sm:px-6 sm:pt-24">
      <div className="px-2 sm:px-4 lg:px-8">
        <SectionTitle eyebrow="Turlari" title="Har kimga mos transport" text="Qisqa masofaga samokat, kun bo‘yi skuter, sayr uchun velosiped." />
        <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 2xl:gap-5">
          {VEHICLE_TYPES.map((type, i) => {
            const Icon = type.icon
            const brand = i === 0
            return (
              <Link
                key={type.id}
                to={links.browse}
                className={`group flex flex-col rounded-[22px] p-5 transition hover:-translate-y-0.5 sm:p-6 2xl:rounded-[28px] 2xl:p-7 ${
                  brand ? 'bg-brand text-ink' : 'bg-[#f3f4f6] text-ink hover:bg-brand-soft'
                }`}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl 2xl:h-14 2xl:w-14 ${brand ? 'bg-white/40' : 'bg-white text-brand-dark'}`}>
                  <Icon className="h-6 w-6 2xl:h-7 2xl:w-7" strokeWidth={1.8} />
                </span>
                <span className="mt-10 text-[17px] font-extrabold leading-tight tracking-tight sm:text-[19px] 2xl:text-[23px]">{type.label}</span>
                <span className={`mt-1.5 flex items-center justify-between text-[13px] font-semibold 2xl:text-[15px] ${brand ? 'text-ink/75' : 'text-ink/55'}`}>
                  {counts[type.id] ? `${counts[type.id]} ta e’lon` : 'Tez orada'}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ListingTile({ listing, href }) {
  const price = mainPrice(listing)
  const type = VEHICLE_TYPE[listing.vehicleType]
  return (
    <Link to={href} className="group flex flex-col overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-20px_rgba(15,29,42,0.35)] 2xl:rounded-[28px]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f3f4f6]">
        <Cover src={listing.cover} className="h-full w-full transition duration-500 group-hover:scale-[1.04]" iconClass="h-12 w-12" />
        {type ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[12px] font-bold text-ink backdrop-blur">{type.label}</span>
        ) : null}
        {listing.featured ? (
          <span className="absolute right-3 top-3 rounded-full bg-brand px-3 py-1 text-[12px] font-extrabold text-ink">TOP</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5 2xl:p-6">
        <h3 className="line-clamp-1 text-[17px] font-extrabold tracking-tight text-ink 2xl:text-[20px]">{listing.title}</h3>
        {listing.address ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink/60 2xl:text-[15px]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{listing.address}</span>
          </p>
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          {price ? (
            <p className="text-ink">
              <span className="text-[22px] font-extrabold tracking-tight 2xl:text-[26px]">{som(price.amount)}</span>
              <span className="ml-1 text-[13px] font-semibold text-ink/55">so‘m / {price.unit}</span>
            </p>
          ) : (
            <p className="text-[14px] font-semibold text-ink/55">Narx kelishiladi</p>
          )}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-ink transition group-hover:bg-brand">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

function Listings({ listings, isLoading }) {
  const links = useRentLinks()
  const shown = listings.slice(0, 6)
  return (
    <section id="elonlar" className="mx-auto max-w-[1600px] scroll-mt-24 px-3 pt-16 sm:px-6 sm:pt-24">
      <div className="rounded-[28px] bg-[#f3f4f6] px-5 py-10 sm:rounded-[40px] sm:px-10 sm:py-14 lg:px-14 2xl:px-20 2xl:py-20">
        <SectionTitle
          eyebrow="Jonli e’lonlar"
          title="Hozir ijarada"
          text="Moderatsiyadan o‘tgan, egasi faol saqlab turgan e’lonlar."
          action={
            <Link
              to={links.browse}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[13px] font-extrabold uppercase tracking-[0.05em] text-white transition hover:bg-black"
            >
              Barchasini ko‘rish <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        {isLoading ? (
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:gap-5">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-[340px] animate-pulse rounded-[22px] bg-white/70" />
            ))}
          </div>
        ) : shown.length ? (
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:gap-5">
            {shown.map((l) => (
              <ListingTile key={l.id} listing={l} href={links.listing(l.id)} />
            ))}
          </div>
        ) : (
          <div className="mt-9 flex flex-col items-center rounded-[22px] bg-white px-6 py-12 text-center">
            <img src="/rent/bike.webp" alt="" width={720} height={421} className="h-auto w-[220px] select-none" draggable={false} />
            <h3 className="mt-6 text-[22px] font-extrabold tracking-tight text-ink">Birinchi bo‘lib e’lon joylang</h3>
            <p className="mt-2 max-w-[420px] text-[15px] text-ink/65">Hozircha faol e’lon yo‘q — skuter yoki velosipedingiz bo‘lsa, ijaraga bering va birinchi mijozlarni oling.</p>
            <Link to={links.post} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-[13px] font-extrabold uppercase tracking-[0.05em] text-ink">
              <Plus className="h-4 w-4" /> E’lon joylash
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

function StepList({ steps }) {
  return (
    <ol className="mt-8 space-y-7">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[16px] font-bold text-ink">{i + 1}</span>
          <div>
            <h3 className="text-[19px] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-[22px] 2xl:text-[27px]">{step.title}</h3>
            <p className="mt-2 text-[14px] leading-[1.5] text-ink/70 2xl:text-[17px]">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function HowItWorks() {
  const links = useRentLinks()
  return (
    <section id="qanday" className="mx-auto max-w-[1600px] scroll-mt-24 px-3 pt-16 sm:px-6 sm:pt-24">
      <div className="px-2 sm:px-4 lg:px-8">
        <SectionTitle eyebrow="Qanday ishlaydi" title="Uch qadam — va yo‘ldasiz" />
      </div>
      <div className="mt-9 grid gap-4 lg:grid-cols-2 2xl:gap-5">
        <div className="rounded-[28px] bg-brand-soft px-6 py-9 sm:rounded-[36px] sm:px-10 sm:py-12 2xl:px-14 2xl:py-14">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-brand-dark">
            <Search className="h-3.5 w-3.5" /> Ijaraga oluvchi
          </p>
          <StepList steps={RENTER_STEPS} />
          <Link to={links.browse} className="mt-9 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[13px] font-extrabold uppercase tracking-[0.05em] text-white">
            Transport tanlash <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-[28px] bg-[#f3f4f6] px-6 py-9 sm:rounded-[36px] sm:px-10 sm:py-12 2xl:px-14 2xl:py-14">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink">
            <Wallet className="h-3.5 w-3.5" /> Ijaraga beruvchi
          </p>
          <StepList steps={OWNER_STEPS} />
          <Link to={links.post} className="mt-9 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-[13px] font-extrabold uppercase tracking-[0.05em] text-ink">
            <Plus className="h-4 w-4" /> E’lon joylash
          </Link>
        </div>
      </div>
    </section>
  )
}

function OwnerBanner() {
  const links = useRentLinks()
  return (
    <section className="mx-auto max-w-[1600px] px-3 pt-16 sm:px-6 sm:pt-24">
      <div className="relative overflow-hidden rounded-[28px] bg-[#1d2229] px-6 py-12 sm:rounded-[40px] sm:px-12 sm:py-16 lg:px-14 2xl:px-20 2xl:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full bg-brand/90 sm:h-[460px] sm:w-[460px] lg:-right-10 lg:-top-32" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="text-[30px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[42px] 2xl:text-[56px]">
              Skuteringiz bekor turibdimi?
            </h2>
            <p className="mt-4 max-w-[520px] text-[15px] leading-[1.55] text-white/70 sm:text-[17px] 2xl:text-[20px]">
              Ijaraga bering — e’lon joylash bepul. Narx, muddat va garovni o‘zingiz belgilaysiz, mijozlar o‘zi qo‘ng‘iroq qiladi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={links.post} className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-8 text-[13px] font-extrabold uppercase tracking-[0.05em] text-ink transition hover:bg-[#5ee3eb]">
                <Plus className="h-4 w-4" /> E’lon joylash
              </Link>
              <span className="inline-flex h-12 items-center gap-2 rounded-full px-2 text-[14px] font-semibold text-white/70">
                <ShieldCheck className="h-4 w-4 text-brand" /> Har bir e’lon moderatsiyadan o‘tadi
              </span>
            </div>
          </div>
          <img src="/rent/bike.webp" alt="TaxiLine velosipedi" width={720} height={421} loading="lazy" draggable={false} className="relative mx-auto h-auto w-full max-w-[520px] select-none drop-shadow-[0_26px_22px_rgba(0,0,0,0.4)]" />
        </div>
      </div>
    </section>
  )
}

function RentFaq() {
  const [open, setOpen] = useState(0)
  return (
    <section id="savollar" className="mx-auto max-w-[1600px] scroll-mt-24 px-3 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div className="px-2 sm:px-4 lg:px-8">
        <SectionTitle eyebrow="Savol-javob" title="Ijara haqida savollar" />
        <div className="mt-6">
          {RENT_FAQ.map((item, i) => (
            <FaqItem key={item.q} id={`rent-faq-${i}`} item={item} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function ScooterRent() {
  useSeo('/skuter-ijara')
  useJsonLd('breadcrumb', breadcrumbJsonLd('/skuter-ijara', 'Skuter ijara'))
  const { data, isLoading } = useRentals()
  const listings = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const counts = useMemo(() => {
    const out = {}
    for (const l of listings) out[l.vehicleType] = (out[l.vehicleType] || 0) + 1
    return out
  }, [listings])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-svh bg-white text-ink">
      <SiteHeader floating />
      <main>
        <Hero total={listings.length} />
        <VehicleTypes counts={counts} />
        <Listings listings={listings} isLoading={isLoading} />
        <HowItWorks />
        <OwnerBanner />
        <RentFaq />
      </main>
      <SiteFooter attached />
      <ScrollTopButton />
    </div>
  )
}
