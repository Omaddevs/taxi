import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, X } from 'lucide-react'
import { useScrollLock } from '../../lib/scrollLock'
import { t } from '../../i18n'

// Building blocks of the account screens (hamburger menu → profile, settings, payment, addresses,
// promo, help, info): a plain white page with a back arrow, soft grey rounded groups whose rows
// are divided by an inset hairline, round quick actions and a bottom sheet. Colours are theme
// tokens only, so the dark theme needs nothing extra.

/** `tone="canvas"` puts white sections on a grey page (Payment methods) instead of grey groups on white. */
export function AccountScreen({ title, large = false, right, onBack, children, footer, tone = 'white' }) {
  const navigate = useNavigate()
  const back = onBack ?? (() => (window.history.length > 1 ? navigate(-1) : navigate('/')))
  return (
    <div className={`min-h-svh ${tone === 'canvas' ? 'bg-canvas' : 'bg-white'} pb-[max(24px,env(safe-area-inset-bottom))] lg:mx-auto lg:min-h-0 lg:max-w-xl lg:rounded-[28px] lg:pb-6 lg:shadow-[0_10px_40px_rgba(16,42,67,0.06)]`}>
      <header className={`sticky top-0 z-30 flex h-14 items-center ${tone === 'canvas' ? 'bg-canvas' : 'bg-white'} px-2 pt-[env(safe-area-inset-top)] lg:static lg:rounded-t-[28px] lg:pt-2`}>
        <button
          type="button"
          onClick={back}
          aria-label={t('Orqaga')}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition active:bg-canvas"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2.2} />
        </button>
        <h1 className={`min-w-0 flex-1 truncate text-center text-[17px] font-bold text-ink ${large ? 'invisible' : ''}`}>{title ? t(title) : null}</h1>
        <div className="flex min-w-11 justify-end pr-2">{right}</div>
      </header>
      {large && title ? <h2 className="px-5 pb-4 pt-2 text-[28px] font-extrabold leading-tight tracking-tight text-ink">{t(title)}</h2> : null}
      <div className="px-4">{children}</div>
      {footer}
    </div>
  )
}

export function Group({ title, children, className = '' }) {
  return (
    <section className={`mb-3 ${className}`}>
      {title ? <h3 className="mb-2 mt-5 px-1 text-[20px] font-extrabold tracking-tight text-ink">{t(title)}</h3> : null}
      <div className="overflow-hidden rounded-[22px] bg-canvas">{children}</div>
    </section>
  )
}

/** One row of a Group. `to` makes it a link, `onClick` a button; `right` replaces the chevron. */
export function Row({ icon: Icon, leading, title, subtitle, to, href, onClick, right, chevron = true, muted = false, danger = false }) {
  const body = (
    <>
      {leading ?? (Icon ? <Icon className={`ml-4 h-6 w-6 shrink-0 ${danger ? 'text-red-500' : muted ? 'text-muted' : 'text-ink'}`} strokeWidth={2} /> : <span className="ml-1" />)}
      <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-line/80 py-3.5 pr-4 group-last:border-b-0">
        <span className="min-w-0 flex-1">
          <span className={`block text-[16px] leading-snug ${danger ? 'text-red-500' : muted ? 'text-muted' : 'text-ink'}`}>{t(title)}</span>
          {subtitle ? <span className="mt-0.5 block text-[13px] leading-snug text-muted">{subtitle}</span> : null}
        </span>
        {right ?? (chevron && (to || href || onClick) ? <ChevronRight className="h-5 w-5 shrink-0 text-ink/70" /> : null)}
      </span>
    </>
  )
  const cls = 'group flex w-full items-center gap-4 text-left transition active:bg-black/[0.04]'
  if (to) return <Link to={to} className={cls}>{body}</Link>
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{body}</a>
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{body}</button>
  return <div className={cls}>{body}</div>
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-brand' : 'bg-black/10'}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-[left] duration-200 ${checked ? 'left-[24px]' : 'left-1'}`} />
    </button>
  )
}

export function QuickAction({ icon: Icon, label, to, onClick, badge }) {
  const inner = (
    <>
      <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full bg-canvas text-ink transition group-active:scale-95">
        <Icon className="h-7 w-7" strokeWidth={2.2} />
        {badge ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[12px] font-bold text-white ring-2 ring-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="mt-2 text-[14px] font-medium text-ink">{t(label)}</span>
    </>
  )
  const cls = 'group flex flex-1 flex-col items-center'
  return to ? (
    <Link to={to} onClick={onClick} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

/** Bottom sheet over a dimmed page; closes on backdrop tap and Escape. */
export function Sheet({ open, title, onClose, children }) {
  useScrollLock(open)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button type="button" aria-label={t('Yopish')} onClick={onClose} className="absolute inset-0 bg-black/40 animate-[fade-in_.15s_ease-out]" />
      <div className="relative w-full max-w-md rounded-t-[28px] bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-2xl animate-[sheet-up_.22s_cubic-bezier(.2,.8,.2,1)] sm:rounded-[28px]">
        <span className="mx-auto mb-2 block h-1 w-10 rounded-full bg-black/15 sm:hidden" />
        <div className="mb-3 flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate px-1 text-[20px] font-extrabold text-ink">{t(title)}</h3>
          <button type="button" onClick={onClose} aria-label={t('Yopish')} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Big rounded action button used at the bottom of sheets and screens. */
export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`flex h-14 w-full items-center justify-center rounded-[18px] bg-brand text-[16px] font-bold text-white transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}
