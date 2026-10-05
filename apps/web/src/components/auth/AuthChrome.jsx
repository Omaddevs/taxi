import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LogoPin, Wordmark } from '../ui/Logo'
import { LanguageChip } from '../ui/LanguagePicker'
import malibu from '../../assets/login/malibu.png'

export const TELEGRAM_BOT = import.meta.env.VITE_TELEGRAM_BOT || 'taxilines_bot'

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
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-white">
      <div className="bg-gradient-to-b from-[#e3f6f3] to-white px-5 pt-[max(10px,env(safe-area-inset-top))]">
        <header className="flex h-11 items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <LanguageChip className="h-8" />
        </header>

        <div className="flex flex-col items-center pt-1">
          <LogoPin size={72} />
          <Wordmark className="mt-2 text-[22px]" />
          <p className="mt-1 text-[11px] font-semibold text-muted">Yo‘l va xizmatlar</p>
        </div>
      </div>

      <div className="bg-white px-5">
        <div className="mx-auto h-[128px] w-full max-w-[300px]">
          <img src={malibu} alt="Chevrolet Malibu" className="h-full w-full object-contain object-bottom" />
        </div>
      </div>

      <div className="flex flex-1 flex-col rounded-t-[24px] bg-white px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_24px_rgba(28,28,40,0.05)]">
        {children}
      </div>
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
