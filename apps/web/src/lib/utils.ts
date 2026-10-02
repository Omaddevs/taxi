export function formatSom(value: number | null | undefined): string {
  return `${new Intl.NumberFormat('uz-UZ').format(value || 0).replace(/,/g, ' ')} so'm`
}

const UZ_COUNTRY = '998'
const UZ_LOCAL_LEN = 9

/** Last 9 subscriber digits of an Uzbek mobile number (country code stripped, extra digits dropped). */
export function localPhoneDigitsUz(raw: string | number | null | undefined): string {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith(UZ_COUNTRY)) d = d.slice(UZ_COUNTRY.length)
  return d.slice(0, UZ_LOCAL_LEN)
}

/** Live input mask: `+998 87 735 36 36` (spaces appear as digits are typed). */
export function maskPhoneUz(raw: string | number | null | undefined): string {
  const d = localPhoneDigitsUz(raw)
  let out = '+998'
  if (d.length > 0) out += ` ${d.slice(0, 2)}`
  if (d.length > 2) out += ` ${d.slice(2, 5)}`
  if (d.length > 5) out += ` ${d.slice(5, 7)}`
  if (d.length > 7) out += ` ${d.slice(7, 9)}`
  return out
}

/** Local 9-digit mask without country code: `87 735 36 36`. */
export function maskLocalPhoneUz(raw: string | number | null | undefined): string {
  return maskPhoneUz(raw).replace(/^\+998\s?/, '')
}

export function toE164Uz(raw: string | number | null | undefined): string {
  return `+998${localPhoneDigitsUz(raw)}`
}

export function isCompletePhoneUz(raw: string | number | null | undefined): boolean {
  return localPhoneDigitsUz(raw).length === UZ_LOCAL_LEN
}

export function formatPhoneUz(phone: string | number | null | undefined): string {
  const d = String(phone || '').replace(/\D/g, '')
  if ((d.length === 12 && d.startsWith('998')) || d.length === 9) {
    return maskPhoneUz(phone)
  }
  return phone ? String(phone) : ''
}

export function driverCode(id: string | number | null | undefined): string {
  const raw = String(id || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase()
  return `TL${raw.padStart(6, '0').slice(-6)}`
}

export function inviteCode(id: string | number | null | undefined): string {
  return String(id || 'TAXILN')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase()
    .padStart(6, 'X')
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

const MONTHS = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
]

export function formatDateUz(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}, ${y}`
}

export function formatDateShortUz(iso: string | null | undefined): string {
  if (!iso) return ''
  const short = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${short[m - 1]}`
}

export { MONTHS }
