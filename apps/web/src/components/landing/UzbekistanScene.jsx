import { memo, useEffect, useMemo, useRef } from 'react'
import { t } from '../../i18n'
import {
  BORDER,
  CITIES,
  CITY_KEYS,
  HEIGHT,
  LABEL_SIDE,
  LEGS,
  PEAKS,
  REGION_NAME,
  TREES,
  VAN_W,
  VIEW,
  VIEWS,
  WALLS,
  iso,
  pointAt,
  pointsAt,
  viewFor,
} from './tour/uzTour'

/* ── Landing: Uzbekistan as a raised 3D slab (real border, walls, shadow, desert-to-valley
   tint, mountains) with TaxiLine's minivan touring all 13 regions. The van is a set of rendered
   views; the one shown follows its heading on screen, so it turns like a 3D model. Driven by
   the tour clock (tour/tourClock): in the "map" phase the leg's road lights up with the van at
   the departure city; "zoomIn" dives into the van as the street scene takes over; "zoomOut"
   comes back out at the destination. Without the street scene (`still`), the van drives the
   leg on the map itself. ── */

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const ramp = (a, b, t) => Math.max(0, Math.min(1, (t - a) / (b - a)))
const parkedOf = (ui) => ui.phase !== 'map' && ui.phase !== 'zoomIn'

// The map re-renders only for what it shows: the leg, whether the van has left, still or not.
const sameMap = (a, b) => a.tour === b.tour && a.still === b.still && a.ui.leg === b.ui.leg && parkedOf(a.ui) === parkedOf(b.ui)

export const UzbekistanScene = memo(function UzbekistanScene({ tour, ui, still = false }) {
  const frame = useRef(null)
  const van = useRef(null)
  const lit = useRef(null)
  const top = useMemo(() => pointsAt(BORDER, HEIGHT), [])

  useEffect(() => {
    // Warm the cache so turning never flickers — once the map is near the screen, not with the page.
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        Object.keys(VIEWS).forEach((k) => {
          const img = new Image()
          img.src = `/landing/minivan/${k}.webp`
        })
      },
      { rootMargin: '600px 0px' },
    )
    if (frame.current) io.observe(frame.current)
    // While the street scene covers the map (drive, arrive) nothing on it moves: draw that once.
    let held = ''
    const off = tour.subscribe((state) => {
      const hold = !still && (state.phase === 'drive' || state.phase === 'arrive') ? `${state.leg}` : ''
      if (hold && hold === held) return
      held = hold
      const leg = LEGS[state.leg]
      const before = state.phase === 'map' || state.phase === 'zoomIn'
      const s = still ? (state.phase === 'drive' ? state.d : before ? 0 : 1) : before ? 0 : 1
      const { p, dx, dy } = pointAt(leg, s * leg.len)
      const key = viewFor(dx, dy)
      const v = VIEWS[key]
      const w = (VAN_W * v.w) / 503
      const h = w * v.ratio
      const el = van.current
      if (!el) return
      el.setAttribute('href', `/landing/minivan/${key}.webp`)
      el.setAttribute('width', w.toFixed(1))
      el.setAttribute('height', h.toFixed(1))
      el.setAttribute('x', (p[0] - w / 2).toFixed(1))
      el.setAttribute('y', (p[1] - h * 0.86).toFixed(1))
      // The leg's road lights up in the map phase (a preview of the trip), then stays lit.
      const litPart = state.phase === 'map' ? easeInOut(Math.min(1, state.p / 0.8)) : still && state.phase === 'drive' ? state.d : 1
      lit.current?.setAttribute('d', leg.d)
      lit.current?.setAttribute('stroke-dashoffset', String(Math.max(0, 1 - litPart)))

      // Zoom into the van as the street scene takes over, and back out at the destination.
      const box = frame.current
      if (!box) return
      // Phones: the map is shown larger, panned to keep the leg in view.
      const narrow = box.parentElement && box.parentElement.clientWidth < 640
      const a = CITIES[leg.from].p
      const b = CITIES[leg.to].p
      const [ax, ay] = iso(a[0], a[1], HEIGHT)
      const [bx, by] = iso(b[0], b[1], HEIGHT)
      // As close as the leg allows: a long leg needs room on both sides, a short one gets 2×.
      const legW = Math.abs(bx - ax) / VIEW.w
      const base = narrow ? Math.max(1.35, Math.min(2.1, 0.7 / Math.max(legW, 0.01))) : 1
      // Pan in px so the leg's middle sits at the box centre once scaled (origin = top left).
      const W = box.clientWidth
      const H = box.clientHeight
      const panFor = (k) => {
        if (!narrow) return ''
        const mx = (((ax + bx) / 2 - VIEW.x) / VIEW.w) * W
        const my = (((ay + by) / 2 - VIEW.y) / VIEW.h) * H
        return `translate(${(W / 2 - mx * k).toFixed(1)}px, ${(H / 2 - my * k).toFixed(1)}px) `
      }
      if (still) {
        box.style.transformOrigin = '0 0'
        box.style.transform = `${panFor(base)}scale(${base})`
        return
      }
      let scale = 1
      let opacity = 1
      if (state.phase === 'zoomIn') {
        scale = 1 + 7 * easeInOut(state.p)
        opacity = 1 - ramp(0.45, 0.9, state.p)
      } else if (state.phase === 'drive' || state.phase === 'arrive') {
        scale = 8
        opacity = 0
      } else if (state.phase === 'zoomOut') {
        scale = 8 - 7 * easeInOut(state.p)
        opacity = ramp(0.15, 0.6, state.p)
      }
      if (narrow) {
        // Zoom about the van: start from the panned map and scale around the van's point.
        const k = scale * base
        const vx = ((p[0] - VIEW.x) / VIEW.w) * W
        const vy = ((p[1] - VIEW.y) / VIEW.h) * H
        const mx = (((ax + bx) / 2 - VIEW.x) / VIEW.w) * W
        const my = (((ay + by) / 2 - VIEW.y) / VIEW.h) * H
        const sx = W / 2 - mx * base + vx * base // where the van sits on screen before zooming
        const sy = H / 2 - my * base + vy * base
        box.style.transformOrigin = '0 0'
        box.style.transform = `translate(${(sx - vx * k).toFixed(1)}px, ${(sy - vy * k).toFixed(1)}px) scale(${k.toFixed(4)})`
      } else {
        box.style.transformOrigin = `${(((p[0] - VIEW.x) / VIEW.w) * 100).toFixed(2)}% ${(((p[1] - VIEW.y) / VIEW.h) * 100).toFixed(2)}%`
        box.style.transform = `scale(${scale.toFixed(4)})`
      }
      // (Opacity only — hiding the layer outright would make the browser raster the 8× map again
      // on every frame of the zoom-out.)
      box.style.opacity = opacity.toFixed(3)
    })
    return () => {
      io.disconnect()
      off()
    }
  }, [tour, still])

  // The parts of the map that never change, made once: a new leg or phase re-renders only the
  // markers and the van, not the hundreds of shapes under them.
  const base = useMemo(
    () => (
      <>
        {/* Ground shadow, walls, top */}
        <polygon points={pointsAt(BORDER, 0)} transform="translate(14 26)" fill="#0f1d2a" opacity="0.16" filter="url(#uz-shadow)" />
        {WALLS.map((w, i) => (
          <polygon key={i} points={`${pointsAt([w.a, w.b], 0)} ${pointsAt([w.b, w.a], HEIGHT)}`} fill={w.fill} stroke={w.fill} strokeWidth="0.8" strokeLinejoin="round" />
        ))}
        <polygon points={top} fill="url(#uz-land)" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Trees */}
        {TREES.map(([x, y], i) => {
          const [tx, ty] = iso(x, y, HEIGHT)
          return (
            <g key={`t${i}`}>
              <ellipse cx={tx + 2} cy={ty + 1} rx="6" ry="2.4" fill="#000" opacity="0.08" />
              <polygon points={`${tx},${ty - 15} ${tx - 5},${ty - 2} ${tx},${ty - 1}`} fill="#7bc25a" />
              <polygon points={`${tx},${ty - 15} ${tx + 5},${ty - 2} ${tx},${ty - 1}`} fill="#5ea640" />
            </g>
          )
        })}

        {/* Roads of the whole tour */}
        {LEGS.map((l, i) => (
          <g key={`r${i}`}>
            <path d={l.d} fill="none" stroke="#1d2229" strokeOpacity="0.82" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={l.d} fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="0.9" strokeDasharray="4 5" strokeLinecap="round" />
          </g>
        ))}
      </>
    ),
    [top],
  )
  const peaks = useMemo(
    () => (
      <>
        {/* Mountains */}
        {PEAKS.map(({ p: [x, y], s }, i) => {
          const [mx, my] = iso(x, y, HEIGHT)
          const h = 26 * s
          const w = 20 * s
          return (
            <g key={`m${i}`}>
              <ellipse cx={mx + 3} cy={my + 1} rx={w * 0.95} ry={w * 0.32} fill="#000" opacity="0.07" />
              <polygon points={`${mx},${my - h} ${mx - w},${my} ${mx},${my + 1}`} fill="#c9cfc2" />
              <polygon points={`${mx},${my - h} ${mx + w},${my} ${mx},${my + 1}`} fill="#a9b2a3" />
              <polygon points={`${mx},${my - h} ${mx - w * 0.3},${my - h * 0.7} ${mx},${my - h * 0.74} ${mx + w * 0.3},${my - h * 0.7}`} fill="#ffffff" />
            </g>
          )
        })}
      </>
    ),
    [],
  )

  const leg = LEGS[ui.leg]
  const parked = parkedOf(ui)

  return (
    <div className="relative mx-auto w-full max-w-[1400px] px-2 sm:px-6">
      <div ref={frame} className="will-change-transform">
      <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} className="block h-auto w-full" role="img" aria-label={t('O‘zbekiston xaritasi: TaxiLine taksisi viloyatlar bo‘ylab yurmoqda')}>
        <defs>
          <linearGradient id="uz-land" x1="0" x2="1" y1="0" y2="0.35">
            <stop offset="0" stopColor="#f6efdf" />
            <stop offset="0.45" stopColor="#f3f2ea" />
            <stop offset="0.78" stopColor="#e6f3e3" />
            <stop offset="1" stopColor="#d9efd6" />
          </linearGradient>
          <filter id="uz-shadow" x="-10%" y="-10%" width="120%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="uz-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {base}
        {/* The current leg, lit up to where the van is */}
        <path ref={lit} d={LEGS[0].d} pathLength="1" strokeDasharray="1 1" strokeDashoffset="1" fill="none" stroke="#00c7d4" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />

        {peaks}

        {/* City markers */}
        {CITY_KEYS.map((k) => {
          const c = CITIES[k]
          const [cx, cy] = iso(c.p[0], c.p[1], HEIGHT)
          const active = k === leg.from || k === leg.to
          const label = t(REGION_NAME[k])
          const chipW = label.length * 6.4 + 18
          const side = LABEL_SIDE[k] ?? 'top'
          const offset = { top: [0, -24], bottom: [0, 22], left: [-chipW / 2 - 12, 0], right: [chipW / 2 + 12, 0] }[side]
          return (
            <g key={k}>
              {k === leg.to && !parked ? <circle cx={cx} cy={cy} r="11" fill="#00c7d4" opacity="0.35" filter="url(#uz-glow)" className="animate-pulse motion-safe-anim" /> : null}
              <ellipse cx={cx} cy={cy} rx="7.5" ry="4.5" fill={active ? '#00c7d4' : '#1d2229'} />
              <ellipse cx={cx} cy={cy} rx="3.2" ry="1.9" fill="#ffffff" />
              <g transform={`translate(${cx + offset[0]} ${cy + offset[1]})`}>
                <rect x={-chipW / 2} y="-11" width={chipW} height="22" rx="11" fill={active ? '#1d2229' : '#ffffff'} stroke="rgba(15,29,42,0.08)" />
                <text x="0" y="4.5" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={active ? '#ffffff' : '#1d2229'} fontFamily="Inter, system-ui, sans-serif">
                  {label}
                </text>
              </g>
            </g>
          )
        })}

        {/* The van */}
        <image ref={van} href="/landing/minivan/l.webp" width={VAN_W} height={VAN_W * 0.453} style={{ filter: 'drop-shadow(0 6px 5px rgba(15,29,42,0.28))' }} />
      </svg>
      </div>
    </div>
  )
}, sameMap)
