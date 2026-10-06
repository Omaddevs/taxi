import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bike,
  Car,
  Check,
  ChevronDown,
  Clock,
  Coins,
  Gift,
  Headphones,
  LogIn,
  Menu,
  Package,
  PartyPopper,
  RefreshCw,
  Route,
  Send,
  ShieldCheck,
  Truck,
  User,
  X,
} from 'lucide-react'
import { TELEGRAM_BOT } from '../components/auth/AuthChrome'
import { ScrollTopButton, SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import { Regions } from '../components/landing/Regions'
import { Logo, Wordmark } from '../components/ui/Logo'
import { useAuth } from '../context/AuthContext'
import { faqs } from '../data/mock'
import { api } from '../lib/api'
import { homePathForRole } from '../lib/role'
import { isCompletePhoneUz, maskLocalPhoneUz, maskPhoneUz, toE164Uz } from '../lib/utils'

// `highlight` — ajralib turadigan band.
const NAV = [
  { href: '#join', label: 'Haydovchi bo‘lish' },
  { href: '/news', label: 'Yangiliklar' },
  { href: '#promos', label: 'Aksiyalar' },
  { href: '#random', label: 'Random mijoz', highlight: true },
]

const FEATURES = [
  { icon: Banknote, title: 'Yuqori daromad', text: 'Faol ishlasangiz oyiga 8 mln so‘mdan ortiq topasiz!', tone: 'brand' },
  { icon: Coins, title: 'Bonuslar siz uchun', text: 'Qulay shartlar, bonuslar va qo‘shimcha to‘lovlar', tone: 'light' },
  { icon: ShieldCheck, title: 'Xavfsiz safar', text: 'Tasdiqlangan haydovchilar, SOS va jonli kuzatuv', tone: 'brand' },
  { icon: Route, title: 'Shaharlar aro', text: 'Viloyatlar bo‘ylab ikki tomonlama yo‘nalishlar', tone: 'light' },
  { icon: Package, title: 'Yuk va pochta', text: 'Posilkalarni yo‘lovchi bilan birga yetkazing', tone: 'brand' },
  { icon: Headphones, title: '24/7 yordam', text: 'Qo‘llab-quvvatlash kecha-kunduz aloqada', tone: 'light' },
]

function CarImage({ className = '', sizes = '(min-width: 1024px) 720px, 100vw' }) {
  return (
    <picture>
      <source type="image/webp" srcSet="/landing/taxi-car-sm.webp 520w, /landing/taxi-car.webp 1400w" sizes={sizes} />
      <img
        src="/landing/taxi-car.png"
        alt="TaxiLine avtomobili"
        width={2017}
        height={694}
        fetchPriority="high"
        className={`select-none ${className}`}
        draggable={false}
      />
    </picture>
  )
}

function NavLinks({ onNavigate, className = '', desktop = false }) {
  return NAV.map((item) =>
    item.highlight ? (
      <a
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={
          desktop
            ? 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/30 px-3.5 py-1.5 text-[14px] font-bold text-ink ring-1 ring-ink/10 transition hover:bg-white/50 2xl:text-[16px]'
            : `${className} flex items-center gap-2`
        }
      >
        <Gift className="h-4 w-4" /> {item.label}
      </a>
    ) : (
      <a
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={className}
      >
        {item.label}
      </a>
    ),
  )
}

function FeatureCard({ icon: Icon, title, text, tone }) {
  const brand = tone === 'brand'
  return (
    <article
      className={`flex h-[214px] w-[158px] shrink-0 snap-start flex-col rounded-[16px] p-5 sm:h-[226px] sm:w-[168px] 2xl:h-[290px] 2xl:w-[216px] 2xl:rounded-[20px] 2xl:p-6 ${
        brand ? 'bg-brand' : 'bg-white'
      } text-ink`}
    >
      <Icon className={`h-9 w-9 ${brand ? 'text-ink' : 'text-brand'}`} strokeWidth={1.7} />
      <h3 className="mt-auto text-[18px] font-extrabold leading-[1.15] 2xl:text-[23px] tracking-tight">{title}</h3>
      <p className={`mt-2.5 text-[12px] leading-[1.4] 2xl:text-[14px] ${brand ? 'text-ink/85' : 'text-ink/70'}`}>{text}</p>
    </article>
  )
}

const DOTS = 4

function Showcase() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState(maskPhoneUz('+998'))
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState(0)
  const scroller = useRef(null)

  function onSubmit(e) {
    e.preventDefault()
    navigate('/register', { state: { phone: isCompletePhoneUz(phone) ? phone : undefined } })
  }

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

  function next() {
    goTo(active >= DOTS - 1 ? 0 : active + 1)
  }

  const dots = (
    <div className="flex gap-4 sm:gap-5">
      {Array.from({ length: DOTS }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => goTo(i)}
          aria-label={`${i + 1}-sahifa`}
          className="flex h-5 items-center"
        >
          <span className={`block h-[3px] w-12 rounded-full transition-colors sm:w-16 ${i === active ? 'bg-brand' : 'bg-white/15'}`} />
        </button>
      ))}
    </div>
  )

  return (
    <section className="mx-auto max-w-[1600px] px-3 pt-3 sm:px-6 sm:pt-6">
      <div className="relative overflow-hidden rounded-[28px] bg-[#f3f4f6] sm:rounded-[40px]">
        {/* ── Yuqori qism: oq va teal panellar ── */}
        <div className="relative grid lg:grid-cols-2">
          <div className="relative px-5 pb-2 pt-5 sm:px-10 sm:pt-8 lg:px-14 lg:pb-[230px] lg:pt-10 2xl:px-20 2xl:pb-[300px] 2xl:pt-14">
            {/* Fondagi katta "T" harfi (TaxiLine) */}
            <svg
              aria-hidden="true"
              viewBox="0 0 600 600"
              className="pointer-events-none absolute -left-10 top-0 w-[460px] sm:w-[600px] lg:-left-14 lg:-top-2 lg:w-[680px] 2xl:w-[820px]"
            >
              <path d="M40 150 H 560 M300 150 V 700" fill="none" stroke="#e7e9ed" strokeWidth="110" strokeLinecap="butt" />
            </svg>

            <div className="relative z-30 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2.5 2xl:gap-3" aria-label="TaxiLine">
                {/* Ekran o‘lchamiga qarab: 40 → 48 → 56px; yozuv belgining ~52% balandligida */}
                <Logo size={40} className="sm:h-12! sm:w-12! 2xl:h-14! 2xl:w-14!" />
                <Wordmark className="text-[21px] sm:text-[25px] 2xl:text-[29px]" />
              </Link>
              <div className="flex items-center gap-1.5 lg:hidden">
                <Link
                  to="/login"
                  className="spin-border flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-extrabold text-white"
                >
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
                <NavLinks
                  onNavigate={() => setMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-[15px] font-bold text-ink hover:bg-canvas"
                />
                <Link to="/register" className="block rounded-xl px-4 py-3 text-[15px] font-extrabold text-brand-dark hover:bg-canvas">
                  Ro‘yxatdan o‘tish
                </Link>
              </div>
            ) : null}

            <h1 className="relative mt-12 text-[38px] font-extrabold leading-[1.08] tracking-tight text-ink sm:mt-16 sm:text-[52px] lg:mt-[92px] lg:text-[54px] xl:text-[60px] 2xl:mt-[120px] 2xl:text-[78px]">
              Viloyatlararo
              <br />
              qulay taxi
            </h1>

            <div className="relative z-20 -mx-3 -mb-16 mt-4 sm:mx-6 sm:-mb-24 lg:hidden">
              <CarImage className="h-auto w-full drop-shadow-[0_22px_18px_rgba(15,29,42,0.28)]" sizes="100vw" />
            </div>
          </div>

          <div className="relative overflow-hidden bg-brand px-5 pb-16 pt-24 sm:px-10 sm:pt-32 lg:overflow-visible lg:px-10 lg:pb-[170px] lg:pt-10 xl:px-14 2xl:px-20 2xl:pb-[220px] 2xl:pt-14">
            {/* Fondagi katta "T" va "7" shakllari */}
            <svg
              aria-hidden="true"
              viewBox="0 0 600 600"
              className="pointer-events-none absolute -right-16 top-6 w-[460px] sm:w-[560px] lg:-right-10 lg:top-10 lg:w-[640px]"
            >
              <path d="M40 80 H 330 M185 80 V 600" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="92" />
              <path d="M330 80 H 600 L 420 600" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="92" strokeLinejoin="miter" />
            </svg>

            <nav className="relative z-30 hidden items-center justify-end gap-5 lg:flex xl:gap-7">
              <NavLinks desktop className="whitespace-nowrap text-[14px] font-semibold text-ink/90 transition 2xl:text-[16px] hover:text-ink hover:underline hover:underline-offset-4" />
              <Link
                to="/login"
                className="spin-border flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-[13px] font-extrabold text-white shadow-[0_8px_18px_rgba(15,29,42,0.25)] transition hover:bg-[#0f1d2a]"
              >
                <LogIn className="h-4 w-4" /> Kirish
              </Link>
            </nav>

            <h2 className="relative text-[32px] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[44px] lg:mt-[92px] lg:text-[38px] xl:text-[44px] 2xl:mt-[120px] 2xl:text-[64px]">
              Har bir safarda
              <br />
              qulaylik va ishonch
            </h2>
            <p className="relative mt-4 text-[15px] leading-[1.5] text-ink/85 sm:text-[17px] 2xl:text-[21px]">
              platformada buyurtmalarni bajaring
              <br />
              va daromad oling!
            </p>

            <form onSubmit={onSubmit} className="relative mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex h-12 items-center gap-2 rounded-full bg-white px-5 text-[15px] ring-2 ring-transparent transition focus-within:ring-ink/20 sm:w-[250px] lg:w-[220px] xl:w-[260px] 2xl:h-14 2xl:w-[320px] 2xl:text-[17px]">
                <span className="font-semibold text-ink">+998</span>
                <input
                  value={maskLocalPhoneUz(phone)}
                  onChange={(e) => setPhone(maskPhoneUz(e.target.value))}
                  placeholder="Telefon raqam"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={12}
                  aria-label="Telefon raqam"
                  className="min-w-0 flex-1 bg-transparent font-semibold tracking-wide text-ink outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400"
                />
              </label>
              <button
                type="submit"
                className="spin-border h-12 whitespace-nowrap rounded-full bg-ink px-8 text-[14px] font-bold uppercase tracking-[0.03em] text-white lg:px-6 xl:px-8 shadow-[0_10px_20px_rgba(15,29,42,0.25)] transition hover:bg-[#0f1d2a] 2xl:h-14 2xl:px-10 2xl:text-[16px]"
              >
                Ariza qoldirish
              </button>
            </form>
          </div>
        </div>

        {/* ── Pastki qorong‘i blok — "nega bizni tanlashadi" ── */}
        <div id="why" className="relative z-10 -mt-8 scroll-mt-24 rounded-[28px] bg-[#1d2229] sm:-mt-10 sm:rounded-[40px]">
          <div className="pointer-events-none absolute bottom-[calc(100%-28px)] left-[3%] z-20 hidden w-[46%] lg:block">
            <CarImage className="h-auto w-full drop-shadow-[0_26px_22px_rgba(0,0,0,0.35)]" sizes="560px" />
          </div>

          <div className="grid gap-9 px-5 pb-8 pt-12 sm:px-10 sm:pb-12 sm:pt-16 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 lg:px-14 lg:pb-16 lg:pt-24 2xl:px-20 2xl:pb-20 2xl:pt-32">
            <div className="min-w-0">
              <h2 className="text-[30px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[40px] xl:text-[46px] 2xl:text-[60px]">
                Aytib beramiz, nega
                <br />
                bizni tanlashadi
              </h2>
              <p className="mt-4 text-[15px] leading-[1.5] text-white/75 sm:text-[17px] 2xl:text-[21px]">
                afzalliklarimizni kartalarga jamladik,
                <br className="hidden sm:block" /> strelkani bosib varaqlang
              </p>
              <Link
                to="/register"
                className="mt-8 inline-flex h-12 items-center rounded-full bg-brand px-8 text-[12px] font-extrabold uppercase tracking-[0.06em] text-ink transition hover:bg-[#5ee3eb]"
              >
                Ro‘yxatdan o‘tish
              </Link>
              <div className="mt-14 hidden lg:block">{dots}</div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-3 lg:gap-5">
                <div
                  ref={scroller}
                  onScroll={onScroll}
                  className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto sm:gap-4 lg:w-[352px] lg:flex-none 2xl:w-[452px] 2xl:gap-5"
                >
                  {FEATURES.map((f) => (
                    <FeatureCard key={f.title} {...f} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={next}
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

function Steps() {
  return (
    <ol className="mt-9 space-y-7 sm:mt-10">
      <li className="flex gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[16px] font-bold text-ink">1</span>
        <div>
          <h3 className="break-words text-[19px] font-extrabold leading-[1.15] tracking-tight text-ink min-[400px]:text-[21px] sm:text-[24px] 2xl:text-[30px]">
            Onlayn ro‘yxatdan
            <br />
            o‘ting
          </h3>
          <p className="mt-2.5 text-[14px] leading-[1.45] text-ink/75 2xl:text-[17px]">
            Shunchaki oddiy formani
            <br />
            <span className="inline-flex items-center gap-2">
              to‘ldiring
              <ArrowRight className="h-4 w-7 text-ink" strokeWidth={1.6} />
            </span>
          </p>
        </div>
      </li>
      <li className="flex gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[16px] font-bold text-ink">2</span>
        <div>
          <h3 className="break-words text-[19px] font-extrabold leading-[1.15] tracking-tight text-ink min-[400px]:text-[21px] sm:text-[24px] 2xl:text-[30px]">
            Ilovani telefoningizga
            <br />
            o‘rnating
          </h3>
          <p className="mt-2.5 text-[14px] leading-[1.45] text-ink/75 2xl:text-[17px]">
            O‘rnating:{' '}
            <a href="/" className="font-extrabold text-ink underline underline-offset-2">
              TaxiLine
            </a>
            <br />
            va{' '}
            <a
              href="https://t.me/taxilines_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold text-ink underline underline-offset-2"
            >
              Telegram bot
            </a>
          </p>
        </div>
      </li>
      <li className="flex gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[16px] font-bold text-ink">3</span>
        <div>
          <h3 className="break-words text-[19px] font-extrabold leading-[1.15] tracking-tight text-ink min-[400px]:text-[21px] sm:text-[24px] 2xl:text-[30px]">
            Bugunoq ishlashni
            <br />
            boshlang!
          </h3>
          <p className="mt-2.5 text-[14px] leading-[1.45] text-ink/75 2xl:text-[17px]">
            Qancha ko‘p safar qilsangiz,
            <br />
            daromadingiz shuncha ko‘p bo‘ladi
          </p>
        </div>
      </li>
    </ol>
  )
}

const FIELD =
  'h-12 w-full rounded-full bg-white px-5 text-[14px] font-medium text-ink outline-none ring-1 ring-transparent transition placeholder:text-slate-400 focus:ring-2 focus:ring-ink/25 2xl:h-14 2xl:px-6 2xl:text-[16px]'

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Haydovchi', hint: 'Yo‘lovchi tashib daromad qiling', icon: Car },
  { value: 'courier', label: 'Kuryer / pochta', hint: 'Posilka va yuk yetkazing', icon: Package },
  { value: 'passenger', label: 'Yo‘lovchi', hint: 'Safar va yetkazib berish buyurtma qiling', icon: User },
]

/* Brauzerning oddiy <select> o‘rniga dizaynga mos ochiladigan ro‘yxat (WAI-ARIA combobox/listbox). */
function RoleSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const rootRef = useRef(null)
  const listId = 'role-listbox'
  const selected = ROLE_OPTIONS.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return undefined
    function onDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  function openList() {
    setHi(Math.max(0, ROLE_OPTIONS.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  function choose(i) {
    onChange(ROLE_OPTIONS[i].value)
    setOpen(false)
  }

  function onKeyDown(e) {
    const last = ROLE_OPTIONS.length - 1
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    if (e.key === 'ArrowDown') setHi((h) => (h >= last ? 0 : h + 1))
    else if (e.key === 'ArrowUp') setHi((h) => (h <= 0 ? last : h - 1))
    else if (e.key === 'Home') setHi(0)
    else if (e.key === 'End') setHi(last)
    else if (e.key === 'Enter' || e.key === ' ') choose(hi)
    else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false)
      return
    } else return
    e.preventDefault()
  }

  const SelIcon = selected?.icon

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Faoliyat turi"
        aria-activedescendant={open ? `${listId}-${hi}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`${FIELD} flex items-center gap-3 pr-4 text-left ${open ? 'ring-2 ring-ink/25' : ''}`}
      >
        {SelIcon ? (
          <span className="-ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark 2xl:h-9 2xl:w-9">
            <SelIcon className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : null}
        <span className={`min-w-0 flex-1 truncate ${selected ? 'font-semibold text-ink' : 'font-normal text-slate-400'}`}>
          {selected ? selected.label : 'Faoliyat turi'}
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-ink transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} />
      </button>

      <ul
        id={listId}
        role="listbox"
        aria-label="Faoliyat turi"
        className={`absolute inset-x-0 top-[calc(100%+8px)] z-40 origin-top rounded-[22px] bg-white p-2 shadow-[0_24px_48px_-12px_rgba(15,29,42,0.35)] ring-1 ring-black/5 transition duration-200 ease-out ${
          open ? 'visible scale-100 opacity-100' : 'invisible -translate-y-1 scale-[0.98] opacity-0'
        }`}
      >
        {ROLE_OPTIONS.map((o, i) => {
          const Icon = o.icon
          const isSel = o.value === value
          return (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={isSel}
              onPointerEnter={() => setHi(i)}
              onClick={() => choose(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
                hi === i ? 'bg-[#f3f4f6]' : ''
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isSel ? 'bg-brand text-ink' : 'bg-brand-soft text-brand-dark'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-ink 2xl:text-[16px]">{o.label}</span>
                <span className="block truncate text-[12px] text-ink/60 2xl:text-[13px]">{o.hint}</span>
              </span>
              <Check className={`h-5 w-5 shrink-0 text-brand-dark transition-opacity ${isSel ? 'opacity-100' : 'opacity-0'}`} strokeWidth={2.4} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function JoinForm() {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState(maskPhoneUz('+998'))
  const [role, setRole] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(null)

  // Ariza admin paneldagi "Lidlar" bo‘limiga tushadi (manba: Sayt formasi).
  async function onSubmit(e) {
    e.preventDefault()
    if (name.trim().length < 2) {
      setError('Ism va familiyangizni kiriting')
      return
    }
    if (!isCompletePhoneUz(phone)) {
      setError('Telefon raqamini to‘liq kiriting')
      return
    }
    setError('')
    setSending(true)
    try {
      await api.post('/leads', {
        name: name.trim(),
        phone: toE164Uz(phone),
        city: city.trim() || undefined,
        activity: role || 'driver',
      })
      setSent({ name: name.trim().split(' ')[0], phone })
    } catch (err) {
      setError(err.message || 'Arizani yuborib bo‘lmadi. Qayta urinib ko‘ring.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="relative z-10 flex min-w-0 flex-col items-center rounded-[32px] bg-brand px-6 pb-10 pt-12 text-center sm:rounded-[40px] sm:px-9 2xl:px-12 2xl:py-16">
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-brand-dark shadow-[0_18px_40px_-12px_rgba(15,29,42,0.35)]">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/50 [animation-duration:2.2s]" />
          <Check className="relative h-9 w-9" strokeWidth={3} />
        </span>
        <h3 className="mt-7 text-[26px] font-extrabold tracking-tight text-ink 2xl:text-[32px]">Arizangiz qabul qilindi!</h3>
        <p className="mt-3 max-w-[340px] text-[15px] leading-[1.55] text-ink/85 2xl:text-[17px]">
          Rahmat, {sent.name}! Operatorimiz tez orada <b className="whitespace-nowrap font-extrabold text-ink">{sent.phone}</b> raqamiga qo‘ng‘iroq
          qiladi.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3">
          <Link
            to="/register"
            state={{ name, phone }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1d2229] text-[13px] font-extrabold uppercase tracking-[0.05em] text-white transition hover:bg-black 2xl:h-14 2xl:text-[14px]"
          >
            Hoziroq ilovaga kirish <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setSent(null)
              setName('')
              setCity('')
              setPhone(maskPhoneUz('+998'))
              setRole('')
            }}
            className="text-[14px] font-bold text-ink/70 underline-offset-4 hover:text-ink hover:underline"
          >
            Yana ariza yuborish
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="relative z-10 min-w-0 rounded-[32px] bg-brand px-5 pb-8 pt-9 min-[400px]:px-6 sm:rounded-[40px] sm:px-9 sm:pb-10 sm:pt-11 2xl:px-12 2xl:pb-12 2xl:pt-14">
      <h3 className="text-[24px] font-extrabold tracking-tight text-ink 2xl:text-[32px]">Ro‘yxatdan o‘tish</h3>
      <p className="mt-2 text-[14px] leading-[1.45] text-ink/85 2xl:text-[17px]">
        Oddiy formamizni to‘ldiring,
        <br />
        biz albatta siz bilan bog‘lanamiz!
      </p>

      <div className="mt-8 space-y-3.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ism familiya" autoComplete="name" aria-label="Ism familiya" className={FIELD} />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Shahar" autoComplete="address-level2" aria-label="Shahar" className={FIELD} />
        <label className={`${FIELD} flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-ink/25`}>
          <span className={isCompletePhoneUz(phone) || phone.length > 5 ? 'text-ink' : 'text-slate-400'}>+998</span>
          <input
            value={maskLocalPhoneUz(phone)}
            onChange={(e) => setPhone(maskPhoneUz(e.target.value))}
            placeholder="Telefon raqam"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={12}
            aria-label="Telefon raqam"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
          />
        </label>
        <RoleSelect value={role} onChange={setRole} />
      </div>

      {error ? <p className="mt-3 rounded-2xl bg-white/25 px-4 py-2 text-[13px] font-bold text-ink">{error}</p> : null}

      <button
        type="submit"
        disabled={sending}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1d2229] text-[12px] font-extrabold uppercase tracking-[0.06em] text-white transition hover:bg-black disabled:opacity-70 2xl:h-14 2xl:text-[14px]"
      >
        {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
        {sending ? 'Yuborilmoqda…' : 'Ariza yuborish'}
      </button>
    </form>
  )
}

/* Qadamlar ostidan boshlanib, pastdagi qorong‘i panelga qo‘shilib ketadigan perspektivali yo‘l:
   chapda uzoqda ingichka, o‘ngga kelgan sari kengayadi. Shakl 1000×200 koordinatada hisoblangan. */
const ROAD = 'M20 52.4 24 49.7 28 47.1 32 44.6 37 42.3 42 40.1 47 38.0 52 36.1 58 34.3 63 32.6 69 31.1 75 29.7 82 28.3 88 27.2 95 26.1 102 25.1 109 24.3 116 23.5 124 22.9 131 22.3 139 21.9 147 21.5 155 21.3 163 21.2 171 21.1 180 21.1 188 21.2 197 21.4 205 21.7 214 22.0 223 22.5 232 22.9 241 23.5 250 24.1 263 25.2 276 26.4 289 27.7 302 29.1 315 30.7 328 32.5 340 34.3 352 36.3 364 38.4 376 40.6 388 42.9 399 45.4 411 47.9 422 50.6 433 53.4 444 56.3 454 59.4 465 62.5 475 65.7 485 69.1 495 72.5 505 76.1 514 79.7 524 83.5 533 87.4 542 91.3 551 95.3 560 99.5 568 103.7 577 108.0 585 112.4 593 116.9 601 121.4 605 124.3 610 127.3 614 130.2 618 133.2 622 136.1 626 139.1 629 142.0 633 145.0 636 147.9 638 150.9 641 153.8 644 156.7 646 159.7 648 162.6 650 165.6 652 168.5 654 171.5 655 174.5 657 177.5 658 180.6 659 183.7 661 186.9 662 190.1 663 193.4 664 196.7 664 200.2 665 203.7 666 207.3 666 211.1 666 214.9 667 218.8 667 222.9 667 227.4 L733 220.6 732 215.4 731 209.9 730 204.4 729 199.0 727 193.7 726 188.4 724 183.2 722 178.1 720 173.0 718 168.0 716 163.1 713 158.2 711 153.5 708 148.8 705 144.2 702 139.7 699 135.3 695 131.0 692 126.9 688 122.8 684 118.8 680 114.9 675 111.2 671 107.5 666 104.0 661 100.5 657 97.1 651 93.8 646 90.7 641 87.5 635 84.5 629 81.5 623 78.6 614 74.5 605 70.5 596 66.7 586 63.0 577 59.4 567 55.9 557 52.6 547 49.3 537 46.2 527 43.2 516 40.3 506 37.6 495 34.9 484 32.4 473 30.0 462 27.8 451 25.6 439 23.6 428 21.6 416 19.9 404 18.2 392 16.6 380 15.2 368 13.9 355 12.8 343 11.7 330 10.8 317 10.0 304 9.3 291 8.8 277 8.3 264 8.0 250 7.9 241 7.8 232 7.8 223 7.9 214 8.0 205 8.2 197 8.4 188 8.7 179 9.1 171 9.5 163 10.0 154 10.5 146 11.2 138 11.9 131 12.7 123 13.6 115 14.6 108 15.7 101 16.8 94 18.1 87 19.5 80 20.9 74 22.5 67 24.2 61 26.0 55 27.9 50 29.9 44 32.0 39 34.3 34 36.7 29 39.2 25 41.9 20 44.7 16 47.6Z'
const ROAD_EDGE_A = 'M19 51.7 23 48.9 27 46.2 32 43.7 36 41.4 41 39.2 46 37.1 52 35.1 57 33.3 63 31.6 69 30.0 75 28.5 82 27.2 88 25.9 95 24.8 102 23.8 109 22.9 116 22.1 124 21.4 131 20.8 139 20.3 147 19.9 155 19.6 163 19.4 171 19.2 180 19.2 188 19.2 197 19.3 205 19.5 214 19.8 223 20.1 232 20.5 241 21.0 250 21.5 263 22.4 277 23.5 290 24.7 303 26.0 315 27.4 328 29.0 341 30.7 353 32.5 365 34.4 377 36.5 389 38.7 400 41.0 412 43.4 423 46.0 434 48.6 445 51.4 456 54.3 466 57.3 477 60.4 487 63.6 497 66.9 507 70.4 516 73.9 526 77.5 535 81.3 545 85.1 554 89.0 563 93.1 571 97.2 580 101.4 588 105.7 596 110.1 604 114.6 609 117.5 614 120.4 618 123.4 623 126.4 627 129.4 631 132.4 634 135.4 638 138.4 641 141.5 644 144.5 647 147.6 650 150.7 653 153.8 655 156.9 657 160.0 659 163.2 661 166.4 663 169.6 665 172.9 667 176.2 668 179.6 669 183.0 671 186.5 672 190.1 673 193.7 674 197.5 675 201.3 675 205.2 676 209.1 677 213.2 677 217.4 677 221.7 678 226.3'
const ROAD_EDGE_B = 'M17 48.3 21 45.5 25 42.7 30 40.1 34 37.6 39 35.2 45 33.0 50 30.9 56 28.9 62 27.0 68 25.3 74 23.6 80 22.1 87 20.7 94 19.4 101 18.2 108 17.1 116 16.0 123 15.1 131 14.3 139 13.5 146 12.9 155 12.3 163 11.8 171 11.3 179 11.0 188 10.7 197 10.5 205 10.3 214 10.2 223 10.2 232 10.2 241 10.3 250 10.5 264 10.8 277 11.2 291 11.8 304 12.5 317 13.3 330 14.2 342 15.3 355 16.5 367 17.8 379 19.3 392 20.8 403 22.5 415 24.3 427 26.3 438 28.3 450 30.5 461 32.8 472 35.2 483 37.8 493 40.4 504 43.2 514 46.1 525 49.1 535 52.2 545 55.4 555 58.8 564 62.2 574 65.8 583 69.5 593 73.3 602 77.2 611 81.3 620 85.4 626 88.4 631 91.3 636 94.4 642 97.5 647 100.6 652 103.8 656 107.1 661 110.5 665 114.0 669 117.5 673 121.2 677 124.9 681 128.7 685 132.6 688 136.6 691 140.6 694 144.8 697 149.0 700 153.4 702 157.8 705 162.3 707 166.9 709 171.5 711 176.3 713 181.1 715 185.9 716 190.9 717 195.9 719 201.0 720 206.1 721 211.3 722 216.6 722 221.7'

function RoadBand() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative mt-8 h-[90px] sm:mt-6 sm:h-[140px] lg:mt-6 lg:h-[170px] 2xl:h-[200px]">
      <svg viewBox="0 0 1000 200" preserveAspectRatio="none" overflow="visible" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="road-fade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#3a4250" />
            <stop offset="0.35" stopColor="#1d2229" />
          </linearGradient>
        </defs>
        <path d={ROAD} fill="url(#road-fade)" />
        <path d={ROAD_EDGE_A} fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        <path d={ROAD_EDGE_B} fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <img
        src="/landing/taxi-car-sm.webp"
        alt=""
        className="absolute left-[24.1%] top-[7.8%] w-[30px] -translate-x-1/2 -translate-y-[78%] rotate-[2deg] drop-shadow-[0_4px_3px_rgba(0,0,0,0.35)] sm:w-[44px] 2xl:w-[52px]"
      />
      <img
        src="/landing/taxi-car-sm.webp"
        alt=""
        className="absolute left-[45.8%] top-[21.8%] w-[52px] -translate-x-1/2 -translate-y-[72%] rotate-[10deg] drop-shadow-[0_6px_5px_rgba(0,0,0,0.35)] sm:w-[78px] 2xl:w-[92px]"
      />
    </div>
  )
}

function Join() {
  return (
    <section id="join" className="mx-auto max-w-[1600px] scroll-mt-24 px-3 pt-16 sm:px-6 sm:pt-24">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 px-2 sm:px-6 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-14 lg:px-14 2xl:grid-cols-[1fr_minmax(0,560px)] 2xl:px-20">
        <div className="min-w-0">
          <h2 className="text-[34px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[44px] lg:text-[48px] 2xl:text-[64px]">
            Haydovchi bo‘ling
            <br />
            bugunoq!
          </h2>
          <Steps />
        </div>
        <JoinForm />
      </div>
      <RoadBand />
    </section>
  )
}

function ScreenPhone({ src, alt, className = '' }) {
  return (
    <div className={`rounded-[30px] bg-white p-[5px] shadow-[0_30px_60px_rgba(0,0,0,0.45)] ${className}`}>
      <img src={src} alt={alt} className="block w-full rounded-[26px]" draggable={false} />
    </div>
  )
}

function Earn() {
  return (
    <section id="earn" className="mx-auto max-w-[1600px] scroll-mt-24 px-3 pb-16 sm:px-6">
      <div className="relative -mt-1 overflow-hidden rounded-[32px] bg-[#1d2229] text-white sm:rounded-[40px]">
        {/* O‘ng yuqori burchakdagi teal va qora doiralar */}
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-36 h-[420px] w-[420px] rounded-full bg-brand sm:-bottom-56 sm:h-[560px] sm:w-[560px] lg:bottom-auto lg:-right-24 lg:-top-44" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-16 hidden h-[260px] w-[260px] rounded-full bg-[#111418] lg:-right-2 lg:-top-20 lg:block" />

        <div className="relative grid lg:grid-cols-[1.15fr_1fr]">
          <div className="px-6 pt-12 sm:px-10 sm:pt-16 lg:px-14 lg:py-24 2xl:px-20 2xl:py-32">
            <h2 className="text-[32px] font-extrabold leading-[1.1] tracking-tight sm:text-[44px] xl:text-[50px] 2xl:text-[66px]">
              Kuniga 1 mln gacha
              <br />
              <span className="whitespace-nowrap">
                ishlang{' '}
                <span className="relative -top-1.5 ml-1 inline-block rounded-[10px] bg-brand px-4 py-1.5 align-middle text-[13px] font-bold tracking-normal text-ink sm:text-[15px]">
                  kuryerlarga
                </span>
              </span>
            </h2>
            <p className="mt-4 max-w-[520px] text-[15px] leading-[1.5] text-white/85 sm:text-[17px] 2xl:max-w-[640px] 2xl:text-[21px]">
              Mijozlardan kichik yuk va posilkalarni o‘zingizga qulay transportda TaxiLine Pochta bilan yetkazing
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {[
                { icon: Car, label: 'mashina' },
                { icon: Bike, label: 'velosiped' },
                { icon: Truck, label: 'yuk mashina' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex h-11 items-center gap-2.5 rounded-[12px] bg-white/[0.08] px-4 text-[13px] font-semibold">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                  {label}
                </span>
              ))}
            </div>
            <Link
              to="/register"
              className="mt-10 inline-flex items-center gap-4 text-[13px] font-extrabold uppercase tracking-[0.06em] text-brand transition-[gap] hover:gap-5"
            >
              Batafsil bilish
              <svg viewBox="0 0 36 12" className="h-3 w-9" aria-hidden="true">
                <path d="M0 6h33M28 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </Link>
          </div>

          <div className="relative h-[420px] sm:h-[480px] lg:h-auto">
            <div className="absolute left-[44%] top-12 rotate-[9deg] sm:left-[46%] lg:left-[40%] lg:top-14">
              <ScreenPhone src="/landing/app-login.webp" alt="TaxiLine — kirish ekrani" className="w-[190px] sm:w-[230px] 2xl:w-[290px]" />
            </div>
            <div className="absolute left-[6%] top-6 rotate-[4deg] sm:left-[14%] lg:left-0 lg:top-8">
              <ScreenPhone src="/landing/app-delivery.webp" alt="TaxiLine — yetkazib berish ekrani" className="w-[200px] sm:w-[240px] 2xl:w-[300px]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* Biznes bo‘limidagi aloqa ma’lumotlari — Yordam sahifasidagi rasmiy raqam.
   Ofis manzili va ish vaqti tasdiqlangach, shu yerga qo‘shib "Joylashuv" kartasini qaytarish mumkin. */
const OFFICE = {
  phones: [{ label: '+998 87 735 36 36', href: 'tel:+998877353636' }],
}

function InfoCard({ title, children, art }) {
  return (
    <article className="relative flex min-h-[150px] items-center overflow-hidden rounded-[24px] bg-[#f3f4f6] py-6 pl-6 pr-[130px] sm:min-h-[170px] sm:rounded-[28px] sm:py-8 sm:pl-9 sm:pr-[200px] 2xl:min-h-[210px] 2xl:pr-[250px]">
      <div className="relative z-10">
        <h3 className="text-[21px] font-extrabold leading-tight tracking-tight text-ink sm:text-[26px] 2xl:text-[32px]">{title}</h3>
        <div className="mt-2 text-[14px] leading-[1.5] text-ink/85 sm:text-[15px] 2xl:text-[18px]">{children}</div>
      </div>
      <div className="pointer-events-none absolute right-3 top-1/2 w-[120px] -translate-y-1/2 sm:right-5 sm:w-[180px] 2xl:w-[220px]">{art}</div>
    </article>
  )
}

function ServiceCard({ title, text, art }) {
  return (
    <article className="relative flex min-h-[220px] flex-col justify-center overflow-hidden rounded-[24px] bg-brand py-7 pl-6 pr-[140px] sm:min-h-[250px] sm:rounded-[28px] sm:py-9 sm:pl-9 sm:pr-[230px] lg:flex-1 2xl:pr-[290px]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
      <div className="relative z-10">
        <h3 className="text-[22px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px] 2xl:text-[34px]">{title}</h3>
        <p className="mt-2 max-w-[260px] text-[14px] leading-[1.5] text-ink/85 sm:text-[15px] 2xl:max-w-[320px] 2xl:text-[18px]">{text}</p>
        <Link
          to="/register"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-white px-7 text-[13px] font-bold text-ink shadow-[0_6px_16px_rgba(15,29,42,0.12)] transition hover:bg-ink hover:text-white 2xl:h-12 2xl:px-8 2xl:text-[15px]"
        >
          maxsus tartib
        </Link>
      </div>
      <div className="pointer-events-none absolute right-2 top-1/2 w-[140px] -translate-y-1/2 sm:right-4 sm:w-[220px] 2xl:w-[270px]">{art}</div>
    </article>
  )
}

/* Avtomobil ko‘rigi: taksimiz + "tasdiqlangan" belgisi va nur chiziqlari */
function InspectionArt() {
  return (
    <div className="relative aspect-square w-full">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M100 100 L 96 8 L 104 8 Z" fill="#fff" fillOpacity={i % 2 ? 0.35 : 0.7} transform={`rotate(${i * 30} 100 100)`} />
        ))}
      </svg>
      <img src="/landing/taxi-car-sm.webp" alt="" className="absolute left-1/2 top-[56%] w-[96%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_12px_10px_rgba(15,29,42,0.3)]" />
      <img src="/badges/verified.webp" alt="" className="absolute right-[6%] top-[10%] w-[34%] rotate-[10deg] drop-shadow-[0_8px_10px_rgba(15,29,42,0.25)]" />
    </div>
  )
}

/* Studiya fotosurati: profil hujjati maketi (rasmdagi suratli hujjat o‘rnida) */
function PhotoArt() {
  return (
    <div className="relative aspect-square w-full">
      <div className="absolute right-[2%] top-[14%] h-[78%] w-[62%] rotate-[8deg] rounded-[14px] bg-white/70 shadow-[0_10px_24px_rgba(15,29,42,0.12)]">
        <div className="mx-[12%] mt-[16%] space-y-[9%]">
          {[90, 70, 80, 55, 75].map((w, i) => (
            <span key={i} className="block h-[5px] rounded-full bg-ink/15" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <div className="absolute left-[6%] top-[8%] w-[60%] -rotate-[6deg] rounded-[14px] bg-white p-[6%] shadow-[0_14px_28px_rgba(15,29,42,0.22)]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-gradient-to-b from-[#e0f9fb] to-[#bdeff3]">
          <div className="absolute left-1/2 top-[22%] h-[30%] w-[36%] -translate-x-1/2 rounded-full bg-ink" />
          <div className="absolute bottom-[-18%] left-1/2 h-[52%] w-[78%] -translate-x-1/2 rounded-t-full bg-ink" />
          <div className="absolute bottom-[8%] left-1/2 h-[16%] w-[16%] -translate-x-1/2 rounded-full border-2 border-white bg-brand" />
        </div>
        <span className="mt-[8%] block h-[5px] w-[70%] rounded-full bg-ink/80" />
        <span className="mt-[6%] block h-[4px] w-[50%] rounded-full bg-ink/25" />
        <img src="/badges/verified.webp" alt="" className="absolute -right-[14%] -top-[10%] w-[34%]" />
      </div>
    </div>
  )
}

function Business() {
  return (
    <section id="business" className="mx-auto max-w-[1600px] scroll-mt-24 px-3 pb-20 sm:px-6">
      <div className="grid gap-5 px-2 sm:px-6 lg:grid-cols-[1.08fr_1fr] lg:gap-6 lg:px-14 2xl:px-20">
        <div className="flex flex-col gap-5 lg:gap-6">
          <div className="pb-2 lg:pb-6">
            <h2 className="text-[36px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[46px] 2xl:text-[60px]">Biznes</h2>
            <p className="mt-4 max-w-[540px] text-[15px] leading-[1.5] text-ink/85 sm:text-[17px] 2xl:max-w-[640px] 2xl:text-[20px]">
              Jamoamiz Biznes tarifiga ulanishingizga yordam beradi va mijozlarimiz uchun foydali tayyorgarlik
              jarayonlarini o‘tkazadi
            </p>
          </div>

          <InfoCard title="Savollar bo‘yicha qo‘ng‘iroq qiling" art={<img src="/empty/messages.webp" alt="" className="w-full" />}>
            Jamoamiz doim mijozlar bilan aloqada!
            <br />
            {OFFICE.phones.map((p, i) => (
              <span key={p.href}>
                {i ? ', ' : null}
                <a href={p.href} className="font-bold text-ink underline underline-offset-2 hover:text-brand-dark">
                  {p.label}
                </a>
              </span>
            ))}
          </InfoCard>
        </div>

        <div className="flex flex-col gap-5 lg:gap-6">
          <ServiceCard
            title="Avtomobil ko‘rigi"
            text="Jamoamiz Biznes tarifiga ulanishingizga yordam beradi"
            art={<InspectionArt />}
          />
          <ServiceCard
            title="Studiyada fotosurat"
            text="Profilingiz uchun professional surat — Biznes tarifiga ulanishda"
            art={<PhotoArt />}
          />
        </div>
      </div>
    </section>
  )
}

/* Aksiyalar. Hozircha faqat ilovada haqiqatan mavjud bo‘lgan taklif bonusi ko‘rsatiladi —
   yangi aksiya qo‘shish uchun shu ro‘yxatga yozing (sovg‘a va shartlar haqiqiy bo‘lsin). */
const PROMOS = [
  {
    id: 'referral',
    period: 'doimiy',
    prizes: [
      { place: 'Siz', reward: 'bonus', tail: 'har bir do‘st uchun' },
      { place: 'Do‘stingiz', reward: 'bonus', tail: 'birinchi safardan keyin' },
    ],
    terms: 'Do‘stingizni taklif qiling: u ro‘yxatdan o‘tib, birinchi buyurtmasini bajarsa, ikkalangiz ham bonus olasiz.',
    termsBold: 'Bonus 24 soat ichida balansga tushadi',
  },
]

// Saralash menyusi faqat mavjud davrlardan yasaladi; bitta aksiya bo‘lsa menyu ko‘rsatilmaydi.
const PERIOD_LABEL = { haftalik: 'Haftalik', oylik: 'Oylik', doimiy: 'Doimiy' }
const PROMO_FILTERS = [
  { id: 'all', label: 'Barchasi' },
  ...[...new Set(PROMOS.map((p) => p.period))].map((id) => ({ id, label: PERIOD_LABEL[id] ?? id })),
]
const PROMO_HAS_FILTER = PROMOS.length > 1

const PROMO_AUTOPLAY_MS = 5000

function PromoCard({ promo, active, onSelect }) {
  return (
    <article
      onClick={active ? undefined : onSelect}
      aria-hidden={active ? undefined : 'true'}
      className={`flex w-[var(--w)] shrink-0 select-none flex-col rounded-[28px] px-6 pb-7 pt-8 text-ink transition-[background-color,transform,box-shadow,opacity] duration-700 ease-[cubic-bezier(.22,.8,.3,1)] sm:rounded-[34px] sm:px-8 sm:pb-9 sm:pt-9 2xl:px-10 ${
        active
          ? 'scale-100 bg-brand shadow-[0_28px_60px_-18px_rgba(0,199,212,0.65)]'
          : 'scale-[0.92] cursor-pointer bg-[#f3f4f6] opacity-80 hover:opacity-100'
      }`}
    >
      <span className="self-start rounded-full bg-white px-4 py-2 text-[12px] font-semibold shadow-[0_2px_6px_rgba(15,29,42,0.06)] 2xl:text-[14px]">
        {promo.period}
      </span>

      <h3 className="mt-7 text-[22px] font-extrabold tracking-tight 2xl:text-[27px]">Bizdan sovg‘alar</h3>
      <ol className="mt-4 space-y-3 text-[14px] 2xl:text-[16px]">
        {promo.prizes.map((p, i) => (
          <li key={p.place} className="flex items-start gap-3">
            <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-bold">{i + 1}</span>
            <span className="leading-[1.45]">
              {p.place} — <b className="font-extrabold">{p.reward}</b>
              {p.tail ? ` ${p.tail}` : null}
            </span>
          </li>
        ))}
      </ol>

      <hr className={`my-7 ${active ? 'border-ink/20' : 'border-ink/10'}`} />

      <h3 className="text-[22px] font-extrabold tracking-tight 2xl:text-[27px]">Shartlar</h3>
      <p className="mt-3 text-[14px] leading-[1.5] text-ink/80 2xl:text-[16px]">
        {promo.terms} <b className="font-extrabold text-ink">{promo.termsBold}</b>
      </p>

      <div className="min-h-8 flex-1" />
      <Link
        to="/register"
        tabIndex={active ? 0 : -1}
        onClick={(e) => e.stopPropagation()}
        className={`flex h-12 items-center justify-center rounded-full text-[12px] font-extrabold uppercase tracking-[0.04em] transition-colors duration-500 2xl:h-14 2xl:text-[14px] ${
          active ? 'bg-[#1d2229] text-white hover:bg-black' : 'bg-white text-ink'
        }`}
      >
        Ishtirok etish!
      </Link>
    </article>
  )
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return undefined
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function Promotions() {
  const [filter, setFilter] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const list = filter === 'all' ? PROMOS : PROMOS.filter((p) => p.period === filter)
  const n = list.length
  const loop = n > 1
  // Cheksiz aylanish: ro‘yxat uch nusxada, pozitsiya doim o‘rtadagi nusxaga qaytariladi.
  const slides = loop ? [...list, ...list, ...list] : list
  const [pos, setPos] = useState(loop ? n + Math.min(1, n - 1) : 0)
  const [animate, setAnimate] = useState(true)
  const [dragX, setDragX] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [inView, setInView] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const reducedMotion = usePrefersReducedMotion()
  const sectionRef = useRef(null)
  const drag = useRef(null)

  const active = loop ? ((pos % n) + n) % n : 0
  const playing = loop && !hovered && inView && pageVisible && !reducedMotion && !menuOpen && dragX === 0

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    const onVis = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // Animatsiyasiz "sakrash"dan keyin keyingi kadrda o‘tishni qayta yoqamiz.
  useEffect(() => {
    if (animate) return undefined
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)))
    return () => cancelAnimationFrame(id)
  }, [animate])

  function onTrackTransitionEnd(e) {
    if (e.target !== e.currentTarget || !loop) return
    if (pos < n || pos >= 2 * n) {
      setAnimate(false)
      setPos(n + active)
    }
  }

  function go(delta) {
    if (!loop) return
    setAnimate(true)
    setPos((p) => p + delta)
    setCycle((c) => c + 1)
  }

  function goTo(i) {
    setAnimate(true)
    setPos(loop ? n + i : i)
    setCycle((c) => c + 1)
  }

  function pickFilter(id) {
    const next = id === 'all' ? PROMOS : PROMOS.filter((p) => p.period === id)
    setFilter(id)
    setAnimate(false)
    setPos(next.length > 1 ? next.length + Math.min(1, next.length - 1) : 0)
    setMenuOpen(false)
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' || !loop) return
    drag.current = { x: e.clientX, y: e.clientY, locked: null }
  }
  function onPointerMove(e) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (d.locked === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) d.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (d.locked === 'x') setDragX(dx)
  }
  function onPointerUp() {
    const d = drag.current
    drag.current = null
    if (!d || d.locked !== 'x') return
    const dx = dragX
    setDragX(0)
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
  }

  const arrow =
    'absolute top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-[0_8px_20px_rgba(15,29,42,0.12)] ring-1 ring-black/5 transition hover:scale-105 hover:bg-[#1d2229] hover:text-white focus-visible:outline-2 focus-visible:outline-brand sm:h-12 sm:w-12'

  return (
    <section
      ref={sectionRef}
      id="promos"
      aria-roledescription="karusel"
      aria-label="Aksiyalar"
      className="mx-auto max-w-[1600px] scroll-mt-24 pb-20"
    >
      <div className="px-5 sm:px-12 lg:px-20 2xl:px-24">
        <div className="relative inline-block">
          {PROMO_HAS_FILTER ? (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-2 text-[36px] font-extrabold leading-none tracking-tight text-ink sm:text-[46px] 2xl:text-[60px]"
            >
              Aksiyalar
              <ChevronDown className={`mt-1 h-7 w-7 transition-transform duration-300 sm:h-8 sm:w-8 ${menuOpen ? 'rotate-180' : ''}`} strokeWidth={1.8} />
            </button>
          ) : (
            <h2 className="text-[36px] font-extrabold leading-none tracking-tight text-ink sm:text-[46px] 2xl:text-[60px]">Aksiyalar</h2>
          )}
          {menuOpen && PROMO_HAS_FILTER ? (
            <div role="listbox" className="absolute left-0 top-full z-30 mt-3 w-52 rounded-2xl bg-white p-2 shadow-[0_20px_40px_rgba(15,29,42,0.16)] ring-1 ring-black/5">
              {PROMO_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={filter === f.id}
                  onClick={() => pickFilter(f.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-[15px] font-semibold hover:bg-[#f3f4f6] ${
                    filter === f.id ? 'text-brand-dark' : 'text-ink'
                  }`}
                >
                  {f.label}
                  {filter === f.id ? <Check className="h-4 w-4" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Karusel: faol karta markazda; yon kartalar chetlarda asta xiralashadi */}
      <div
        className="relative mt-4 overflow-hidden pb-16 pt-6 [--g:28px] [--w:min(300px,calc(100vw-96px))] [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)] sm:mt-10 sm:[--g:96px] sm:[--w:320px] lg:[mask-image:linear-gradient(90deg,transparent,#000_16%,#000_84%,transparent)] 2xl:[--g:120px] 2xl:[--w:400px]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: 'pan-y' }}
      >
        <div
          onTransitionEnd={onTrackTransitionEnd}
          className={`flex items-stretch gap-[var(--g)] pl-[calc(50%-var(--w)/2)] will-change-transform ${
            animate && dragX === 0 ? 'transition-transform duration-700 ease-[cubic-bezier(.22,.8,.3,1)]' : ''
          }`}
          style={{ transform: `translateX(calc(${-pos} * (var(--w) + var(--g)) + ${dragX}px))` }}
        >
          {slides.map((promo, i) => (
            <PromoCard key={`${promo.id}-${i}`} promo={promo} active={i === pos} onSelect={() => go(i - pos)} />
          ))}
        </div>

        {loop ? (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Oldingi aksiya" className={`${arrow} hidden sm:flex left-[calc(50%-var(--w)/2-var(--g)/2)]`}>
              <ArrowLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Keyingi aksiya" className={`${arrow} hidden sm:flex left-[calc(50%+var(--w)/2+var(--g)/2)]`}>
              <ArrowRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </>
        ) : null}
      </div>

      {loop ? (
        <div className="-mt-8 flex items-center justify-center gap-4">
          <button type="button" onClick={() => go(-1)} aria-label="Oldingi aksiya" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-ink sm:hidden">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            {list.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${i + 1}-aksiya`}
                aria-current={i === active ? 'true' : undefined}
                className={`relative h-2 overflow-hidden rounded-full transition-all duration-500 ${i === active ? 'w-10 bg-ink/15' : 'w-2 bg-ink/15 hover:bg-ink/30'}`}
              >
                {i === active ? (
                  <span
                    key={cycle}
                    onAnimationEnd={() => go(1)}
                    className="absolute inset-0 origin-left rounded-full bg-brand"
                    style={{
                      animation: reducedMotion ? 'none' : `promo-fill ${PROMO_AUTOPLAY_MS}ms linear forwards`,
                      animationPlayState: playing ? 'running' : 'paused',
                      transform: reducedMotion ? 'scaleX(1)' : undefined,
                    }}
                  />
                ) : null}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => go(1)} aria-label="Keyingi aksiya" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-ink sm:hidden">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </section>
  )
}

/* ── Random mijoz ─────────────────────────────────────────────────────────────────────────
   Forma → serverda ishtirokchi yaratiladi → bot havolasi (gw_<token>) Telegram ID'ni bog‘laydi →
   server bot orqali kanal/guruh a’zoligini tekshiradi. Token brauzerda saqlanadi, shuning uchun
   sahifaga qaytgan foydalanuvchi o‘z holatini ko‘radi. */
const GW_TOKEN_KEY = 'taxiline-gw-token'

function readGwToken() {
  try {
    return localStorage.getItem(GW_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}
function writeGwToken(token) {
  try {
    if (token) localStorage.setItem(GW_TOKEN_KEY, token)
    else localStorage.removeItem(GW_TOKEN_KEY)
  } catch {
    /* private mode */
  }
}

// Oq karta ichidagi maydonlar: kulrang fon, fokusda oq + brend halqa.
const FIELD_SOFT = FIELD.replace('bg-white', 'bg-[#f3f4f6] focus:bg-white focus-within:bg-white').replace(
  'focus:ring-ink/25',
  'focus:ring-brand focus-within:ring-2 focus-within:ring-brand',
)

const RANDOM_RULES = [
  { icon: User, title: 'Ism, familiya va raqamingizni qoldiring', text: 'Bitta telefon raqami va bitta Telegram akkaunt — bitta ishtirok.' },
  { icon: Send, title: 'Telegram kanal va guruhimizga qo‘shiling', text: 'Obuna avtomatik tekshiriladi — botda bir marta tasdiqlang.' },
  { icon: Gift, title: 'G‘olib bo‘ling!', text: 'G‘oliblar shartlarni bajarganlar orasidan tasodifiy tanlanadi.' },
]

function StatusRow({ done, title, hint, action }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-2xl bg-[#f3f4f6] px-4 py-3.5 2xl:px-5 2xl:py-4">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${
          done ? 'bg-brand text-ink' : 'bg-white text-ink/30 ring-1 ring-ink/10'
        }`}
      >
        {done ? <Check className="h-[18px] w-[18px]" strokeWidth={3} /> : <span className="h-2 w-2 rounded-full bg-current" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-ink 2xl:text-[17px]">{title}</span>
        <span className={`block text-[12.5px] 2xl:text-[14px] ${done ? 'text-brand-dark' : 'text-ink/55'}`}>{hint}</span>
      </span>
      {done || !action ? null : <span className="w-full pl-[50px] sm:w-auto sm:pl-0">{action}</span>}
    </li>
  )
}

function RandomClient() {
  const [settings, setSettings] = useState(null)
  const [token, setToken] = useState(readGwToken)
  const [status, setStatus] = useState(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState(maskPhoneUz('+998'))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    api.get('/giveaway').then(setSettings).catch(() => setSettings(null))
  }, [])

  // Saqlangan token bo‘yicha holatni yuklash (token eskirgan bo‘lsa — formaga qaytamiz).
  useEffect(() => {
    if (!token) return
    api
      .get(`/giveaway/entries/${token}`)
      .then(setStatus)
      .catch(() => {
        writeGwToken('')
        setToken('')
      })
  }, [token])

  // Avtomatik yangilash: bot ulanmaguncha holatni o‘qiymiz, ulangach — obunani qayta tekshiramiz.
  useEffect(() => {
    if (!token || !status || status.eligible) return undefined
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const req = status.linked ? api.post(`/giveaway/entries/${token}/recheck`) : api.get(`/giveaway/entries/${token}`)
      req.then(setStatus).catch(() => {})
    }, status.linked ? 10_000 : 4_000)
    return () => clearInterval(id)
  }, [token, status])

  async function onSubmit(e) {
    e.preventDefault()
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setError('Ism va familiyangizni to‘liq kiriting')
      return
    }
    if (!isCompletePhoneUz(phone)) {
      setError('Telefon raqamini to‘liq kiriting')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/giveaway/entries', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: toE164Uz(phone),
      })
      writeGwToken(res.token)
      setToken(res.token)
      setStatus(res.status)
    } catch (err) {
      setError(err.message || 'Yuborib bo‘lmadi, qayta urinib ko‘ring')
    } finally {
      setSubmitting(false)
    }
  }

  async function recheckNow() {
    if (!token) return
    setChecking(true)
    try {
      setStatus(await api.post(`/giveaway/entries/${token}/recheck`))
    } catch {
      /* keyingi urinishda */
    } finally {
      setChecking(false)
    }
  }

  function reset() {
    writeGwToken('')
    setToken('')
    setStatus(null)
  }

  const s = status?.settings ?? settings
  const requires = s?.requires ?? { channel: false, group: false }
  const botUrl = token ? `https://t.me/${TELEGRAM_BOT}?start=gw_${token}` : '#'
  const closed = settings && !settings.entriesOpen && !status
  const smallBtn =
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-bold text-white transition hover:bg-black 2xl:h-10 2xl:text-[14px]'

  return (
    <section id="random" className="mx-auto max-w-[1600px] scroll-mt-24 px-3 pb-20 sm:px-6">
      <div className="relative overflow-hidden rounded-[32px] bg-[#1d2229] text-white sm:rounded-[40px]">
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 h-[460px] w-[460px] rounded-full bg-brand/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-40 h-[520px] w-[520px] rounded-full bg-brand" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-48 hidden h-56 w-56 rounded-full border-[30px] border-white/5 lg:block" />

        <div className="relative grid gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1fr_minmax(0,500px)] lg:gap-14 lg:px-14 lg:py-20 2xl:grid-cols-[1fr_minmax(0,600px)] 2xl:px-20 2xl:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3.5 py-1.5 text-[13px] font-semibold text-brand ring-1 ring-white/10">
              <Gift className="h-4 w-4" /> Sovg‘ali o‘yin
            </span>
            <h2 className="mt-5 text-[38px] font-extrabold leading-[1.05] tracking-tight sm:text-[50px] 2xl:text-[66px]">
              {s?.title || 'Random mijoz'}
            </h2>
            <p className="mt-4 max-w-[520px] text-[16px] leading-[1.55] text-white/75 sm:text-[18px] 2xl:max-w-[640px] 2xl:text-[21px]">
              {s?.prizeText || 'Tasodifiy tanlangan mijozlarimizning borish yoki qaytish yo‘l haqini TaxiLine to‘lab beradi!'}
            </p>

            <ol className="mt-9 space-y-5">
              {RANDOM_RULES.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex gap-4">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-brand ring-1 ring-white/10 2xl:h-12 2xl:w-12">
                    <Icon className="h-5 w-5" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-extrabold text-ink">
                      {i + 1}
                    </span>
                  </span>
                  <span>
                    <span className="block text-[16px] font-bold sm:text-[17px] 2xl:text-[20px]">{title}</span>
                    <span className="mt-0.5 block text-[14px] text-white/60 2xl:text-[16px]">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-8 flex items-start gap-2 text-[13px] leading-[1.5] text-white/50 2xl:text-[15px]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              G‘olib tanlanishidan oldin obuna qayta tekshiriladi — obunani bekor qilganlar ishtirokdan chiqadi.
            </p>
          </div>

          {/* O‘ng karta: forma yoki holat */}
          <div className="relative self-start rounded-[28px] bg-white p-6 text-ink shadow-[0_30px_70px_-20px_rgba(0,0,0,0.5)] sm:rounded-[32px] sm:p-8 2xl:p-10">
            {closed ? (
              <div className="py-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f4f6]">
                  <Clock className="h-6 w-6 text-ink/60" />
                </span>
                <h3 className="mt-4 text-[22px] font-extrabold">Qabul vaqtincha yopiq</h3>
                <p className="mt-2 text-[14px] text-ink/60">Keyingi o‘yin haqida Telegram kanalimizda e’lon qilamiz.</p>
                {s?.channelUrl ? (
                  <a href={s.channelUrl} target="_blank" rel="noopener noreferrer" className={`${smallBtn} mt-5`}>
                    <Send className="h-4 w-4" /> Kanalga o‘tish
                  </a>
                ) : null}
              </div>
            ) : !status ? (
              <form onSubmit={onSubmit} noValidate>
                <h3 className="text-[24px] font-extrabold tracking-tight 2xl:text-[30px]">Ishtirok etish</h3>
                <p className="mt-1.5 text-[14px] text-ink/60 2xl:text-[16px]">Ma’lumotlaringiz faqat g‘olibni aniqlash uchun ishlatiladi.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ism"
                    autoComplete="given-name"
                    aria-label="Ism"
                    className={`${FIELD_SOFT}`}
                  />
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Familiya"
                    autoComplete="family-name"
                    aria-label="Familiya"
                    className={`${FIELD_SOFT}`}
                  />
                  <label className={`${FIELD_SOFT} flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-ink/25 sm:col-span-2`}>
                    <span className={phone.length > 5 ? 'text-ink' : 'text-slate-400'}>+998</span>
                    <input
                      value={maskLocalPhoneUz(phone)}
                      onChange={(e) => setPhone(maskPhoneUz(e.target.value))}
                      placeholder="Telefon raqam"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={12}
                      aria-label="Telefon raqam"
                      className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </label>
                </div>
                {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-600">{error}</p> : null}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-[14px] font-extrabold uppercase tracking-[0.04em] text-ink shadow-[0_12px_26px_-8px_rgba(0,199,212,0.7)] transition hover:bg-[#00b6c2] disabled:opacity-60 2xl:py-4 2xl:text-[16px]"
                >
                  {submitting ? 'Yuborilmoqda…' : 'Ishtirok etish'} <ArrowRight className="h-4 w-4" />
                </button>
                <p className="mt-4 text-center text-[12px] text-ink/45">Tugmani bosish orqali o‘yin shartlariga rozilik bildirasiz</p>
              </form>
            ) : status.eligible ? (
              <div className="py-4 text-center">
                <span className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand text-ink shadow-[0_18px_40px_-10px_rgba(0,199,212,0.8)]">
                  <span className="absolute inset-0 animate-ping rounded-full bg-brand/40 [animation-duration:2.4s]" />
                  <PartyPopper className="relative h-9 w-9" />
                </span>
                <h3 className="mt-6 text-[26px] font-extrabold tracking-tight 2xl:text-[32px]">Siz ishtirokchisiz, {status.firstName}!</h3>
                <p className="mx-auto mt-2 max-w-[360px] text-[14px] leading-[1.55] text-ink/60 2xl:text-[16px]">
                  Barcha shartlar bajarildi. G‘oliblar e’lon qilinganda Telegram orqali xabar beramiz. Omad!
                </p>
                <ul className="mt-6 space-y-2 text-left">
                  <StatusRow done title="Telegram bot" hint="Ulandi" />
                  {requires.channel ? <StatusRow done title="Telegram kanal" hint="Obuna bo‘lgansiz" /> : null}
                  {requires.group ? <StatusRow done title="Telegram guruh" hint="A’zosiz" /> : null}
                </ul>
                <button type="button" onClick={reset} className="mt-5 text-[13px] font-semibold text-ink/45 underline-offset-2 hover:text-ink hover:underline">
                  Boshqa raqam bilan qatnashish
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-[24px] font-extrabold tracking-tight 2xl:text-[30px]">Deyarli tayyor, {status.firstName}!</h3>
                <p className="mt-1.5 text-[14px] text-ink/60 2xl:text-[16px]">Ishtirokchi bo‘lish uchun quyidagi shartlarni bajaring:</p>
                <ul className="mt-6 space-y-2.5">
                  <StatusRow
                    done={status.linked}
                    title="Telegram botga ulanish"
                    hint={status.linked ? 'Ulandi' : 'Botda «Start»ni bosing'}
                    action={
                      <a href={botUrl} target="_blank" rel="noopener noreferrer" className={smallBtn}>
                        <Send className="h-3.5 w-3.5" /> Botni ochish
                      </a>
                    }
                  />
                  {requires.channel ? (
                    <StatusRow
                      done={status.channelMember === true}
                      title="Telegram kanal"
                      hint={status.channelMember === true ? 'Obuna bo‘lgansiz' : 'Kanalga obuna bo‘ling'}
                      action={
                        s?.channelUrl ? (
                          <a href={s.channelUrl} target="_blank" rel="noopener noreferrer" className={smallBtn}>
                            Obuna bo‘lish
                          </a>
                        ) : null
                      }
                    />
                  ) : null}
                  {requires.group ? (
                    <StatusRow
                      done={status.groupMember === true}
                      title="Telegram guruh"
                      hint={status.groupMember === true ? 'A’zosiz' : 'Guruhga qo‘shiling'}
                      action={
                        s?.groupUrl ? (
                          <a href={s.groupUrl} target="_blank" rel="noopener noreferrer" className={smallBtn}>
                            Qo‘shilish
                          </a>
                        ) : null
                      }
                    />
                  ) : null}
                </ul>
                <button
                  type="button"
                  onClick={recheckNow}
                  disabled={checking || !status.linked}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 py-3.5 text-[14px] font-bold text-ink transition hover:bg-[#f3f4f6] disabled:opacity-50 2xl:text-[16px]"
                >
                  <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                  {checking ? 'Tekshirilmoqda…' : 'Qayta tekshirish'}
                </button>
                <p className="mt-3 flex items-center justify-center gap-2 text-[12px] text-ink/45">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                  </span>
                  Holat avtomatik yangilanadi
                </p>
                <button type="button" onClick={reset} className="mx-auto mt-3 block text-[12.5px] font-semibold text-ink/40 hover:text-ink hover:underline">
                  Boshqa raqam bilan qatnashish
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function FaqItem({ item, open, onToggle, id }) {
  return (
    <div className="border-b border-ink/10">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-btn`}
          className="flex w-full items-center justify-between gap-6 py-6 text-left sm:py-7 2xl:py-8"
        >
          <span className="text-[18px] font-extrabold leading-snug tracking-tight text-ink sm:text-[22px] 2xl:text-[27px]">{item.q}</span>
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300 2xl:h-12 2xl:w-12 ${
              open ? 'bg-brand text-ink' : 'bg-[#f0f1f3] text-ink hover:bg-[#e6e8eb]'
            }`}
          >
            {/* "+" ochilganda "−" ga aylanadi: vertikal chiziq buriladi va yo‘qoladi */}
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M12 5v14" className={`origin-center transition-all duration-300 ${open ? 'rotate-90 opacity-0' : ''}`} />
            </svg>
          </span>
        </button>
      </h3>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-btn`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="max-w-[820px] pb-7 pr-14 text-[15px] leading-[1.6] text-ink/80 sm:text-[16px] 2xl:max-w-[1000px] 2xl:text-[19px]">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="mx-auto max-w-[1600px] scroll-mt-24 px-3 pb-20 sm:px-6">
      <div className="px-2 sm:px-6 lg:px-14 2xl:px-20">
        <h2 className="text-[36px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[46px] 2xl:text-[60px]">
          Ko‘p so‘raladigan savollar
        </h2>
        <div className="mt-6 sm:mt-8">
          {faqs.map((item, i) => (
            <FaqItem key={item.q} id={`faq-${i}`} item={item} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Landing() {
  const { status, authUser } = useAuth()
  const { hash } = useLocation()

  // Boshqa sahifadan /#bo‘lim havolasi bilan kelinganda — bo‘lim chizilgach unga aylantiramiz.
  useEffect(() => {
    if (!hash) return undefined
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 150)
    return () => clearTimeout(t)
  }, [hash])

  if (status === 'authed' && authUser) {
    return <Navigate to={homePathForRole(authUser)} replace />
  }

  return (
    <div className="min-h-svh bg-white text-ink">
      <SiteHeader floating />
      <main>
        <Showcase />
        <Join />
        <Earn />
        <Business />
        <Promotions />
        <RandomClient />
        <Faq />
        <Regions />
      </main>
      <SiteFooter attached />
      <ScrollTopButton />
    </div>
  )
}
