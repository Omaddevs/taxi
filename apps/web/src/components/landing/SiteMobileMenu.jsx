import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Bike, Briefcase, CarFront, ChevronRight, CircleHelp, Gift, LogIn, Newspaper, Phone, Send, UserPlus, X } from 'lucide-react'
import { Logo, Wordmark } from '../ui/Logo'
import { LanguageSwitch } from '../ui/LanguagePicker'
import { lockScroll } from '../../lib/scrollLock'
import { t } from '../../i18n'

// Ochiq sahifalar (landing, yangiliklar, haydovchi bo‘lish …) uchun telefondagi menyu.
const ITEMS = [
  { to: '/haydovchi-bolish', label: 'Haydovchi bo‘lish', hint: 'Bugunoq daromad qiling', icon: CarFront },
  { to: '/news', label: 'Yangiliklar', hint: 'Aksiyalar va yangilanishlar', icon: Newspaper },
  { to: '/skuter-ijara', label: 'Skuter ijara', hint: 'Skuter, samokat, velosiped', icon: Bike },
  { to: '/biznes', label: 'Biznes', hint: 'Kompaniyalar uchun tarif', icon: Briefcase },
  { to: '/savollar', label: 'Savol-javob', hint: 'Ko‘p so‘raladigan savollar', icon: CircleHelp },
]

const SUPPORT_PHONE = '+998 87 735 36 36'

/** Menyu tugmasi va ochiladigan panel. `buttonClassName` — tugma ko‘rinishi (fon rangiga qarab). */
export function SiteMobileMenu({ buttonClassName = '' }) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const { pathname } = useLocation()
  const panelRef = useRef(null)
  const buttonRef = useRef(null)

  // Ochilish/yopilish animatsiyasi: avval DOM'ga qo‘shamiz, keyingi kadrda ko‘rsatamiz.
  useEffect(() => {
    if (!open) return undefined
    const frame = requestAnimationFrame(() => setShown(true))
    const unlock = lockScroll()
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => {
      cancelAnimationFrame(frame)
      unlock()
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Sahifa almashsa (masalan, «Orqaga» tugmasi bilan) menyu yopiladi
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
    setShown(false)
  }

  function close() {
    setShown(false)
    setTimeout(() => {
      setOpen(false)
      buttonRef.current?.focus()
    }, 220)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-black/5 ${buttonClassName}`}
        aria-label={t('Menyu')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M10 17h10" />
        </svg>
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[11000] lg:hidden" role="dialog" aria-modal="true" aria-label={t('Menyu')}>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={close}
                className={`absolute inset-0 bg-ink/45 backdrop-blur-[3px] transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'}`}
              />

              <div
                ref={panelRef}
                tabIndex={-1}
                className={`absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col overflow-hidden rounded-b-[28px] bg-white shadow-[0_24px_60px_-12px_rgba(15,29,42,0.35)] outline-none transition duration-300 ease-[cubic-bezier(.22,.8,.3,1)] sm:inset-x-6 sm:top-4 sm:mx-auto sm:max-w-[560px] sm:rounded-[28px] ${
                  shown ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0'
                }`}
              >
                {/* Sarlavha */}
                <div className="flex h-16 shrink-0 items-center justify-between px-4 pt-[env(safe-area-inset-top)] sm:px-5">
                  <Link to="/" onClick={close} className="flex min-w-0 items-center gap-2.5" aria-label={t('TaxiLine — bosh sahifa')}>
                    <Logo size={36} />
                    <Wordmark className="text-[20px]" />
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-ink transition hover:bg-line"
                    aria-label={t('Yopish')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
                  <LanguageSwitch />

                  {/* Bo‘limlar */}
                  <nav className="mt-3 overflow-hidden rounded-[20px] ring-1 ring-line">
                    {ITEMS.map((item, i) => {
                      const active = pathname === item.to
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={close}
                          aria-current={active ? 'page' : undefined}
                          className={`group flex items-center gap-3 px-3 py-3 transition ${i ? 'border-t border-line' : ''} ${active ? 'bg-brand-soft/60' : 'hover:bg-canvas active:bg-canvas'}`}
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${active ? 'bg-brand text-white' : 'bg-brand-soft text-brand-dark'}`}>
                            <Icon className="h-5 w-5" strokeWidth={2.1} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-extrabold text-ink">{t(item.label)}</span>
                            <span className="block truncate text-[12.5px] font-medium text-muted">{t(item.hint)}</span>
                          </span>
                          <ChevronRight className="h-[18px] w-[18px] shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                        </Link>
                      )
                    })}
                  </nav>

                  {/* Sovg‘ali o‘yin */}
                  <Link
                    to="/aksiyalar#random"
                    onClick={close}
                    className="relative mt-3 flex items-center gap-3 overflow-hidden rounded-[20px] bg-ink p-3.5 text-white"
                  >
                    <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brand/25" />
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand text-ink">
                      <Gift className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-brand">{t('Sovg‘ali o‘yin')}</span>
                      <span className="block text-[15px] font-extrabold leading-snug">{t('Random mijoz')}</span>
                      <span className="block text-[12.5px] leading-snug text-white/70">{t('Yo‘l haqini TaxiLine to‘laydi')}</span>
                    </span>
                    <ArrowRight className="relative h-5 w-5 shrink-0 text-brand" />
                  </Link>

                  {/* Yordam */}
                  <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                    <a href="tel:+998877353636" className="flex min-w-0 items-center gap-2 rounded-2xl bg-canvas px-3 py-2.5 transition hover:bg-line">
                      <Phone className="h-4 w-4 shrink-0 text-brand-dark" />
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold text-muted">{t('Yordam xizmati')}</span>
                        <span className="block truncate text-[12.5px] font-extrabold text-ink">{SUPPORT_PHONE}</span>
                      </span>
                    </a>
                    <a
                      href="https://t.me/taxilines_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-2 rounded-2xl bg-canvas px-3 py-2.5 transition hover:bg-line"
                    >
                      <Send className="h-4 w-4 shrink-0 text-[#2AABEE]" />
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold text-muted">Telegram</span>
                        <span className="block truncate text-[12.5px] font-extrabold text-ink">@taxilines_bot</span>
                      </span>
                    </a>
                  </div>
                </div>

                {/* Asosiy amallar */}
                <div className="grid shrink-0 grid-cols-[minmax(0,4fr)_minmax(0,6fr)] gap-2 border-t border-line bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
                  <Link
                    to="/login"
                    onClick={close}
                    className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-2xl px-2 text-[14px] font-extrabold text-ink ring-1 ring-line transition hover:bg-canvas"
                  >
                    <LogIn className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{t('Kirish')}</span>
                  </Link>
                  <Link
                    to="/register"
                    onClick={close}
                    className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-2xl bg-brand px-2 text-[14px] font-extrabold text-ink shadow-[0_10px_22px_-8px_rgba(0,199,212,0.7)] transition hover:bg-brand-dark hover:text-white"
                  >
                    <UserPlus className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{t('Ro‘yxatdan o‘tish')}</span>
                  </Link>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
