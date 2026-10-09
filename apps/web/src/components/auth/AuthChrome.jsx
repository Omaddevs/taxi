import { ArrowLeft, ChevronRight, Headset, Loader2, Lock, MapPin, Send, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { homePathForRole } from '../../lib/role'
import { GoogleCancelled, requestGoogleCode, savePendingGoogle } from '../../lib/google'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo, LogoPin, Wordmark } from '../ui/Logo'
import { LanguageChip } from '../ui/LanguagePicker'

export const TELEGRAM_BOT = import.meta.env.VITE_TELEGRAM_BOT || 'taxilines_bot'
// Sign-in / registration codes come from this bot (not the main one).
export const KIRISH_BOT = import.meta.env.VITE_KIRISH_BOT || 'taxiline_kirish_bot'

const AUTH_PERKS = [
  { icon: Send, text: 'Telegram orqali tezkor tasdiqlash' },
  { icon: ShieldCheck, text: 'Xavfsiz safar: SOS va jonli kuzatuv' },
  { icon: MapPin, text: 'Butun O‘zbekiston bo‘ylab' },
]

/* Noutbuk va kompyuterda chap tomondagi brend paneli (landing bilan bir uslubda). */
function AuthBrandPanel() {
  return (
    <aside className="sticky top-0 hidden h-svh p-4 lg:block xl:p-5">
      <div className="relative flex h-full flex-col overflow-hidden rounded-[36px] bg-[#1d2229] px-12 pb-0 pt-10 text-white xl:px-16 xl:pt-12 2xl:rounded-[44px] 2xl:px-20 2xl:pt-16">
        {/* Fondagi katta "T" va brend doirasi */}
        <svg aria-hidden="true" viewBox="0 0 600 600" className="pointer-events-none absolute -right-24 top-16 w-[620px] 2xl:w-[760px]">
          <path d="M40 150 H 560 M300 150 V 700" fill="none" stroke="#fff" strokeOpacity="0.04" strokeWidth="110" />
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-32 h-[520px] w-[520px] rounded-full bg-brand 2xl:h-[640px] 2xl:w-[640px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-3 self-start" aria-label="TaxiLine — bosh sahifa">
          <Logo size={48} className="2xl:h-14! 2xl:w-14!" />
          <span className="text-[25px] font-extrabold tracking-tight 2xl:text-[29px]">
            Taxi<span className="text-brand">Line</span>
          </span>
        </Link>

        <div className="relative mt-auto pb-8 xl:pb-10">
          <h2 className="text-[44px] font-extrabold leading-[1.06] tracking-tight xl:text-[52px] 2xl:text-[64px]">
            Yo‘l va xizmatlar —
            <br />
            <span className="text-brand">bitta ilovada</span>
          </h2>
          <p className="mt-5 max-w-[460px] text-[16px] leading-[1.55] text-white/70 2xl:max-w-[560px] 2xl:text-[19px]">
            Taksi, shaharlararo safar, pochta va yuk. Kirish uchun telefon raqamingizning o‘zi yetarli.
          </p>
          <ul className="mt-8 space-y-3.5">
            {AUTH_PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] font-medium text-white/90 2xl:text-[17px]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-brand ring-1 ring-white/10">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative -mx-12 pb-8 xl:-mx-16 2xl:-mx-20 2xl:pb-10">
          <img
            src="/landing/taxi-car.webp"
            alt="TaxiLine avtomobili"
            className="ml-auto w-[88%] max-w-[760px] translate-x-[4%] drop-shadow-[0_30px_30px_rgba(0,0,0,0.45)]"
          />
        </div>
      </div>
    </aside>
  )
}

export function AuthChrome({ children, onBack }) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack) {
      onBack()
      return
    }
    if (window.history.length > 1) navigate(-1)
    else navigate('/', { replace: true })
  }

  return (
    <div className="min-h-svh bg-white sm:bg-canvas lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:bg-white">
      <AuthBrandPanel />

      {/* Telefon: to‘liq ekran · planshet: markazdagi karta · noutbuk/kompyuter: o‘ng ustun */}
      <main className="flex min-h-svh flex-col sm:items-center sm:justify-center sm:px-6 sm:py-10 lg:items-stretch lg:justify-start lg:px-12 lg:py-8 2xl:px-16 2xl:py-10">
        <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col bg-white sm:min-h-0 sm:max-w-[480px] sm:overflow-hidden sm:rounded-[32px] sm:shadow-[0_30px_70px_-20px_rgba(15,29,42,0.25)] sm:ring-1 sm:ring-black/[0.04] lg:max-w-none lg:flex-1 lg:overflow-visible lg:rounded-none lg:shadow-none lg:ring-0">
          <div className="bg-gradient-to-b from-[#e0f9fb] to-white px-5 pt-[max(10px,env(safe-area-inset-top))] sm:px-8 sm:pt-6 lg:bg-none lg:px-0 lg:pt-0">
            <header className="flex h-11 items-center justify-between lg:h-12">
              <button
                type="button"
                onClick={handleBack}
                className="-ml-2 flex h-11 w-11 items-center justify-center gap-2 rounded-full text-ink transition hover:bg-black/5 lg:ml-0 lg:h-10 lg:w-auto lg:bg-[#f3f4f6] lg:pl-3 lg:pr-4 lg:text-[14px] lg:font-semibold lg:hover:bg-[#e9ebee]"
                aria-label="Orqaga"
              >
                <ArrowLeft className="h-5 w-5 lg:h-4 lg:w-4" />
                <span className="hidden lg:inline">Orqaga</span>
              </button>
              <LanguageChip className="h-8 lg:h-9" />
            </header>

            <div className="flex flex-col items-center pt-1 lg:hidden">
              <LogoPin size={72} />
              <Wordmark className="mt-2 text-[22px]" />
              <p className="mt-1 text-[11px] font-semibold text-muted">Yo‘l va xizmatlar</p>
            </div>
          </div>

          <div className="bg-white px-5 lg:hidden">
            <div className="mx-auto h-[128px] w-full max-w-[340px]">
              <img
                src="/landing/taxi-car.webp"
                alt="TaxiLine avtomobili"
                className="h-full w-full object-contain object-bottom drop-shadow-[0_14px_14px_rgba(15,29,42,0.22)]"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col rounded-t-[24px] bg-white px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_24px_rgba(28,28,40,0.05)] sm:px-8 sm:pb-8 lg:mx-auto lg:my-auto lg:w-full lg:max-w-[440px] lg:flex-none lg:rounded-none lg:px-0 lg:py-10 lg:shadow-none 2xl:max-w-[500px] lg:[&_h1]:text-[30px] lg:[&_h1]:leading-9 2xl:[&_h1]:text-[34px]">
            <p className="mb-5 hidden items-center gap-2 self-start rounded-full bg-brand-soft px-3 py-1.5 text-[12px] font-semibold text-brand-dark lg:inline-flex">
              <Lock className="h-3.5 w-3.5" strokeWidth={2.2} /> Ma’lumotlaringiz himoyalangan
            </p>
            {children}
          </div>

          <footer className="hidden items-center justify-between gap-4 border-t border-line pt-5 text-[13px] text-muted lg:flex">
            <span>© {new Date().getFullYear()} TaxiLine</span>
            <a href="tel:+998877353636" className="flex items-center gap-2 font-medium transition hover:text-ink">
              <Headset className="h-4 w-4" /> Yordam: <span className="font-semibold text-ink">+998 87 735 36 36</span>
            </a>
          </footer>
        </div>
      </main>
    </div>
  )
}

export function TelegramMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        fill="#fff"
        d="M17.6 7.3 15.4 16c-.2.8-.6 1-1.2.6l-3.3-2.4-1.6 1.5c-.2.2-.3.3-.6.3l.2-3.4 6.2-5.6c.3-.2-.1-.4-.4-.2l-7.6 4.8-3.3-1c-.7-.2-.7-.7.2-1.1l12.8-4.9c.6-.2 1.1.1.8.7Z"
      />
    </svg>
  )
}

// "Get the code from @taxiline_kirish_bot" — shown on the code-entry step of login/register.
export function KirishBotButton({ start = 'kirish' }) {
  return (
    <a
      href={`https://t.me/${KIRISH_BOT}?start=${start}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 flex items-center gap-3 rounded-[16px] border border-[#2AABEE]/30 bg-[#f2faff] px-3 py-3 transition hover:border-[#2AABEE]/60 lg:px-4"
    >
      <TelegramMark />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-extrabold text-ink">Kodni Telegram botdan oling</span>
        <span className="block truncate text-[12px] font-semibold text-muted">@{KIRISH_BOT} → /kirish</span>
      </span>
      <span className="rounded-full bg-[#2AABEE] px-3 py-1.5 text-[12px] font-extrabold text-white">Ochish</span>
    </a>
  )
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.53Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.9A6.01 6.01 0 0 1 6.1 12c0-.66.11-1.3.3-1.9V7.52H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.48l3.34-2.58Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.78.5 3.82 1.5l2.86-2.86C16.95 2.9 14.7 2 12 2A10 10 0 0 0 3.07 7.52l3.34 2.58C7.2 7.74 9.4 5.98 12 5.98Z" />
    </svg>
  )
}

// "Google orqali kirish / ro‘yxatdan o‘tish": an account already linked to this Google logs in
// straight away; a new one continues on /google to confirm a phone number once.
export function GoogleAuthButton({ label = 'Google orqali kirish', className = '' }) {
  const { googleSignIn } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onClick() {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const code = await requestGoogleCode()
      const result = await googleSignIn(code)
      if (result.status === 'ok') {
        navigate(homePathForRole(result.user), { replace: true })
        return
      }
      savePendingGoogle({ ticket: result.ticket, profile: result.profile })
      navigate('/google', { state: { ticket: result.ticket, profile: result.profile } })
    } catch (err) {
      if (!(err instanceof GoogleCancelled)) setError(err?.message || 'Google orqali kirib bo‘lmadi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-[16px] border border-line bg-white px-3 transition hover:border-brand/50 hover:bg-[#f7fdfe] disabled:opacity-70 lg:h-14 lg:px-4"
      >
        <GoogleMark />
        <span className="min-w-0 flex-1 text-left text-[14px] font-bold">{busy ? 'Google bilan bog‘lanilmoqda…' : label}</span>
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-300" />}
      </button>
      {error ? <p className="mt-2 text-center text-[12px] font-semibold text-red-500">{error}</p> : null}
    </div>
  )
}
