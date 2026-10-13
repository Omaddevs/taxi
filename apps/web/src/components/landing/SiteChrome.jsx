import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ArrowUp, Bot, Gift, LogIn, Phone } from 'lucide-react'
import { Logo, Wordmark } from '../ui/Logo'
import { LanguageChip } from '../ui/LanguagePicker'
import { SiteMobileMenu } from './SiteMobileMenu'
import { NavDropdown } from './NavDropdown'
import { usePromotions } from '../../lib/queries'
import { t } from '../../i18n'

// Landing'dan tashqaridagi ochiq sahifalar (Yangiliklar) uchun umumiy header va footer.
// Har bir band — alohida ommaviy sahifa (src/seo/pages.js). Google sitelinks shu havolalardan tanlanadi.
const SITE_NAV = [
  // Ochiladigan guruhlar — tarkibi src/data/siteMenus.js da.
  { menu: 'company' },
  { menu: 'resources' },
  { to: '/biznes', label: 'Biznes' },
  { to: '/savollar', label: 'Savol-javob' },
]

const ACTIVE_LINK = 'text-ink underline decoration-brand decoration-[3px] underline-offset-[10px]'

// `floating` — landing'da: sahifa `showAfter` px dan pastga aylantirilganda tepada qotib
// turadigan navbar sifatida silliq tushadi (hero ichidagi menyu ko‘rinmay qolgandan keyin).
export function SiteHeader({ floating = false, showAfter = 420 }) {
  const [shown, setShown] = useState(!floating)
  const link = 'whitespace-nowrap text-[14px] font-semibold text-ink/75 transition hover:text-ink 2xl:text-[16px]'

  useEffect(() => {
    if (!floating) return undefined
    let frame = 0
    const update = () => {
      frame = 0
      const next = window.scrollY > showAfter
      setShown(next)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [floating, showAfter])

  const position = floating
    ? `fixed inset-x-0 top-0 shadow-[0_10px_30px_-12px_rgba(15,29,42,0.25)] transition-[transform,opacity] duration-300 ease-out ${
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'
      }`
    : 'sticky top-0'

  return (
    <header
      aria-hidden={floating && !shown ? 'true' : undefined}
      inert={floating && !shown ? true : undefined}
      className={`${position} z-[100] border-b border-black/[0.05] bg-white/85 backdrop-blur-md`}
    >
      <div className="mx-auto flex h-16 max-w-site items-center gap-3 px-4 sm:h-[72px] sm:gap-6 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label={t('TaxiLine — bosh sahifa')}>
          <Logo size={38} className="sm:h-11! sm:w-11!" />
          <Wordmark className="text-[20px] sm:text-[23px]" />
        </Link>

        <nav className="ml-auto hidden items-center gap-5 xl:gap-7 lg:flex">
          {SITE_NAV.map((item) =>
            item.menu ? (
              <NavDropdown key={item.menu} menu={item.menu} className={link} activeClassName={ACTIVE_LINK} />
            ) : (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `${link} ${isActive ? ACTIVE_LINK : ''}`}>
                {t(item.label)}
              </NavLink>
            ),
          )}
          <Link
            to="/aksiyalar#random"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-soft px-3.5 py-1.5 text-[14px] font-bold text-brand-dark ring-1 ring-brand/20 transition hover:bg-brand hover:text-ink 2xl:text-[16px]"
          >
            <Gift className="h-4 w-4" /> {t('Random mijoz')}
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <LanguageChip compact wrapperClassName="hidden sm:block" />
          <Link
            to="/login"
            className="spin-border flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-4 text-[13px] font-extrabold text-white shadow-[0_8px_18px_rgba(15,29,42,0.2)] transition hover:bg-black sm:px-5"
          >
            <LogIn className="h-4 w-4" /> {t('Kirish')}
          </Link>
          <SiteMobileMenu buttonClassName="lg:hidden" />
        </div>
      </div>

    </header>
  )
}

function TelegramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.4 4.3 18.3 19c-.2 1-.9 1.3-1.8.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.7-7.9c.4-.3-.1-.5-.6-.2L6.2 12.9l-4.6-1.4c-1-.3-1-1 .2-1.5L20 3c.9-.3 1.6.2 1.4 1.3Z" />
    </svg>
  )
}

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

const SOCIALS = [
  { label: 'Telegram kanal', href: 'https://t.me/taxiline_uzbekistan', icon: TelegramIcon },
  { label: 'Telegram bot', href: 'https://t.me/taxilines_bot', icon: Bot },
  { label: 'Instagram', href: 'https://www.instagram.com/taxiline_uz', icon: InstagramIcon },
]

const FOOTER_COLUMNS = [
  {
    title: 'Kompaniya haqida',
    links: [
      { label: 'Nega biz?', href: '/#why' },
      { label: 'Bizning jamoa', href: '/jamoa' },
      { label: 'Aloqa', href: '/aloqa' },
      { label: 'Yangiliklar', href: '/news' },
      { label: 'Ko‘p so‘raladigan savollar', href: '/savollar' },
      // Faqat admin panelda faol aksiya bo‘lganda ko‘rinadi.
      { label: 'Aksiyalar', href: '/aksiyalar', needsPromos: true },
      { label: 'Random mijoz', href: '/aksiyalar#random' },
    ],
  },
  {
    title: 'Ish',
    links: [
      { label: 'Haydovchi bo‘lish', href: '/haydovchi-bolish' },
      { label: 'Biznes uchun', href: '/biznes' },
    ],
  },
  {
    title: 'Hisob',
    links: [
      { label: 'Kirish', href: '/login' },
      { label: 'Ro‘yxatdan o‘tish', href: '/register' },
      { label: 'Maxfiylik siyosati', href: '/privacy' },
      { label: 'Foydalanish shartlari', href: '/terms' },
    ],
  },
]

const PHONE = { href: 'tel:+998877353636', label: '+998 87 735 36 36' }

// Qo‘lda chizilgandek egri strelka — "Omadingizni sinang!" yozuvidan nishonga qaraydi.
function HandArrow(props) {
  return (
    <svg viewBox="0 0 40 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M37 24C26 26 12 22 6 6" />
      <path d="M2.5 12.5 6 5.5l6.5 3.5" />
    </svg>
  )
}

// Ochiq sahifalar footeri: chapda brend kartasi (logo, shior, ijtimoiy tarmoqlar), o‘ngda
// havolalar paneli — burchagida "Random mijoz" aksiyasiga olib boradigan nishon va pastida
// aloqa — ostida esa sahifa chetiga kesilib tushadigan katta "TaxiLine" yozuvi.
export function SiteFooter() {
  const hasPromos = usePromotions().length > 0
  return (
    <footer className="relative mx-auto max-w-site overflow-hidden px-3 pt-12 sm:px-6 sm:pt-16">
      <div className="relative z-10 grid gap-3 lg:grid-cols-[minmax(340px,0.44fr)_1fr]">
        <div className="relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[28px] bg-[linear-gradient(168deg,#00727c_0%,#00a9b5_48%,#2fd6e1_100%)] p-6 text-white sm:min-h-[340px] sm:p-8 lg:min-h-[420px]">
          <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-white/[0.07]" />

          <Link to="/" className="relative flex w-fit items-center gap-3" aria-label="TaxiLine">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_8px_20px_rgba(0,60,66,0.25)]">
              <Logo size={34} />
            </span>
            <span className="text-[30px] font-extrabold leading-none tracking-tight">TaxiLine</span>
          </Link>

          <div className="relative">
            <p className="text-[21px] font-semibold leading-snug tracking-tight sm:text-[23px]">
              {t('Shaharlararo qulay safar,')}
              <br />
              <span className="text-white/60">{t('bir necha bosishda.')}</span>
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <p className="font-hand text-[25px] leading-none text-white/90">{t('Aloqada bo‘ling!')}</p>
              <ul className="flex gap-2">
                {SOCIALS.map(({ label, href, icon: Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t(label)}
                      title={t(label)}
                      className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-ink text-white shadow-[0_6px_14px_rgba(0,40,45,0.35)] transition hover:-translate-y-0.5 hover:bg-white hover:text-ink"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col justify-between gap-12 rounded-[28px] bg-[#f1f3f6] p-6 sm:p-8">
          {/* "Random mijoz" nishoni — panel burchagidan chiqib turadi. */}
          <a
            href="/aksiyalar#random"
            className="group absolute -top-9 right-12 hidden flex-col items-center xl:flex"
            aria-label={t('Random mijoz')}
          >
            <span className="flex h-[104px] w-[104px] rotate-[10deg] items-center justify-center rounded-[30px] bg-[linear-gradient(145deg,#4be4ee_0%,#00b9c6_55%,#008d98_100%)] text-white shadow-[0_22px_32px_-10px_rgba(0,140,152,0.6),inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-8px_14px_rgba(0,70,77,0.22)] transition duration-300 group-hover:rotate-[4deg] group-hover:scale-105">
              <Gift className="h-12 w-12 drop-shadow-[0_3px_4px_rgba(0,70,77,0.35)]" strokeWidth={2.1} />
            </span>
            <span className="mt-3 flex -rotate-6 items-center gap-1 text-muted">
              <HandArrow className="h-5 w-7 -translate-y-1.5" />
              <span className="font-hand text-[21px] leading-none">{t('Omadingizni sinang!')}</span>
            </span>
          </a>

          <nav className="grid grid-cols-2 gap-x-8 gap-y-9 md:grid-cols-3 xl:max-w-[640px]">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="font-hand text-[23px] leading-none text-muted">{t(col.title)}</p>
                <ul className="mt-3.5 space-y-2.5">
                  {col.links.filter((l) => hasPromos || !l.needsPromos).map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-[15px] font-medium text-ink transition hover:text-brand-dark">
                        {t(l.label)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="order-2 text-[13px] text-muted md:order-1">
              © {new Date().getFullYear()} {t('TaxiLine. Barcha huquqlar himoyalangan.')}
            </p>
            <div className="order-1 w-full md:order-2 md:w-[360px]">
              <p className="text-[21px] font-semibold leading-tight tracking-tight text-ink">
                <span className="text-muted/70">{t('Savolingiz bormi?')}</span>
                <br />
                {t('Biz bilan bog‘laning.')}
              </p>
              <div className="mt-3.5 flex items-center gap-2 rounded-[20px] bg-white p-1.5 pl-4 shadow-[0_8px_24px_rgba(16,42,67,0.07)]">
                <Phone className="h-4 w-4 shrink-0 text-brand-dark" />
                <a href={PHONE.href} className="min-w-0 flex-1 whitespace-nowrap text-[15px] font-bold text-ink">
                  {PHONE.label}
                </a>
                <a
                  href={PHONE.href}
                  className="flex h-11 shrink-0 items-center rounded-[14px] bg-ink px-4 text-[14px] font-bold text-white shadow-[0_6px_14px_rgba(26,43,60,0.3)] transition hover:bg-black"
                >
                  {t('Qo‘ng‘iroq')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fon yozuvi: faqat tepa qismi ko‘rinadi, qolgani sahifa chetida kesiladi. */}
      <div aria-hidden="true" className="pointer-events-none relative -mt-3 h-[clamp(64px,13.5vw,236px)] select-none overflow-hidden sm:-mt-5">
        <p className="whitespace-nowrap text-center text-[clamp(104px,24.5vw,430px)] font-extrabold leading-[0.86] tracking-[-0.055em] text-[#eff1f4]">
          TaxiLine
        </p>
      </div>
    </footer>
  )
}

/* Pastga aylantirilganda paydo bo‘ladigan "Tepaga" tugmasi; atrofidagi halqa sahifa qancha
   o‘qilganini ko‘rsatadi. */
export function ScrollTopButton() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    function update() {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
      setVisible(window.scrollY > 600)
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  function toTop() {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  const r = 25
  const c = 2 * Math.PI * r

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label={t('Sahifa boshiga qaytish')}
      title={t('Tepaga')}
      tabIndex={visible ? 0 : -1}
      className={`group fixed bottom-[max(20px,env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1d2229] text-white shadow-[0_14px_30px_-8px_rgba(15,29,42,0.55)] transition-all duration-300 hover:bg-black sm:right-6 sm:bottom-6 2xl:h-16 2xl:w-16 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
        <circle cx="28" cy="28" r={r} fill="none" stroke="#00c7d4" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
      </svg>
      <ArrowUp className="relative h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" strokeWidth={2.4} />
    </button>
  )
}
