import { Search } from 'lucide-react'
import { cn } from '../../lib/utils'

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={cn('relative block', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-line bg-white pr-3 pl-9 text-sm outline-none focus:border-brand"
      />
    </label>
  )
}

export function FilterPills({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={
            value === option.value
              ? 'rounded-full bg-brand px-3.5 py-1.5 text-sm font-semibold text-white'
              : 'rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-ink hover:bg-canvas'
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
