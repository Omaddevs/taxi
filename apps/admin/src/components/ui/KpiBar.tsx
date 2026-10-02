import { cn } from '../../lib/utils'

export function KpiBar({
  label,
  actual,
  target,
  suffix = '',
}: {
  label: string
  actual: number
  target: number
  suffix?: string
}) {
  const pct = !target ? (actual > 0 ? 100 : 0) : Math.min(100, Math.round((actual / target) * 100))
  const over = target > 0 && actual >= target
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="text-sm font-bold text-ink">
          {actual.toLocaleString('uz-UZ')}
          {target ? <span className="font-semibold text-muted"> / {target.toLocaleString('uz-UZ')}</span> : null}
          {suffix}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-canvas">
        <div
          className={cn('h-full rounded-full', over ? 'bg-emerald-500' : 'bg-brand')}
          style={{ width: `${Math.max(target || actual ? pct : 0, actual ? 6 : 0)}%` }}
        />
      </div>
    </div>
  )
}
