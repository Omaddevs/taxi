export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function formatSom(value: number) {
  return `${new Intl.NumberFormat('uz-UZ').format(value).replace(/,/g, ' ')} so'm`
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' })
}
