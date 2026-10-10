import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, MapPin, Search, X } from 'lucide-react'
import { REGIONS } from '../../data/uzbekistan'

// Region → district dropdown for the Haydovchilar filters. `value` is { region, district } (either
// may be null). Picking a region shows its districts, with "Butun viloyat" on top; the list is
// searchable at both steps. Rendered as a popover under the field (full-width sheet on phones).

export function placeQuery(value) {
  // Ads are labelled "Samarqand, Urgut" (RegionPicker) or free text from older ads — a district
  // is matched by its own name, a region by its name without "viloyati/shahri", so "Toshkent
  // viloyati" also finds ads that just say "Toshkent".
  if (!value?.region) return ''
  if (value.district) return value.district
  return value.region.replace(/\s+(viloyati|shahri)$/i, '').trim()
}

export function placeLabel(value) {
  if (!value?.region) return ''
  return value.district ? `${value.region}, ${value.district}` : value.region
}

export function PlaceSelect({ value, onChange, placeholder, icon: Icon = MapPin }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('region')
  const [picked, setPicked] = useState(null)
  const [query, setQuery] = useState('')
  const root = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onDown(e) {
      if (!root.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setPicked(value?.region ? REGIONS.find((r) => r.name === value.region) ?? null : null)
    setStep(value?.region ? 'district' : 'region')
    setQuery('')
    setOpen(true)
  }

  function choose(region, district) {
    onChange({ region, district })
    setOpen(false)
  }

  const q = query.trim().toLowerCase()
  const regions = REGIONS.filter((r) => !q || r.name.toLowerCase().includes(q) || r.districts.some((d) => d.toLowerCase().includes(q)))
  const districts = (picked?.districts ?? []).filter((d) => !q || d.toLowerCase().includes(q))
  const label = placeLabel(value)

  return (
    <div ref={root} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-12 w-full min-w-0 items-center gap-2 rounded-xl px-3 text-left transition ${open ? 'bg-white ring-2 ring-brand/50' : 'bg-canvas'}`}
      >
        <Icon className="h-4 w-4 shrink-0 text-brand" />
        <span className={`min-w-0 flex-1 truncate text-[14px] font-semibold ${label ? 'text-ink' : 'text-muted'}`}>{label || placeholder}</span>
        {label ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Tozalash"
            onClick={(e) => {
              e.stopPropagation()
              onChange({ region: null, district: null })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
                onChange({ region: null, district: null })
              }
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/5 hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open ? <button type="button" aria-label="Yopish" onClick={() => setOpen(false)} className="fixed inset-0 z-[140] bg-black/30 sm:hidden" /> : null}
      {open ? (
        <div
          role="listbox"
          className="fixed inset-x-3 bottom-3 z-[150] flex max-h-[70vh] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_24px_60px_-12px_rgba(15,29,42,0.45)] ring-1 ring-black/5 sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-[calc(100%+8px)] sm:max-h-[420px] sm:w-[340px]"
        >
          <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
            {step === 'district' ? (
              <button
                type="button"
                onClick={() => {
                  setStep('region')
                  setQuery('')
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-ink"
                aria-label="Viloyatlarga qaytish"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-canvas px-3">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={step === 'district' ? `${picked?.name}: tuman qidiring` : 'Viloyat yoki tuman qidiring'}
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none placeholder:font-medium placeholder:text-muted"
              />
            </label>
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
            {step === 'region' ? (
              <>
                {/* Searching by a district name jumps straight to it. */}
                {q
                  ? REGIONS.flatMap((r) => r.districts.filter((d) => d.toLowerCase().includes(q)).map((d) => ({ r, d })))
                      .slice(0, 8)
                      .map(({ r, d }) => (
                        <li key={`${r.id}-${d}`}>
                          <button type="button" onClick={() => choose(r.name, d)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-canvas">
                            <MapPin className="h-4 w-4 shrink-0 text-brand" />
                            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{d}</span>
                            <span className="shrink-0 text-[12px] text-muted">{r.name}</span>
                          </button>
                        </li>
                      ))
                  : null}
                {regions.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(r)
                        setStep('district')
                        setQuery('')
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-canvas ${value?.region === r.name ? 'bg-brand-soft/60' : ''}`}
                    >
                      <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{r.name}</span>
                      <span className="shrink-0 text-[12px] text-muted">{r.districts.length} ta tuman</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                    </button>
                  </li>
                ))}
                {!regions.length && q ? <li className="px-3 py-6 text-center text-sm text-muted">Hech narsa topilmadi</li> : null}
              </>
            ) : (
              <>
                {!q ? (
                  <li>
                    <button type="button" onClick={() => choose(picked.name, null)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-canvas">
                      <span className="min-w-0 flex-1 text-[14px] font-extrabold text-brand-dark">Butun viloyat — {picked?.name}</span>
                      {value?.region === picked?.name && !value?.district ? <Check className="h-4 w-4 text-brand" /> : null}
                    </button>
                  </li>
                ) : null}
                {districts.map((d) => (
                  <li key={d}>
                    <button type="button" onClick={() => choose(picked.name, d)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-canvas">
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{d}</span>
                      {value?.region === picked?.name && value?.district === d ? <Check className="h-4 w-4 text-brand" /> : null}
                    </button>
                  </li>
                ))}
                {!districts.length && q ? <li className="px-3 py-6 text-center text-sm text-muted">Bunday tuman topilmadi</li> : null}
              </>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
