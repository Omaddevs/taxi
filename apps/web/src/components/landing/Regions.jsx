import { useEffect, useMemo, useRef, useState } from 'react'
import { Car, MapPin, Smile, Star, Users } from 'lucide-react'
import { api } from '../../lib/api'

/* ── Hududlar va ularning ramziy binolari (stillashtirilgan SVG belgilar) ──────────────────
   x/y — tarmoq xaritasidagi joyi (%), taxminan O‘zbekiston xaritasiga mos: g‘arbdan sharqqa. */
const REGIONS = [
  { id: 'qqr', name: 'Qoraqalpog‘iston', landmark: 'Orol kemalari', x: 7, y: 30, tone: '#e0f9fb', Glyph: Ship },
  { id: 'xor', name: 'Xorazm', landmark: 'Kalta minor', x: 17, y: 62, tone: '#fef3c7', Glyph: KaltaMinor },
  { id: 'nav', name: 'Navoiy', landmark: 'Rabot-i Malik', x: 33, y: 34, tone: '#ede9fe', Glyph: Arch },
  { id: 'bux', name: 'Buxoro', landmark: 'Minorai Kalon', x: 29, y: 74, tone: '#ffedd5', Glyph: Minaret },
  { id: 'sam', name: 'Samarqand', landmark: 'Registon', x: 46, y: 54, tone: '#dbeafe', Glyph: Registan },
  { id: 'qsh', name: 'Qashqadaryo', landmark: 'Oqsaroy', x: 45, y: 86, tone: '#fce7f3', Glyph: Portal },
  { id: 'sur', name: 'Surxondaryo', landmark: 'Fayoztepa', x: 58, y: 88, tone: '#dcfce7', Glyph: Stupa },
  { id: 'jiz', name: 'Jizzax', landmark: 'Temur darvozasi', x: 53, y: 24, tone: '#fee2e2', Glyph: RockGate },
  { id: 'sir', name: 'Sirdaryo', landmark: 'Sirdaryo ko‘prigi', x: 63, y: 58, tone: '#e0f9fb', Glyph: Bridge },
  { id: 'tov', name: 'Toshkent viloyati', landmark: 'Chorvoq', x: 66, y: 18, tone: '#dcfce7', Glyph: Mountains },
  { id: 'tsh', name: 'Toshkent', landmark: 'Teleminora', x: 73, y: 40, tone: '#c4f1f4', Glyph: TvTower, hub: true },
  { id: 'nam', name: 'Namangan', landmark: 'Gullar bayrami', x: 83, y: 20, tone: '#fce7f3', Glyph: Flower },
  { id: 'far', name: 'Farg‘ona', landmark: 'Xudoyorxon o‘rdasi', x: 85, y: 62, tone: '#fef3c7', Glyph: Palace },
  { id: 'and', name: 'Andijon', landmark: 'Bobur bog‘i', x: 94, y: 38, tone: '#ede9fe', Glyph: Dome },
]

const ROUTES = [
  ['tsh', 'sam', 26],
  ['tsh', 'far', -22],
  ['tsh', 'nam', 18],
  ['tsh', 'and', -14],
  ['tsh', 'tov', 14],
  ['tsh', 'sir', -16],
  ['sam', 'bux', 22],
  ['sam', 'jiz', -18],
  ['sam', 'qsh', 16],
  ['qsh', 'sur', -14],
  ['bux', 'xor', -20],
  ['bux', 'nav', 22],
  ['xor', 'qqr', 18],
]

// Xaritadagi yorliqlar — mashhur yo‘nalishlar
const CHIPS = [
  { from: 'tsh', to: 'sam', label: 'Toshkent → Samarqand', at: { x: 38, y: 13 } },
  { from: 'bux', to: 'xor', label: 'Buxoro → Xiva', dy: 34 },
  { from: 'tsh', to: 'far', label: 'Toshkent → Farg‘ona', dy: 30 },
]

const W = 1000
const H = 560
const byId = Object.fromEntries(REGIONS.map((r) => [r.id, r]))

function routePath([a, b, bend]) {
  const p = byId[a]
  const q = byId[b]
  const x1 = (p.x / 100) * W
  const y1 = (p.y / 100) * H
  const x2 = (q.x / 100) * W
  const y2 = (q.y / 100) * H
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const len = Math.hypot(x2 - x1, y2 - y1) || 1
  const cx = mx + (-(y2 - y1) / len) * bend * 3
  const cy = my + ((x2 - x1) / len) * bend * 3
  return { d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, mid: { x: (x1 + 2 * cx + x2) / 4, y: (y1 + 2 * cy + y2) / 4 } }
}

/* ── Raqamlar ─────────────────────────────────────────────────────────────────────────────── */

function useInView(threshold = 0.3) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, inView]
}

function CountUp({ value, run, suffix = '' }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!run || value == null) return undefined
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(value)
      return undefined
    }
    let frame
    const start = performance.now()
    const dur = 1600
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur)
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, run])
  return (
    <>
      {value == null ? '—' : shown.toLocaleString('uz-UZ').replace(/,/g, ' ')}
      {suffix}
    </>
  )
}

/* ── Yo‘nalishlar bo‘ylab yuradigan taksilar ────────────────────────────────────────────────
   Silliqlik uchun: har bir yo‘l oldindan 240 nuqtaga bo‘linadi (jadval), kadrlar orasida
   chiziqli interpolyatsiya qilinadi; faqat GPU'dagi `transform` o‘zgaradi (layout yo‘q);
   konteyner o‘lchami ResizeObserver orqali keshlanadi; burilish burchagi yumshatiladi.
   Taksi yo‘l bo‘ylab bir tomonga bir xil tezlikda yuradi, oxirida asta yo‘qolib, boshida
   qayta paydo bo‘ladi — keskin orqaga burilish yo‘q. */
const MOVERS = [
  { route: 0, speed: 70, offset: 0.1 },
  { route: 2, speed: 62, offset: 0.55 },
  { route: 4, speed: 58, offset: 0.3 },
  { route: 6, speed: 66, offset: 0.75 },
  { route: 8, speed: 60, offset: 0.2 },
  { route: 10, speed: 64, offset: 0.6 },
  { route: 12, speed: 56, offset: 0.4 },
]
const SAMPLES = 240

function buildTable(d) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  el.setAttribute('d', d)
  const len = el.getTotalLength()
  const pts = new Float32Array((SAMPLES + 1) * 2)
  for (let i = 0; i <= SAMPLES; i++) {
    const p = el.getPointAtLength((i / SAMPLES) * len)
    pts[i * 2] = p.x
    pts[i * 2 + 1] = p.y
  }
  return { pts, len }
}

function sample(pts, t) {
  const f = Math.min(SAMPLES, Math.max(0, t * SAMPLES))
  const i = Math.min(SAMPLES - 1, Math.floor(f))
  const k = f - i
  return [pts[i * 2] + (pts[i * 2 + 2] - pts[i * 2]) * k, pts[i * 2 + 1] + (pts[i * 2 + 3] - pts[i * 2 + 1]) * k]
}

const smoothstep = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

function TaxiMovers({ containerRef, active }) {
  const carRefs = useRef([])
  const size = useRef({ w: 0, h: 0 })
  const headings = useRef(MOVERS.map(() => null))
  const tables = useMemo(() => (typeof document === 'undefined' ? [] : MOVERS.map((m) => buildTable(routePath(ROUTES[m.route]).d))), [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => {
      size.current = { w: entry.contentRect.width, h: entry.contentRect.height }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  useEffect(() => {
    if (!active || !tables.length) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    let frame
    let last = performance.now()
    let clock = 0
    const tick = (now) => {
      // Tab fonga o‘tib qaytganda sakrab ketmasligi uchun kadr oralig‘i cheklanadi.
      clock += Math.min(50, now - last)
      last = now
      const { w, h } = size.current
      const sx = w / W
      const sy = h / H
      MOVERS.forEach((m, k) => {
        const car = carRefs.current[k]
        if (!car || !w) return
        const { pts, len } = tables[k]
        const t = ((clock / 1000) * m.speed / len + m.offset) % 1
        const [x, y] = sample(pts, t)
        const [ax, ay] = sample(pts, Math.max(0, t - 0.02))
        const [bx, by] = sample(pts, Math.min(1, t + 0.02))
        const target = Math.atan2((by - ay) * sy, (bx - ax) * sx)
        // Burchakni yumshatish (eng qisqa yo‘l bilan)
        let cur = headings.current[k] ?? target
        let diff = target - cur
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        cur += diff * 0.18
        headings.current[k] = cur
        let angle = (cur * 180) / Math.PI
        let flip = 1
        if (angle > 90 || angle < -90) {
          flip = -1
          angle = angle > 0 ? angle - 180 : angle + 180
        }
        const opacity = smoothstep(t / 0.08) * smoothstep((1 - t) / 0.08)
        car.style.opacity = String(opacity)
        car.style.transform = `translate3d(${x * sx}px, ${y * sy}px, 0) translate(-50%, -78%) rotate(${angle}deg) scaleX(${flip})`
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, tables])

  return MOVERS.map((m, k) => (
    <img
      key={k}
      ref={(n) => {
        carRefs.current[k] = n
      }}
      src="/landing/taxi-car-sm.webp"
      alt=""
      aria-hidden="true"
      draggable={false}
      className="regions-taxi pointer-events-none absolute left-0 top-0 z-[5] w-[34px] select-none opacity-0 drop-shadow-[0_4px_4px_rgba(15,29,42,0.35)] will-change-transform sm:w-[54px] 2xl:w-[64px]"
    />
  ))
}

/* ── Bo‘lim ───────────────────────────────────────────────────────────────────────────────── */

export function Regions() {
  const [stats, setStats] = useState(null)
  const [ref, inView] = useInView(0.2)
  const mapRef = useRef(null)
  const [mapVisible, setMapVisible] = useState(false)

  // Taksilar faqat xarita ekranda ko‘rinib turganda harakatlanadi (CPU tejaladi).
  useEffect(() => {
    const el = mapRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(([e]) => setMapVisible(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    api
      .get('/stats')
      .then(setStats)
      .catch(() => setStats({ regions: REGIONS.length, users: null, drivers: null, happyClients: null, avgRating: null }))
  }, [])

  const cards = [
    { icon: MapPin, value: stats?.regions ?? REGIONS.length, label: 'hudud', hint: 'Qoraqalpog‘istondan Andijongacha' },
    { icon: Users, value: stats?.users, label: 'foydalanuvchi', hint: 'TaxiLine’da ro‘yxatdan o‘tgan' },
    { icon: Car, value: stats?.drivers, label: 'tasdiqlangan haydovchi', hint: 'Hujjatlari tekshirilgan' },
    {
      icon: Smile,
      value: stats?.happyClients,
      label: 'mamnun mijoz',
      hint: stats?.avgRating ? `O‘rtacha baho ${stats.avgRating} ★` : 'Haydovchini 4–5 yulduzga baholagan',
    },
  ]

  return (
    <section ref={ref} id="regions" className="relative scroll-mt-24 overflow-hidden pb-20 pt-4">
      <div className="mx-auto max-w-[1600px] px-5 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-[13px] font-bold text-brand-dark">
          <MapPin className="h-4 w-4" /> Butun O‘zbekiston bo‘ylab
        </span>
        <h2 className="mx-auto mt-4 max-w-[760px] text-[34px] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[46px] 2xl:max-w-[960px] 2xl:text-[60px]">
          TaxiLine barcha viloyatlarni bir-biriga bog‘laydi
        </h2>
        <p className="mx-auto mt-4 max-w-[600px] text-[16px] leading-[1.6] text-ink/65 sm:text-[18px] 2xl:max-w-[720px] 2xl:text-[21px]">
          Toshkentdan Xivagacha, Termizdan Andijongacha — har bir yo‘nalishda ishonchli haydovchilar.
        </p>
      </div>

      {/* Tarmoq xaritasi */}
      <div className="relative mx-auto mt-6 max-w-[1500px] px-7 sm:mt-10 sm:px-10">
        <div ref={mapRef} className="relative aspect-[10/7] sm:aspect-[1000/560]">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {ROUTES.map((r, i) => {
              const { d } = routePath(r)
              return (
                <g key={i}>
                  <path d={d} fill="none" stroke="#00c7d4" strokeOpacity="0.18" strokeWidth="6" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                  <path
                    d={d}
                    fill="none"
                    stroke={i % 3 === 1 ? '#f59e0b' : i % 3 === 2 ? '#a78bfa' : '#00c7d4'}
                    strokeOpacity="0.85"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="2 9"
                    vectorEffect="non-scaling-stroke"
                    className="regions-flow"
                    style={{ animationDelay: `${-i * 0.7}s` }}
                  />
                </g>
              )
            })}
          </svg>

          <TaxiMovers containerRef={mapRef} active={mapVisible} />

          {REGIONS.map((r, i) => (
            <div
              key={r.id}
              className="regions-node group absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${r.x}%`, top: `${r.y}%`, animationDelay: `${-i * 0.45}s` }}
            >
              <div
                className={`relative flex items-center justify-center rounded-full bg-white p-[3px] shadow-[0_12px_28px_-10px_rgba(15,29,42,0.35)] ring-2 transition duration-300 group-hover:scale-110 ${
                  r.hub ? 'h-[52px] w-[52px] ring-brand sm:h-[92px] sm:w-[92px] 2xl:h-[110px] 2xl:w-[110px]' : 'h-[40px] w-[40px] ring-white sm:h-[72px] sm:w-[72px] 2xl:h-[86px] 2xl:w-[86px]'
                }`}
              >
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full" style={{ background: r.tone }}>
                  <r.Glyph className="h-[72%] w-[72%]" />
                </div>
                {r.hub ? <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-brand sm:h-4 sm:w-4" /> : null}
              </div>
              <p className="pointer-events-none absolute left-1/2 top-full mt-1.5 hidden -translate-x-1/2 whitespace-nowrap text-center text-[12px] font-bold text-ink sm:block 2xl:text-[14px]">
                {r.name}
                <span className="block text-[10.5px] font-medium text-ink/45 opacity-0 transition group-hover:opacity-100 2xl:text-[12px]">{r.landmark}</span>
              </p>
            </div>
          ))}

          {CHIPS.map((c) => {
            // `at` — aniq joy (%), aks holda yo‘nalish o‘rtasi
            const route = ROUTES.find((r) => r[0] === c.from && r[1] === c.to)
            const mid = c.at ? { x: (c.at.x / 100) * W, y: (c.at.y / 100) * H } : routePath(route).mid
            const dy = c.dy ?? 0
            return (
              <div
                key={c.label}
                className="regions-chip pointer-events-none absolute z-20 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-ink shadow-[0_14px_30px_-12px_rgba(15,29,42,0.35)] ring-1 ring-black/5 md:flex 2xl:text-[16px]"
                style={{ left: `${(mid.x / W) * 100}%`, top: `calc(${(mid.y / H) * 100}% + ${dy}px)` }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-ink">
                  <Car className="h-3.5 w-3.5" />
                </span>
                {c.label}
              </div>
            )
          })}
        </div>
      </div>

      {/* Statistika */}
      <div className="mx-auto mt-10 grid max-w-[1600px] grid-cols-2 gap-3 px-3 sm:mt-14 sm:gap-4 sm:px-6 lg:grid-cols-4">
        {cards.map(({ icon: Icon, value, label, hint }, i) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-[24px] p-5 sm:rounded-[28px] sm:p-7 2xl:p-8 ${i === 0 ? 'bg-[#1d2229] text-white' : 'bg-[#f3f4f6] text-ink'}`}
          >
            {i === 0 ? <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 -right-10 h-36 w-36 rounded-full bg-brand" /> : null}
            <span
              className={`relative flex h-10 w-10 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${i === 0 ? 'bg-white/10 text-brand' : 'bg-white text-brand-dark'}`}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <p className="relative mt-5 text-[34px] font-extrabold leading-none tracking-tight sm:text-[46px] 2xl:text-[56px]">
              <CountUp value={value} run={inView} />
            </p>
            <p className={`relative mt-2 text-[14px] font-bold sm:text-[16px] 2xl:text-[18px] ${i === 0 ? 'text-white' : 'text-ink'}`}>{label}</p>
            <p className={`relative mt-1 text-[12px] leading-snug sm:text-[13px] 2xl:text-[15px] ${i === 0 ? 'text-white/60' : 'text-ink/55'}`}>
              {hint}
            </p>
          </div>
        ))}
      </div>

      {stats?.avgRating ? (
        <p className="mt-6 flex items-center justify-center gap-1.5 text-[14px] font-semibold text-ink/60">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Mijozlarimizning o‘rtacha bahosi: {stats.avgRating} / 5
        </p>
      ) : null}
    </section>
  )
}

/* ── Ramziy binolar (64×64, stillashtirilgan) ─────────────────────────────────────────────── */

const INK = '#1d2229'
const BRAND = '#00a3ae'
const ACC = '#00c7d4'

function TvTower(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <path d="M32 4v12" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 60l4-34h4l4 34z" fill={BRAND} />
      <ellipse cx="32" cy="22" rx="9" ry="4" fill={INK} />
      <ellipse cx="32" cy="34" rx="6" ry="2.6" fill={ACC} />
      <path d="M18 60l8-14M46 60l-8-14" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 60h36" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
function Registan(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <rect x="6" y="18" width="5" height="40" rx="1.5" fill={INK} />
      <rect x="53" y="18" width="5" height="40" rx="1.5" fill={INK} />
      <rect x="15" y="26" width="34" height="32" rx="2" fill={BRAND} />
      <path d="M24 58V42a8 8 0 0116 0v16z" fill={INK} />
      <path d="M22 26a10 10 0 0120 0z" fill={ACC} />
      <circle cx="8.5" cy="15" r="3.5" fill={ACC} />
      <circle cx="55.5" cy="15" r="3.5" fill={ACC} />
    </svg>
  )
}
function Minaret(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <path d="M24 60l3-44h10l3 44z" fill="#c2884a" />
      <path d="M25.5 40h13M26.3 30h11.4M27 22h10" stroke="#8a5a2b" strokeWidth="2" />
      <rect x="25" y="10" width="14" height="7" rx="2" fill={INK} />
      <path d="M28 10a4 4 0 018 0z" fill="#8a5a2b" />
      <path d="M18 60h28" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
function KaltaMinor(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <path d="M18 60l4-40h20l4 40z" fill={ACC} />
      <path d="M19.3 48h25.4M20.5 38h23M21.5 28h21" stroke={BRAND} strokeWidth="3" />
      <rect x="20" y="16" width="24" height="5" rx="2" fill={INK} />
      <path d="M12 60h40" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
function Ship(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <path d="M8 40h44l-6 10H14z" fill={INK} />
      <rect x="18" y="30" width="22" height="10" rx="1.5" fill={BRAND} />
      <rect x="24" y="22" width="4" height="8" fill={INK} />
      <path d="M6 56c4 0 4-3 8-3s4 3 8 3 4-3 8-3 4 3 8 3 4-3 8-3 4 3 8 3" fill="none" stroke="#e0b46a" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
function Arch(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <rect x="10" y="20" width="44" height="38" rx="2" fill="#a78bfa" />
      <path d="M22 58V36a10 10 0 0120 0v22z" fill={INK} />
      <rect x="10" y="16" width="44" height="6" rx="1.5" fill={INK} />
      <circle cx="16" cy="30" r="2" fill="#fff" />
      <circle cx="48" cy="30" r="2" fill="#fff" />
    </svg>
  )
}
function Portal(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <path d="M10 58V14l8-4v48zM46 58V10l8 4v44z" fill="#db2777" />
      <path d="M18 58V24h28v34z" fill="#f9a8d4" />
      <path d="M24 58V38a8 8 0 0116 0v20z" fill={INK} />
      <path d="M18 24h28" stroke={INK} strokeWidth="2.5" />
    </svg>
  )
}
function Stupa(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <path d="M12 58a20 20 0 0140 0z" fill="#16a34a" />
      <rect x="28" y="22" width="8" height="16" rx="1" fill={INK} />
      <path d="M26 22h12l-6-10z" fill="#86efac" />
      <path d="M6 58h52" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
function RockGate(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <path d="M4 58l10-34 8 8 4 26z" fill="#ef4444" />
      <path d="M60 58L50 20l-8 10-4 28z" fill="#f87171" />
      <path d="M26 58h12" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 58V44h4v14" fill={INK} />
    </svg>
  )
}
function Bridge(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <path d="M4 34h56" stroke={INK} strokeWidth="3" />
      <path d="M8 34a12 12 0 0124 0M32 34a12 12 0 0124 0" fill="none" stroke={BRAND} strokeWidth="3" />
      <path d="M12 34v8M28 34v8M36 34v8M52 34v8" stroke={INK} strokeWidth="2.5" />
      <path d="M4 50c5 0 5-3 10-3s5 3 10 3 5-3 10-3 5 3 10 3 5-3 10-3" fill="none" stroke={ACC} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
function Mountains(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <path d="M2 46l18-28 12 16 8-10 22 22z" fill="#16a34a" />
      <path d="M20 18l5 7-5-2-4 3z" fill="#fff" />
      <path d="M2 52c6 0 6-3 12-3s6 3 12 3 6-3 12-3 6 3 12 3 6-3 12-3" fill="none" stroke={ACC} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
function Flower(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx="32" cy="18" rx="7" ry="11" fill="#f472b6" transform={`rotate(${a} 32 28)`} />
      ))}
      <circle cx="32" cy="28" r="6" fill="#facc15" />
      <path d="M32 40v20" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 52c-6-1-9-5-10-9 5 0 9 3 10 9z" fill="#16a34a" />
    </svg>
  )
}
function Palace(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <rect x="6" y="28" width="52" height="30" rx="2" fill="#f59e0b" />
      <path d="M22 58V40a10 10 0 0120 0v18z" fill={INK} />
      <rect x="6" y="24" width="52" height="5" fill={INK} />
      <rect x="10" y="12" width="6" height="12" fill="#f59e0b" />
      <rect x="48" y="12" width="6" height="12" fill="#f59e0b" />
      <path d="M10 34h6v8h-6zM48 34h6v8h-6z" fill="#fde68a" />
    </svg>
  )
}
function Dome(p) {
  return (
    <svg viewBox="0 0 64 64" {...p} aria-hidden="true">
      <rect x="14" y="36" width="36" height="22" rx="2" fill="#7c3aed" />
      <path d="M16 36a16 16 0 0132 0z" fill="#a78bfa" />
      <path d="M32 20v-8" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="10" r="2.5" fill={INK} />
      <path d="M26 58V46a6 6 0 0112 0v12z" fill={INK} />
    </svg>
  )
}
