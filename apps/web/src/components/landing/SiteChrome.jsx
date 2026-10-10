import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ArrowUp, Bot, Gift, LogIn, Phone } from 'lucide-react'
import { Logo, Wordmark } from '../ui/Logo'
import { LanguageChip } from '../ui/LanguagePicker'
import { SiteMobileMenu } from './SiteMobileMenu'
import { t } from '../../i18n'

// Landing'dan tashqaridagi ochiq sahifalar (Yangiliklar) uchun umumiy header va footer.
// Har bir band — alohida ommaviy sahifa (src/seo/pages.js). Google sitelinks shu havolalardan tanlanadi.
const SITE_NAV = [
  { to: '/haydovchi-bolish', label: 'Haydovchi bo‘lish' },
  { to: '/news', label: 'Yangiliklar' },
  { to: '/skuter-ijara', label: 'Skuter ijara' },
  { to: '/biznes', label: 'Biznes' },
  { to: '/savollar', label: 'Savol-javob' },
]

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
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:h-[72px] sm:gap-6 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label={t('TaxiLine — bosh sahifa')}>
          <Logo size={38} className="sm:h-11! sm:w-11!" />
          <Wordmark className="text-[20px] sm:text-[23px]" />
        </Link>

        <nav className="ml-auto hidden items-center gap-5 xl:gap-7 lg:flex">
          {SITE_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `${link} ${isActive ? 'text-ink underline decoration-brand decoration-[3px] underline-offset-[10px]' : ''}`}>
              {t(item.label)}
            </NavLink>
          ))}
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
      { label: 'Yangiliklar', href: '/news' },
      { label: 'Ko‘p so‘raladigan savollar', href: '/savollar' },
      { label: 'Aksiyalar', href: '/aksiyalar' },
      { label: 'Random mijoz', href: '/aksiyalar#random' },
    ],
  },
  {
    title: 'Ish',
    links: [
      { label: 'Haydovchi bo‘lish', href: '/haydovchi-bolish' },
      { label: 'Kuryer bo‘lish', href: '/haydovchi-bolish#earn' },
      { label: 'Biznes uchun', href: '/biznes' },
    ],
  },
]

// `attached` — landing'da footer tepadagi bo‘limga yopishgan (faqat pastki burchaklar yumaloq).
export function SiteFooter({ attached = false }) {
  return (
    <footer className="mx-auto max-w-[1600px] px-3 pb-6 sm:px-6">
      <div
        className={`${attached ? 'rounded-b-[32px] sm:rounded-b-[40px]' : 'rounded-[32px] sm:rounded-[40px]'} bg-[#1d2229] px-7 pb-8 pt-12 text-white sm:px-12 sm:pt-16 lg:px-14 lg:pb-10 lg:pt-20 2xl:px-20 2xl:pt-24`}
      >
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:gap-16">
          <Link to="/" className="flex items-center gap-4 self-start" aria-label="TaxiLine">
            <Logo size={64} className="sm:h-20! sm:w-20! 2xl:h-24! 2xl:w-24!" />
            <span className="text-[34px] font-bold leading-[1.02] tracking-tight sm:text-[42px] 2xl:text-[50px]">
              {t('Taxi')}
              <br />
              <span className="text-brand">{t('Line')}</span>
            </span>
          </Link>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-9 sm:grid-cols-3 sm:gap-x-16 2xl:gap-x-24">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[19px] font-bold leading-tight sm:whitespace-nowrap sm:text-[22px] 2xl:text-[26px]">{t(col.title)}</p>
                <ul className="mt-4 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="text-[14px] text-white/75 transition hover:text-brand 2xl:text-[16px]"
                      >
                        {t(l.label)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <p className="text-[19px] font-bold leading-tight sm:whitespace-nowrap sm:text-[22px] 2xl:text-[26px]">{t('Kontaktlar')}</p>
              <a
                href="tel:+998877353636"
                className="mt-4 inline-flex items-center gap-2 whitespace-nowrap text-[14px] font-semibold text-white/85 transition hover:text-brand 2xl:text-[16px]"
              >
                <Phone className="h-4 w-4 text-brand" /> +998 87 735 36 36
              </a>
              <ul className="mt-5 flex gap-2.5">
                {SOCIALS.map(({ label, href, icon: Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t(label)}
                      title={t(label)}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-brand hover:text-ink hover:ring-brand 2xl:h-12 2xl:w-12"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-[13px] text-white/50 sm:flex-row sm:items-center sm:justify-between 2xl:text-[14px]">
          <span>© {new Date().getFullYear()} {t('TaxiLine. Barcha huquqlar himoyalangan.')}</span>
          <span className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/privacy" className="transition hover:text-white">
              {t('Maxfiylik siyosati')}
            </Link>
            <Link to="/terms" className="transition hover:text-white">
              {t('Foydalanish shartlari')}
            </Link>
            <Link to="/login" className="transition hover:text-white">
              {t('Kirish')}
            </Link>
            <Link to="/register" className="transition hover:text-white">
              {t('Ro‘yxatdan o‘tish')}
            </Link>
          </span>
        </div>
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
