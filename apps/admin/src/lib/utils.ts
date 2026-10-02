export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const UZ_COUNTRY = '998'
const UZ_LOCAL_LEN = 9

export function localPhoneDigitsUz(raw: string) {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith(UZ_COUNTRY)) d = d.slice(UZ_COUNTRY.length)
  return d.slice(0, UZ_LOCAL_LEN)
}

export function maskLocalPhoneUz(raw: string) {
  const d = localPhoneDigitsUz(raw)
  let out = ''
  if (d.length > 0) out += d.slice(0, 2)
  if (d.length > 2) out += ` ${d.slice(2, 5)}`
  if (d.length > 5) out += ` ${d.slice(5, 7)}`
  if (d.length > 7) out += ` ${d.slice(7, 9)}`
  return out
}

export function toE164Uz(raw: string) {
  return `+${UZ_COUNTRY}${localPhoneDigitsUz(raw)}`
}

export function formatPhoneUz(raw: string | null | undefined) {
  if (!raw) return '—'
  const digits = String(raw).replace(/\D/g, '')
  const local = digits.startsWith(UZ_COUNTRY) ? digits.slice(UZ_COUNTRY.length) : digits
  if (local.length !== UZ_LOCAL_LEN) return raw
  return `+${UZ_COUNTRY} ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`
}

export function isCompletePhoneUz(raw: string) {
  return localPhoneDigitsUz(raw).length === UZ_LOCAL_LEN
}

export function formatSom(value: number) {
  return `${new Intl.NumberFormat('uz-UZ').format(value).replace(/,/g, ' ')} so'm`
}

const TZ = 'Asia/Tashkent'
const MONTHS_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
]

function tashkentParts(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const map: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const part of new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  const month = Number(map.month)
  const hour = String(map.hour ?? '0').padStart(2, '0')
  const minute = String(map.minute ?? '0').padStart(2, '0')
  return {
    year: Number(map.year),
    month,
    day: Number(map.day),
    hour,
    minute,
    monthName: MONTHS_UZ[month - 1] ?? '',
  }
}

function dayStamp(p: { year: number; month: number; day: number }) {
  return p.year * 10000 + p.month * 100 + p.day
}

export function formatTime(iso: string | null | undefined) {
  const p = iso ? tashkentParts(iso) : null
  return p ? `${p.hour}:${p.minute}` : '—'
}

export function formatDate(iso: string | null | undefined) {
  const p = iso ? tashkentParts(iso) : null
  if (!p) return '—'
  const today = tashkentParts(new Date().toISOString())
  if (today) {
    const diff = dayStamp(p) - dayStamp(today)
    if (diff === 0) return 'Bugun'
    if (diff === -1) return 'Kecha'
    if (diff === 1) return 'Ertaga'
    if (p.year === today.year) return `${p.day}-${p.monthName}`
  }
  return `${p.day}-${p.monthName} ${p.year}`
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const p = tashkentParts(iso)
  if (!p) return '—'
  return `${formatDate(iso)}, ${p.hour}:${p.minute}`
}

export function formatShortDay(isoDate: string) {
  return formatDate(`${isoDate}T12:00:00+05:00`)
}

export function initials(name: string | null | undefined, fallback = '?') {
  const src = (name || '').trim()
  if (!src) return fallback
  const parts = src.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback
}

export function displayName(user: { name?: string | null; phone?: string } | null | undefined) {
  if (!user) return '—'
  return user.name || user.phone || '—'
}

export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function daysAgo(n: number) {
  const d = startOfToday()
  d.setDate(d.getDate() - n)
  return d
}
