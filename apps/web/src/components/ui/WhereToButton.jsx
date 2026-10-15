import { ChevronRight } from 'lucide-react'
import { t } from '../../i18n'

// The "Qayerga?" bar: TaxiLine's car pulls in from the left edge (its back cut off by the bar),
// the question sits in the middle and a dark arrow on the right. On hover/press the car rolls
// forward a little. `label` adds a small caption above the value (desktop home). Colours come
// from the theme tokens only (ink / canvas / muted), so the dark theme needs nothing extra.

export function WhereToButton({ value, placeholder = 'Qayerga?', label, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-16 w-full items-center overflow-hidden rounded-[20px] bg-canvas pl-[84px] pr-3 text-left transition-[filter] hover:brightness-[0.97] active:brightness-[0.94] ${className}`}
    >
      <img
        src="/home/where-car.webp"
        alt=""
        aria-hidden="true"
        draggable="false"
        width="420"
        height="256"
        className="pointer-events-none absolute -left-[38px] top-1/2 h-[58px] w-auto -translate-y-1/2 select-none drop-shadow-[0_4px_6px_rgba(15,29,42,0.12)] transition-transform duration-300 ease-out group-hover:translate-x-1.5 group-active:translate-x-2.5"
      />
      <span className={`min-w-0 flex-1 ${label ? '' : 'text-center'}`}>
        {label ? <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{t(label)}</span> : null}
        <span className={`block truncate font-bold ${label ? 'text-[16px]' : 'text-[17px]'} ${value ? 'text-ink' : label ? 'text-muted' : 'text-ink'}`}>
          {value || t(placeholder)}
        </span>
      </span>
      <span className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-canvas transition-transform duration-300 group-hover:translate-x-0.5">
        <ChevronRight className="h-4 w-4" strokeWidth={3} />
      </span>
    </button>
  )
}
