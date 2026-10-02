export const NEAR_KM = 2.5

export function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function around(origin, items, nearKm = NEAR_KM) {
  return items
    .map((s) => {
      const lat = origin.lat + s.dLat
      const lng = origin.lng + s.dLng
      const km = haversineKm(origin, { lat, lng })
      return { ...s, lat, lng, km, near: km <= nearKm }
    })
    .sort((a, b) => a.km - b.km)
}

export function googleMapsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
}

export function osmTilePreview(lat, lng, zoom = 15) {
  const n = 2 ** zoom
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
}

/** Yo‘nalish: haydovchi GPS → manzil. Koordinata bo‘lmasa matn qidiruvi. */
export function googleMapsDirUrl({ from, to, query }) {
  if (typeof to?.lat === 'number' && typeof to?.lng === 'number') {
    const dest = `${to.lat},${to.lng}`
    const origin =
      typeof from?.lat === 'number' && typeof from?.lng === 'number' ? `&origin=${from.lat},${from.lng}` : ''
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}${origin}&travelmode=driving`
  }
  const q = encodeURIComponent(query || '')
  const origin =
    typeof from?.lat === 'number' && typeof from?.lng === 'number' ? `&origin=${from.lat},${from.lng}` : ''
  return `https://www.google.com/maps/dir/?api=1&destination=${q}${origin}&travelmode=driving`
}

/** Road geometry between two points (OSRM public router, no API key). */
export async function fetchDrivingRoute(from, to) {
  if (!from || !to) return null
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const route = data.routes?.[0]
  if (!route?.geometry?.coordinates?.length) return null
  return {
    points: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    km: route.distance / 1000,
    seconds: route.duration,
  }
}

export function yandexMapsUrl(lat, lng) {
  return `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`
}

export function yandexMapsDirUrl({ from, to, query }) {
  if (typeof to?.lat === 'number' && typeof to?.lng === 'number') {
    const start =
      typeof from?.lat === 'number' && typeof from?.lng === 'number' ? `${from.lat},${from.lng}` : ''
    return `https://yandex.uz/maps/?rtext=${start}~${to.lat},${to.lng}&rtt=auto`
  }
  const q = encodeURIComponent(query || '')
  if (typeof from?.lat === 'number' && typeof from?.lng === 'number') {
    return `https://yandex.uz/maps/?rtext=${from.lat},${from.lng}~${q}&rtt=auto`
  }
  return `https://yandex.uz/maps/?text=${q}`
}

export async function sharePlace({ title, text, url }) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url })
      return
    }
  } catch {
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    // Clipboard API bloklangan bo‘lsa (HTTP yoki ruxsat yo‘q) — eski usulga qaytamiz.
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;top:-1000px;opacity:0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    if (ok) return 'copied'
  } catch {
    return 'failed'
  }
  return 'failed'
}
