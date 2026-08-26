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
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function yandexMapsUrl(lat, lng) {
  return `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`
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
