import { cn, initials } from '../../lib/utils'

export function Avatar({ name, src, size = 'md' }: { name?: string | null; src?: string | null; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-sm'
  if (src) {
    return <img src={src} alt="" className={cn('rounded-full object-cover', dim)} />
  }
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full bg-brand-soft font-bold text-brand-dark', dim)}>
      {initials(name, '•')}
    </span>
  )
}
