import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function ScreenHeader({ title, subtitle, right, back = true, className = '' }) {
  const navigate = useNavigate()

  return (
    <header
      className={`relative z-0 mb-3 mt-0 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_6px_20px_rgba(28,28,40,0.05)] lg:hidden ${className}`}
    >
      {back ? (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-ink"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <div className="h-10 w-10" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
      </div>
      {right ?? <div className="h-10 w-10" />}
    </header>
  )
}

export function PageTitle({ title, subtitle, right, className = '' }) {
  return (
    <div className={`mb-5 hidden items-end justify-between gap-4 lg:flex ${className}`}>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  )
}
