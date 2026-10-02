export const UZ_REGIONS = [
  "Qoraqalpog'iston Respublikasi",
  'Andijon viloyati',
  'Buxoro viloyati',
  "Farg'ona viloyati",
  'Jizzax viloyati',
  'Xorazm viloyati',
  'Namangan viloyati',
  'Navoiy viloyati',
  'Qashqadaryo viloyati',
  'Samarqand viloyati',
  'Sirdaryo viloyati',
  'Surxondaryo viloyati',
  'Toshkent viloyati',
  'Toshkent shahri',
]

function normalizePlace(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’ʻ`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function regionSearchKey(region) {
  return normalizePlace(region).replace(/\s+(viloyati|shahri|respublikasi)$/i, '').trim()
}

/** Buyurtma tanlangan ish hududlariga tushadimi. Bo‘sh ro‘yxat — barcha hududlar. */
export function orderInWorkRegions(order, regions) {
  if (!regions?.length) return true
  const hay = normalizePlace(`${order?.from || ''} ${order?.fromHint || ''} ${order?.to || ''}`)
  return regions.some((region) => hay.includes(regionSearchKey(region)))
}
