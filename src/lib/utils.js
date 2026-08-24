export function formatSom(value) {
  return `${new Intl.NumberFormat('uz-UZ').format(value).replace(/,/g, ' ')} so'm`
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

export function formatDateUz(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}, ${y}`
}

export function formatDateShortUz(iso) {
  if (!iso) return ''
  const short = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${short[m - 1]}`
}

export { MONTHS }
