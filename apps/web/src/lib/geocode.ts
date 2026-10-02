import { API_BASE } from './api'

export interface SavedLocation {
  label: string
  lat: number
  lng: number
  city: string
}

export const DEFAULT_LOCATION: SavedLocation = {
  label: 'Nasaf ko‘chasi, 12',
  lat: 38.86056,
  lng: 65.78991,
  city: 'Qarshi',
}

const CYR_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ғ: 'g‘', қ: 'q', ҳ: 'h', ў: 'o‘',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'J', З: 'Z', И: 'I', Й: 'Y',
  К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F',
  Х: 'X', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Sh', Ъ: '', Ы: 'I', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
  Ғ: 'G‘', Қ: 'Q', Ҳ: 'H', Ў: 'O‘',
}

function toLatin(value: string | null | undefined): string {
  if (!value) return ''
  if (!/[А-яЁёҒғҚқҲҳЎў]/.test(value)) return value
  return [...value].map((ch) => CYR_TO_LAT[ch] ?? ch).join('')
}

function formatRoad(road: string | null | undefined): string {
  if (!road) return ''
  const raw = road.trim()
  const isStreet = /улица|^ул\.|ulitsa|ko['‘’]cha/i.test(raw)
  const isProspect = /проспект|prospekt|shohko['‘’]cha/i.test(raw)
  let r = raw
    .replace(/^(улица|ул\.|проспект|переулок|ulitsa|prospekt)\s+/i, '')
    .replace(/\s+(улица|проспект|ulitsa|prospekt)$/i, '')
  r = toLatin(r).trim()
  if (isProspect && !/shohko['‘’]cha/i.test(r)) return `${r} shohko‘chasi`
  if (isStreet && !/ko['‘’]cha/i.test(r)) return `${r} ko‘chasi`
  return r
}

interface NominatimAddress {
  road?: string
  pedestrian?: string
  residential?: string
  street?: string
  house_number?: string
  suburb?: string
  neighbourhood?: string
  quarter?: string
  village?: string
  city?: string
  town?: string
  municipality?: string
  county?: string
}

export interface NominatimResult {
  address?: NominatimAddress
  display_name?: string
  lat?: string
  lon?: string
}

export function formatAddress(data: NominatimResult | null | undefined): string {
  if (!data) return 'Tanlangan nuqta'
  const a = data.address || {}
  const road = formatRoad(a.road || a.pedestrian || a.residential || a.street)
  const house = a.house_number
  const area = toLatin(a.suburb || a.neighbourhood || a.quarter || a.village)
  const city = toLatin(a.city || a.town || a.municipality || a.county)
  if (road && house) return `${road}, ${house}`
  if (road) return road
  if (area) return area
  if (city) return city
  const short = toLatin((data.display_name || '').split(',').slice(0, 2).join(',').trim())
  return short || 'Tanlangan nuqta'
}

export function polishLocationLabel(label: string | null | undefined): string | null | undefined {
  if (!label) return label
  if (!/улица|проспект|ул\.|[А-яЁёҒғҚқҲҳЎў]/i.test(label)) return label
  const [head, ...rest] = label.split(',').map((s) => s.trim())
  const road = formatRoad(head) || toLatin(head)
  const house = rest.find((p) => /^\d/.test(p))
  return house ? `${road}, ${house}` : road
}

export function extractCity(data: NominatimResult | null | undefined): string {
  const a = data?.address || {}
  return toLatin(a.city || a.town || a.municipality || a.county) || DEFAULT_LOCATION.city
}

export async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult> {
  const url = `${API_BASE}/geocode/reverse?lat=${lat}&lng=${lng}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Manzil topilmadi')
  return res.json()
}

export async function searchPlaces(query: string): Promise<NominatimResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url = `${API_BASE}/geocode/search?q=${encodeURIComponent(q)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Qidiruv ishlamadi')
  return res.json()
}

const geocodeCache = new Map<string, { lat: number; lng: number } | null>()

export async function geocodeUz(query: string | null | undefined): Promise<{ lat: number; lng: number } | null> {
  const key = String(query || '').trim().toLowerCase()
  if (key.length < 2) return null
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null
  try {
    const results = await searchPlaces(key)
    const hit = results[0] ? { lat: Number(results[0].lat), lng: Number(results[0].lon) } : null
    geocodeCache.set(key, hit)
    return hit
  } catch {
    geocodeCache.set(key, null)
    return null
  }
}
