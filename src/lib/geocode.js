const NOMINATIM = 'https://nominatim.openstreetmap.org'

export const DEFAULT_LOCATION = {
  label: 'Nasaf ko‘chasi, 12',
  lat: 38.86056,
  lng: 65.78991,
  city: 'Qarshi',
}

const CYR_TO_LAT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ғ: 'g‘', қ: 'q', ҳ: 'h', ў: 'o‘',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'J', З: 'Z', И: 'I', Й: 'Y',
  К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F',
  Х: 'X', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Sh', Ъ: '', Ы: 'I', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
  Ғ: 'G‘', Қ: 'Q', Ҳ: 'H', Ў: 'O‘',
}

function toLatin(value) {
  if (!value) return ''
  if (!/[А-яЁёҒғҚқҲҳЎў]/.test(value)) return value
  return [...value].map((ch) => CYR_TO_LAT[ch] ?? ch).join('')
}

function formatRoad(road) {
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

function nominatimHeaders() {
  return {
    Accept: 'application/json',
    'Accept-Language': 'uz,ru,en',
  }
}

export function formatAddress(data) {
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

export function polishLocationLabel(label) {
  if (!label) return label
  if (!/улица|проспект|ул\.|[А-яЁёҒғҚқҲҳЎў]/i.test(label)) return label
  const [head, ...rest] = label.split(',').map((s) => s.trim())
  const road = formatRoad(head) || toLatin(head)
  const house = rest.find((p) => /^\d/.test(p))
  return house ? `${road}, ${house}` : road
}

export function extractCity(data) {
  const a = data?.address || {}
  return toLatin(a.city || a.town || a.municipality || a.county) || DEFAULT_LOCATION.city
}

export async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&zoom=18&accept-language=uz`
  const res = await fetch(url, { headers: nominatimHeaders() })
  if (!res.ok) throw new Error('Manzil topilmadi')
  return res.json()
}

export async function searchPlaces(query) {
  const q = query.trim()
  if (q.length < 2) return []
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=jsonv2&addressdetails=1&limit=6&countrycodes=uz&accept-language=uz&viewbox=55.9,45.6,73.2,37.1`
  const res = await fetch(url, { headers: nominatimHeaders() })
  if (!res.ok) throw new Error('Qidiruv ishlamadi')
  return res.json()
}
