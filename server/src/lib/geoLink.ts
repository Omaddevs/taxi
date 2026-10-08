// Turns whatever staff paste into a map point: "41.28, 69.21", a Google/Yandex link with the
// coordinates in it, or a short share link (yandex.uz/maps/-/…, maps.app.goo.gl/…) that only
// reveals them after following its redirect — or inside the page it lands on.

export type LatLng = [number, number]

function valid(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  if (lat === 0 && lng === 0) return null
  return [lat, lng]
}

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)'

function safeDecode(text: string) {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '))
  } catch {
    return text
  }
}

/** Coordinates written inside a link or text, or null. Yandex puts longitude first. */
export function parseCoordinates(input: string): LatLng | null {
  const text = safeDecode(input.trim())
  if (!text) return null
  let m: RegExpMatchArray | null

  // Yandex, most precise first: the dropped pin (whatshere[point], pt), a route's start
  // (rtext, "lat,lng"), then the viewport centre (ll, sll). All but rtext are "lng,lat".
  for (const key of ['whatshere\\[point\\]', 'pt']) {
    m = text.match(new RegExp(`[?&]${key}=${NUM}\\s*,\\s*${NUM}`))
    const r = m && valid(Number(m[2]), Number(m[1]))
    if (r) return r
  }
  m = text.match(new RegExp(`[?&]rtext=${NUM}\\s*,\\s*${NUM}`))
  if (m) {
    const r = valid(Number(m[1]), Number(m[2]))
    if (r) return r
  }
  for (const key of ['ll', 'sll']) {
    m = text.match(new RegExp(`[?&]${key}=${NUM}\\s*,\\s*${NUM}`))
    const r = m && valid(Number(m[2]), Number(m[1]))
    if (r) return r
  }

  // Google: !3d<lat>!4d<lng> (exact pin) wins over @<lat>,<lng> (viewport).
  m = text.match(new RegExp(`!3d${NUM}!4d${NUM}`))
  if (m) return valid(Number(m[1]), Number(m[2]))
  m = text.match(new RegExp(`@${NUM},${NUM}`))
  if (m) return valid(Number(m[1]), Number(m[2]))
  m = text.match(new RegExp(`[?&](?:q|query|destination|center|daddr|text)=(?:loc:)?${NUM}\\s*,\\s*${NUM}`))
  if (m) return valid(Number(m[1]), Number(m[2]))
  m = text.match(new RegExp(`/maps/(?:search|place|dir)/${NUM}\\s*,\\s*${NUM}`))
  if (m) return valid(Number(m[1]), Number(m[2]))

  // Plain "41.28, 69.21" (also "41.28 69.21").
  m = text.match(new RegExp(`^${NUM}\\s*[,;\\s]\\s*${NUM}$`))
  if (m) return valid(Number(m[1]), Number(m[2]))
  return null
}

/**
 * Coordinates buried in a map page's HTML (Yandex org pages, Google place pages). Only markers
 * that name the place itself — a page's generic "ll=" is often just the default viewport, and a
 * captcha page (Yandex blocks servers) must never be read as a location.
 */
export function parseCoordinatesFromHtml(html: string): LatLng | null {
  if (/SmartCaptcha|showcaptcha|captcha-page|g-recaptcha/i.test(html)) return null
  let m = html.match(new RegExp(`"coordinates"\\s*:\\s*\\[\\s*${NUM}\\s*,\\s*${NUM}\\s*\\]`)) // Yandex: [lng, lat]
  if (m) {
    const r = valid(Number(m[2]), Number(m[1]))
    if (r) return r
  }
  m = html.match(new RegExp(`!3d${NUM}!4d${NUM}`))
  if (m) return valid(Number(m[1]), Number(m[2]))
  m = html.match(new RegExp(`center=${NUM}(?:%2C|,)${NUM}`)) // Google static map preview
  if (m) return valid(Number(m[1]), Number(m[2]))
  return null
}

// Only map services — this endpoint fetches a URL the user typed, so never let it reach
// anything else (internal hosts, metadata services…).
const ALLOWED_HOST = /(^|\.)(yandex\.(uz|ru|com|kz|by)|ya\.ru|google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl|g\.co)$/i

export function isMapLink(raw: string) {
  try {
    const url = new URL(raw.trim())
    return (url.protocol === 'https:' || url.protocol === 'http:') && ALLOWED_HOST.test(url.hostname)
  } catch {
    return false
  }
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'uz,ru;q=0.9,en;q=0.8',
}

/** Follows a map share link (redirects, then the page itself) until it yields a point. */
export async function resolveMapLink(raw: string): Promise<LatLng | null> {
  const direct = parseCoordinates(raw)
  if (direct) return direct
  if (!isMapLink(raw)) return null

  let url = raw.trim()
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, { redirect: 'manual', headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8000) })
    const location = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, url).toString()
      const fromUrl = parseCoordinates(next)
      if (fromUrl) return fromUrl
      if (!isMapLink(next)) return null
      url = next
      continue
    }
    if (!res.ok) return null
    const html = (await res.text()).slice(0, 3_000_000)
    return parseCoordinatesFromHtml(html)
  }
  return null
}
