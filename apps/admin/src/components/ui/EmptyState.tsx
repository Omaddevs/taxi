import type { LucideIcon } from 'lucide-react'
import { Card } from './Button'

export function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon
  title: string
  text?: string
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-canvas text-muted">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-bold text-ink">{title}</p>
      {text ? <p className="mt-1 max-w-sm text-sm text-muted">{text}</p> : null}
    </Card>
  )
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
      ))}
    </div>
  )
}

export function SkeletonTable() {
  return <div className="h-72 animate-pulse rounded-2xl bg-white" />
}
