import { getLanguage, t } from '../i18n'

export function formatSom(value) {
  return t('{0} so\'m', new Intl.NumberFormat('uz-UZ').format(value || 0).replace(/,/g, ' '))
}

const UZ_COUNTRY = '998'
const UZ_LOCAL_LEN = 9

/** Last 9 subscriber digits of an Uzbek mobile number (country code stripped, extra digits dropped). */
export function localPhoneDigitsUz(raw) {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith(UZ_COUNTRY)) d = d.slice(UZ_COUNTRY.length)
  return d.slice(0, UZ_LOCAL_LEN)
}

/** Live input mask: `+998 87 735 36 36` (spaces appear as digits are typed). */
export function maskPhoneUz(raw) {
  const d = localPhoneDigitsUz(raw)
  let out = '+998'
  if (d.length > 0) out += ` ${d.slice(0, 2)}`
  if (d.length > 2) out += ` ${d.slice(2, 5)}`
  if (d.length > 5) out += ` ${d.slice(5, 7)}`
  if (d.length > 7) out += ` ${d.slice(7, 9)}`
  return out
}

/** Local 9-digit mask without country code: `87 735 36 36`. */
export function maskLocalPhoneUz(raw) {
  return maskPhoneUz(raw).replace(/^\+998\s?/, '')
}

export function toE164Uz(raw) {
  return `+998${localPhoneDigitsUz(raw)}`
}

export function isCompletePhoneUz(raw) {
  return localPhoneDigitsUz(raw).length === UZ_LOCAL_LEN
}

export function formatPhoneUz(phone) {
  const d = String(phone || '').replace(/\D/g, '')
  if ((d.length === 12 && d.startsWith('998')) || d.length === 9) {
    return maskPhoneUz(phone)
  }
  return phone || ''
}

export function driverCode(id) {
  const raw = String(id || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase()
  return `TL${raw.padStart(6, '0').slice(-6)}`
}

export function inviteCode(id) {
  return String(id || 'TAXILN')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase()
    .padStart(6, 'X')
}

export function cn(...classes) {
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

// Ruscha sanada oy qaratqich kelishigida: "10 октября"
const MONTHS_RU_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

const isUzbek = () => ['uz', 'oz'].includes(getLanguage())

/** Oy nomi (bosh kelishik) joriy tilda: "Oktabr" / "Октябрь" / "October". `lower` faqat o‘zbekchaga ta’sir qiladi. */
export function monthName(index, { lower = false } = {}) {
  const name = t(MONTHS[index])
  return lower && isUzbek() ? name.toLowerCase() : name
}

/** Qisqa oy nomi: "Okt" / "окт" / "Oct". */
export function shortMonth(index, { lower = false } = {}) {
  const name = t(MONTHS_SHORT[index])
  return lower && isUzbek() ? name.toLowerCase() : name
}

/** Kun + oy joriy tilda: "10 Oktabr" / "10 октября" / "10 October". `dash` — o‘zbekcha "10-Oktabr" ko‘rinishi. */
export function dayMonth(day, index, { dash = false, lower = false } = {}) {
  const lang = getLanguage()
  if (lang === 'ru') return `${day} ${MONTHS_RU_GENITIVE[index]}`
  if (lang === 'en') return `${day} ${monthName(index)}`
  const name = monthName(index, { lower })
  return dash ? `${day}-${name}` : `${day} ${name}`
}

export function formatDateUz(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${dayMonth(d, m - 1)}, ${y}`
}

export function formatDateShortUz(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${shortMonth(m - 1)}`
}

export { MONTHS }
