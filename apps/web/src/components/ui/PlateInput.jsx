import { useRef } from 'react'
import { t } from '../../i18n'

// O‘zbekiston davlat raqami ko‘rinishidagi input: chapda hudud kodi (2 raqam), o‘ngda seriya va raqam,
// oxirida bayroq + "UZ". Ikki format qo‘llanadi:
//   jismoniy shaxs — 01 A 123 BC (harf, 3 raqam, 2 harf)
//   yuridik shaxs  — 01 123 ABC  (3 raqam, 3 harf)
// Qiymat "01 A 123 BC" ko‘rinishidagi bitta satr bo‘lib chiqadi.

const PERSONAL = ['L', 'D', 'D', 'D', 'L', 'L']
const LEGAL = ['D', 'D', 'D', 'L', 'L', 'L']

function fits(char, kind) {
  return kind === 'L' ? /[A-Z]/.test(char) : /\d/.test(char)
}

/** Kiritilgan belgilardan faqat format mos keladiganlarini qoldiradi (maks. 6 ta). */
function cleanSeries(raw) {
  const chars = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .split('')
  if (!chars.length) return ''
  const pattern = /\d/.test(chars[0]) ? LEGAL : PERSONAL
  let out = ''
  for (const ch of chars) {
    if (out.length >= pattern.length) break
    if (fits(ch, pattern[out.length])) out += ch
  }
  return out
}

function formatSeries(series) {
  if (!series) return ''
  if (/\d/.test(series[0])) return [series.slice(0, 3), series.slice(3)].filter(Boolean).join(' ')
  return [series.slice(0, 1), series.slice(1, 4), series.slice(4)].filter(Boolean).join(' ')
}

export function parsePlateUz(value) {
  const compact = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  const match = compact.match(/^(\d{1,2})(.*)$/)
  // Hudud kodi faqat boshida 2 ta raqam bo‘lsa ajratiladi; "123ABC" kabi qiymatda hudud yo‘q.
  if (match && (match[1].length === 2 || !match[2])) {
    return { region: match[1], series: cleanSeries(match[2]) }
  }
  return { region: '', series: cleanSeries(compact) }
}

export function formatPlateUz({ region, series }) {
  return [region, formatSeries(series)].filter(Boolean).join(' ')
}

export function isValidPlateUz(value) {
  const { region, series } = parsePlateUz(value)
  return /^\d{2}$/.test(region) && (/^[A-Z]\d{3}[A-Z]{2}$/.test(series) || /^\d{3}[A-Z]{3}$/.test(series))
}

function UzFlag({ className = '' }) {
  return (
    <svg viewBox="0 0 30 18" className={className} aria-hidden="true">
      <rect width="30" height="6" fill="#1eb3e6" />
      <rect y="6" width="30" height="6" fill="#fff" />
      <rect y="12" width="30" height="6" fill="#1eb53a" />
      <rect y="5.6" width="30" height="0.8" fill="#ce1126" />
      <rect y="11.6" width="30" height="0.8" fill="#ce1126" />
      <circle cx="5" cy="3" r="2.1" fill="#fff" />
      <circle cx="5.9" cy="3" r="1.8" fill="#1eb3e6" />
      {[9, 11, 13].map((x) => (
        <circle key={x} cx={x} cy="2" r="0.45" fill="#fff" />
      ))}
      {[9, 11, 13].map((x) => (
        <circle key={`b${x}`} cx={x} cy="4" r="0.45" fill="#fff" />
      ))}
    </svg>
  )
}

export function PlateInput({ value, onChange, className = '', autoFocus = false }) {
  const { region, series } = parsePlateUz(value)
  const regionRef = useRef(null)
  const seriesRef = useRef(null)

  const emit = (next) => onChange(formatPlateUz({ region, series, ...next }))

  return (
    <div
      className={`relative flex h-[66px] w-full max-w-[360px] items-stretch rounded-[12px] border-[3px] border-ink bg-white text-ink shadow-[0_8px_18px_rgba(15,29,42,0.16)] ${className}`}
    >
      <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-ink" aria-hidden />
      <span className="absolute right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-ink" aria-hidden />

      <input
        ref={regionRef}
        value={region}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '').slice(0, 2)
          emit({ region: next })
          if (next.length === 2) seriesRef.current?.focus()
        }}
        placeholder="00"
        inputMode="numeric"
        autoFocus={autoFocus}
        aria-label={t('Hudud kodi')}
        className="w-[64px] shrink-0 bg-transparent pl-3 text-center text-[34px] font-black leading-none tracking-wide outline-none placeholder:text-slate-300"
      />

      <span className="w-[3px] shrink-0 bg-ink" aria-hidden />

      <input
        ref={seriesRef}
        value={formatSeries(series)}
        onChange={(e) => emit({ series: cleanSeries(e.target.value) })}
        onKeyDown={(e) => {
          if (e.key === 'Backspace' && !series) regionRef.current?.focus()
        }}
        placeholder={t('A 123 NN')}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-label={t('Seriya va raqam')}
        className="min-w-0 flex-1 bg-transparent px-2 text-center text-[34px] font-black uppercase leading-none tracking-wide outline-none placeholder:text-slate-300"
      />

      <span className="flex w-[46px] shrink-0 flex-col items-center justify-center gap-1 pr-3" aria-hidden>
        <UzFlag className="h-[16px] w-[27px] rounded-[2px] ring-1 ring-ink/15" />
        <span className="text-[15px] font-black leading-none text-[#1e9bd7]">UZ</span>
      </span>
    </div>
  )
}
