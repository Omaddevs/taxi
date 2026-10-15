import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { t } from '../../i18n'

// Phone-only page header (the app's top bar is hidden on these pages, see AppLayout): back arrow,
// centred title, optional action — the same bar as the account screens. Sticks to the top.
export function ScreenHeader({ title, subtitle, right, back = true, className = '' }) {
  const navigate = useNavigate()
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <header
      className={`sticky top-0 z-30 -mx-4 -mt-4 mb-3 flex min-h-14 items-center gap-1 bg-canvas/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden ${className}`}
    >
      {back ? (
        <button
          type="button"
          onClick={goBack}
          aria-label={t('Orqaga')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition active:bg-black/5"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2.2} />
        </button>
      ) : (
        <div className="h-11 w-11 shrink-0" />
      )}
      <div className="min-w-0 flex-1 py-2 text-center">
        <h1 className="truncate text-[17px] font-bold text-ink">{t(title)}</h1>
        {subtitle ? <p className="truncate text-[12px] text-muted">{t(subtitle)}</p> : null}
      </div>
      <div className="flex min-w-11 shrink-0 justify-end">{right}</div>
    </header>
  )
}

export function PageTitle({ title, subtitle, right, className = '' }) {
  return (
    <div className={`mb-5 hidden items-end justify-between gap-4 lg:flex ${className}`}>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{t(title)}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{t(subtitle)}</p> : null}
      </div>
      {right}
    </div>
  )
}
