import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

export function PageHeader({
  title,
  subtitle,
  action,
  onBack,
  backLabel = 'Ortga qaytish',
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  onBack?: () => void
  backLabel?: string
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 lg:sticky lg:top-0 lg:z-10 lg:-mx-8 lg:-mt-8 lg:border-b lg:border-line lg:bg-white/95 lg:px-8 lg:py-6 lg:shadow-[0_1px_0_rgba(28,28,40,0.04)] lg:backdrop-blur">
      <div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
        ) : null}
        <h1 className="text-xl font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}
