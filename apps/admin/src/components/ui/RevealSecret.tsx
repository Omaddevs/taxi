import { useState } from 'react'
import { cn } from '../../lib/utils'

export function RevealSecret({
  value,
  empty = 'Belgilanmagan',
  className,
}: {
  value: string | null | undefined
  empty?: string
  className?: string
}) {
  const [show, setShow] = useState(false)
  if (!value) return <span className={cn('text-sm text-muted', className)}>{empty}</span>
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <code className="rounded-lg bg-canvas px-2 py-0.5 font-mono text-sm font-semibold text-ink">
        {show ? value : '••••••••'}
      </code>
      <button
        type="button"
        className="text-xs font-bold text-brand-dark hover:underline"
        onClick={(e) => {
          e.stopPropagation()
          setShow((v) => !v)
        }}
      >
        {show ? 'Yashirish' : 'Ko‘rsat'}
      </button>
    </span>
  )
}
