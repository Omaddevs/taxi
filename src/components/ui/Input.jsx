import { cn } from '../../lib/utils'

export function Field({ label, icon: Icon, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label ? <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span> : null}
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /> : null}
        {children}
      </div>
    </label>
  )
}

export function Input({ className, icon, ...props }) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15',
        icon && 'pl-10',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
