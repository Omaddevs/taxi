import { UZ_BORDER } from '../../../data/uzBorder'
import { UZ_CITIES } from '../../../data/uzCities'
import { t } from '../../../i18n'

/* Geometry and data of the landing's Uzbekistan tour, shared by the 3D map (UzbekistanScene) and
   the drive screen (DriveScreen): the projected border and walls, terrain, the 13 regions, the
   tour's legs with their screen paths, and the van's rendered views. */

/* ── Landing: Uzbekistan as a raised 3D slab (real border, walls, shadow, desert-to-valley
   tint, mountains), with TaxiLine's minivan touring all 13 regions: Andijon → Toshkent →
   Samarqand → … → Farg‘ona → Andijon. The van is a set of rendered views; the one shown
   follows its heading on screen, so it turns like a 3D model. A card tells the current leg,
   distance and time left.

   Plan coordinates come from lng/lat; iso() turns and tilts them onto the screen. Per frame
   only the van, the lit route and the card's step change — through refs, not re-renders. ── */

const K = 10 // plan units per degree of latitude
const LNG0 = 55.9
const LAT0 = 45.7
const LNG_SCALE = Math.cos((41 * Math.PI) / 180)
const plan = ([lng, lat]) => [(lng - LNG0) * LNG_SCALE * K, (LAT0 - lat) * K]

const S = 7.4
const TURN = (7 * Math.PI) / 180
const TILT = 0.6
const SIN = Math.sin(TURN)
const COS = Math.cos(TURN)
export const iso = (x, y, z = 0) => [(x * COS - y * SIN) * S, (x * SIN + y * COS) * TILT * S - z * S]
const depth = (x, y) => x * SIN + y * COS
export const HEIGHT = 2.4 // slab thickness, plan units

export const BORDER = UZ_BORDER.map(plan)
export const pointsAt = (list, z) => list.map(([x, y]) => iso(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ')

function inside([px, py], poly = BORDER) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

// Walls turned towards the viewer, back to front, shaded by how they face the light.
export const WALLS = (() => {
  const walls = []
  for (let i = 0; i < BORDER.length; i++) {
    const a = BORDER[i]
    const b = BORDER[(i + 1) % BORDER.length]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    let n = [dy / len, -dx / len]
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    if (inside([mid[0] + n[0] * 0.3, mid[1] + n[1] * 0.3])) n = [-n[0], -n[1]]
    const facing = n[0] * SIN + n[1] * COS
    if (facing <= 0) continue
    const light = Math.max(0, n[0] * -0.55 + n[1] * 0.83) // lit from the front-left
    const shade = Math.round(196 + light * 34)
    walls.push({ d: depth(mid[0], mid[1]), a, b, fill: `rgb(${shade - 22} ${shade - 10} ${shade})` })
  }
  return walls.sort((p, q) => p.d - q.d)
})()

// Mountain ranges (lng, lat, size): Chatkal and Qurama, Nurota, Zarafshon, Hisor.
export const PEAKS = [
  [70.05, 41.62, 1.25],
  [70.55, 41.35, 1],
  [70.35, 41.0, 0.85],
  [66.45, 40.55, 0.8],
  [66.95, 40.45, 0.65],
  [67.55, 39.25, 0.85],
  [67.95, 38.75, 1.1],
  [67.6, 38.35, 0.8],
  [71.15, 41.62, 0.75],
]
  .map(([lng, lat, s]) => ({ p: plan([lng, lat]), s }))
  .filter(({ p }) => inside(p))

// Orchards in the Farg‘ona valley and around Toshkent.
export const TREES = [
  [71.0, 40.62],
  [71.35, 40.75],
  [71.95, 40.62],
  [72.15, 40.95],
  [70.75, 40.55],
  [69.55, 41.05],
  [68.95, 40.7],
  [64.9, 39.9],
  [66.6, 39.75],
  [60.95, 41.7],
]
  .map((c) => plan(c))
  .filter((p) => inside(p))

// The tour, leg by leg.
export const TOUR = ['andijon', 'toshkent', 'samarqand', 'buxoro', 'xiva', 'nukus', 'navoiy', 'qarshi', 'termiz', 'jizzax', 'guliston', 'namangan', 'fargona', 'andijon']
export const CITY_KEYS = [...new Set(TOUR)]
export const CITIES = Object.fromEntries(CITY_KEYS.map((k) => [k, { ...UZ_CITIES[k], p: plan([UZ_CITIES[k].lng, UZ_CITIES[k].lat]) }]))

// The map and the card name the 13 regions; the marker sits on the regional centre.
export const REGION_NAME = {
  andijon: 'Andijon',
  toshkent: 'Toshkent',
  samarqand: 'Samarqand',
  buxoro: 'Buxoro',
  xiva: 'Xorazm',
  nukus: 'Qoraqalpog‘iston Respublikasi',
  navoiy: 'Navoiy',
  qarshi: 'Qashqadaryo',
  termiz: 'Surxondaryo',
  jizzax: 'Jizzax',
  guliston: 'Sirdaryo',
  namangan: 'Namangan',
  fargona: 'Farg‘ona',
}

// Where each name sits around its marker, so the crowded east stays readable.
export const LABEL_SIDE = {
  toshkent: 'top',
  guliston: 'bottom',
  jizzax: 'top',
  samarqand: 'bottom',
  namangan: 'top',
  andijon: 'right',
  fargona: 'bottom',
  buxoro: 'top',
  navoiy: 'top',
  qarshi: 'bottom',
  termiz: 'bottom',
  xiva: 'right',
  nukus: 'top',
}

function haversineKm(a, b) {
  const r = (d) => (d * Math.PI) / 180
  const dLat = r(b.lat - a.lat)
  const dLng = r(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const SAMPLES = 48
export const LEGS = TOUR.slice(1).map((to, i) => {
  const from = TOUR[i]
  const A = CITIES[from].p
  const B = CITIES[to].p
  const dx = B[0] - A[0]
  const dy = B[1] - A[1]
  const bend = (i % 2 ? 1 : -1) * 0.14
  const C = [(A[0] + B[0]) / 2 - dy * bend, (A[1] + B[1]) / 2 + dx * bend]
  const pts = []
  for (let s = 0; s <= SAMPLES; s++) {
    const u = s / SAMPLES
    const x = (1 - u) ** 2 * A[0] + 2 * (1 - u) * u * C[0] + u * u * B[0]
    const y = (1 - u) ** 2 * A[1] + 2 * (1 - u) * u * C[1] + u * u * B[1]
    pts.push(iso(x, y, HEIGHT))
  }
  const acc = [0]
  for (let s = 1; s < pts.length; s++) acc.push(acc[s - 1] + Math.hypot(pts[s][0] - pts[s - 1][0], pts[s][1] - pts[s - 1][1]))
  const km = Math.round(haversineKm(CITIES[from], CITIES[to]) * 1.22)
  return { from, to, pts, acc, len: acc[acc.length - 1], km, minutes: Math.round((km / 75) * 60), d: `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')}` }
})

// The van's rendered views: `w` = its width in the source render (keeps one size on screen).
export const VIEWS = {
  l: { w: 503, ratio: 0.453 },
  fl: { w: 487, ratio: 0.597 },
  f: { w: 317, ratio: 0.875 },
  fr: { w: 490, ratio: 0.597 },
  r: { w: 503, ratio: 0.453 },
  bl: { w: 506, ratio: 0.583 },
  b: { w: 305, ratio: 0.942 },
  br: { w: 508, ratio: 0.581 },
}
// Screen heading (0° = right, 90° = down, towards the viewer) → view, in 45° steps.
const BY_HEADING = ['l', 'fl', 'f', 'fr', 'r', 'bl', 'b', 'br']
export const VAN_W = 74 // width of a side view, in scene units
export const viewFor = (dx, dy) => BY_HEADING[((Math.round((Math.atan2(dy, dx) * 180) / Math.PI / 45) % 8) + 8) % 8]

export function pointAt(leg, dist) {
  const { pts, acc } = leg
  let i = 1
  while (i < acc.length - 1 && acc[i] < dist) i++
  const f = (dist - acc[i - 1]) / (acc[i] - acc[i - 1] || 1)
  const p = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]
  const ahead = pts[Math.min(pts.length - 1, i + 2)]
  const behind = pts[Math.max(0, i - 2)]
  return { p, dx: ahead[0] - behind[0], dy: ahead[1] - behind[1] }
}


export const VIEW = (() => {
  const all = BORDER.flatMap(([x, y]) => [iso(x, y, 0), iso(x, y, HEIGHT)])
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const pad = 40
  return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad - 40, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 + 50 }
})()

export function formatDuration(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? t('{0} soat {1} daq', h, m) : t('{0} daq', m)
}

