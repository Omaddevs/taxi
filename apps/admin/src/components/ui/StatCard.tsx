import type { LucideIcon } from 'lucide-react'
import { Card } from './Button'
import { cn } from '../../lib/utils'

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'brand',
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  tone?: 'brand' | 'success' | 'amber' | 'slate'
}) {
  const tones = {
    brand: 'bg-brand-soft text-brand',
    success: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  }

  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-0.5 text-xl font-extrabold text-ink">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
    </Card>
  )
}
