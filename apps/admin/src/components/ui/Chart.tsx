import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function SparkBars({
  items,
}: {
  items: { key: string; label: string; value: number }[]
}) {
  const peak = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="flex h-40 items-end gap-1.5">
      {items.map((item) => (
        <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-ink">{item.value || ''}</span>
          <div className="flex h-24 w-full items-end">
            <div
              className="w-full rounded-t-lg bg-brand/80"
              style={{ height: `${Math.max(8, (item.value / peak) * 100)}%` }}
            />
          </div>
          <span className="truncate text-[10px] font-medium text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export function StatusMeter({
  items,
}: {
  items: { key: string; label: string; value: number; color: string }[]
}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-canvas">
        {items.map((item) => (
          <div
            key={item.key}
            className={cn('h-full', item.color)}
            style={{ width: `${(item.value / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted">
              <span className={cn('h-2 w-2 rounded-full', item.color)} />
              {item.label}
            </span>
            <span className="font-semibold text-ink">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand'
