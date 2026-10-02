import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Card } from './Button'

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Yopish" onClick={onClose} />
      <Card className={cn('relative z-10 w-full p-5', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </Card>
    </div>
  )
}
