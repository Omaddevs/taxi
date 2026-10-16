import { useEffect, useMemo, useRef, useState } from 'react'
import { BatteryFull, Box, Check, Footprints, ChevronLeft, ChevronRight, Fan, LayoutGrid, LockOpen, MapPin, SquareParking, Sun, Wifi, Wind } from 'lucide-react'
import { UzbekistanScene } from '../UzbekistanScene'
import { LANDMARK_NAME } from './landmarkNames'
import { useTour } from './tourClock'
import { BORDER, CITIES, LEGS, REGION_NAME, TOUR, formatDuration } from './uzTour'
import { t } from '../../../i18n'

/* The landing's tour stage, full width: the 3D map of Uzbekistan; on each leg it dives into the
   van and the trip continues in a 3D city (three.js, loaded on demand) — turns, traffic,
   people — to the destination's landmark, then climbs back out to the map. An in-car HUD rides
   on top while driving. Without WebGL, or with reduced motion, the map alone tells the trip. */

const pad = (n) => String(n).padStart(2, '0')
const clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const ramp = (a, b, t) => Math.max(0, Math.min(1, (t - a) / (b - a)))

const MINI = (() => {
  const xs = BORDER.map((p) => p[0])
  const ys = BORDER.map((p) => p[1])
  const x = Math.min(...xs) - 4
  const y = Math.min(...ys) - 4
  return { x, y, w: Math.max(...xs) - x + 4, h: Math.max(...ys) - y + 4, border: BORDER.map((p) => p.join(',')).join(' ') }
})()

function MiniMap({ legIndex, s }) {
  const leg = LEGS[legIndex]
  const a = CITIES[leg.from].p
  const b = CITIES[leg.to].p
  const dot = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]
  return (
    <svg viewBox={`${MINI.x} ${MINI.y} ${MINI.w} ${MINI.h}`} className="h-full w-full" aria-hidden="true">
      <polygon points={MINI.border} fill="#ffffff" stroke="#c9d4e3" strokeWidth="0.8" strokeLinejoin="round" />
      <polyline points={TOUR.map((k) => CITIES[k].p.join(',')).join(' ')} fill="none" stroke="#b9c6d8" strokeWidth="1" strokeDasharray="2 2" />
      <line x1={a[0]} y1={a[1]} x2={dot[0]} y2={dot[1]} stroke="#2f7bff" strokeWidth="1.8" strokeLinecap="round" />
      <line x1={dot[0]} y1={dot[1]} x2={b[0]} y2={b[1]} stroke="#93b6ef" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={a[0]} cy={a[1]} r="1.8" fill="#22c55e" />
      <circle cx={b[0]} cy={b[1]} r="1.8" fill="#f97316" />
      <circle cx={dot[0]} cy={dot[1]} r="3.4" fill="#2f7bff" stroke="#ffffff" strokeWidth="1.2" />
    </svg>
  )
}

function Speedometer({ kmh }) {
  const r = 30
  const c = 2 * Math.PI * r
  const frac = Math.min(1, kmh / 120)
  return (
    <div className="relative flex h-[78px] w-[78px] items-center justify-center rounded-full bg-white/85 shadow-[0_10px_30px_-12px_rgba(30,60,110,0.35)] ring-1 ring-white backdrop-blur sm:h-[96px] sm:w-[96px]">
      <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-[225deg]" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e4ebf5" strokeWidth="4" strokeDasharray={`${c * 0.75} ${c}`} strokeLinecap="round" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray={`${c * 0.75 * frac} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="relative text-center">
        <p className="text-[24px] font-bold leading-none tabular-nums text-[#1d2229] sm:text-[30px]">{Math.round(kmh)}</p>
        <p className="text-[9px] font-semibold text-[#6b7280]">{t('km/soat')}</p>
        <p className="mx-auto mt-0.5 w-fit rounded-full bg-[#eef2f7] px-1.5 text-[8px] font-bold text-[#6b7280]">AUTO</p>
      </div>
    </div>
  )
}

const glass = 'bg-white/80 shadow-[0_12px_32px_-14px_rgba(30,60,110,0.35)] ring-1 ring-white backdrop-blur-md'

export function TourStage() {
  const stage = useRef(null)
  const canvas = useRef(null)
  const street = useRef(null)
  const hud = useRef(null)
  const { tour, ui } = useTour(stage)
  const [now, setNow] = useState(() => new Date())
  const [mode, setMode] = useState('pending') // 'pending' | '3d' | 'map'

  // Development only: lets the browser console (and visual checks) jump around the tour.
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    window.__taxilineTour = tour
    return () => delete window.__taxilineTour
  }, [tour])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000)
    return () => clearInterval(id)
  }, [])

  // Load the street scene once the stage is near the viewport (and only if it can run).
  useEffect(() => {
    const el = stage.current
    if (!el) return undefined
    let engine = null
    let off = () => {}
    let ro = null
    let cancelled = false
    const start = async () => {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setMode('map')
      const { TourDrive, webglAvailable } = await import('./city3d')
      if (cancelled) return
      if (!webglAvailable() || !canvas.current) return setMode('map')
      try {
        engine = new TourDrive(canvas.current)
      } catch {
        return setMode('map')
      }
      setMode('3d')
      if (import.meta.env.DEV) window.__taxilineDrive = engine
      // (React detaches the ref before this effect's cleanup runs, and a last resize can land in
      // between when the stage leaves the page.)
      const fit = () => {
        const el = canvas.current
        if (el) engine.resize(el.clientWidth, el.clientHeight)
      }
      fit()
      ro = new ResizeObserver(fit)
      ro.observe(canvas.current)
      let warmed = -1
      off = tour.subscribe((s) => {
        engine.setLeg(s.leg)
        // The street layer fades in as the map dives in, and out as it climbs away.
        const o = s.phase === 'map' ? 0 : s.phase === 'zoomIn' ? ramp(0.35, 0.8, s.p) : s.phase === 'zoomOut' ? 1 - ramp(0.4, 0.85, s.p) : 1
        if (street.current) street.current.style.opacity = o.toFixed(3)
        if (hud.current) hud.current.style.opacity = (s.phase === 'zoomIn' ? ramp(0.7, 1, s.p) : s.phase === 'zoomOut' ? 1 - ramp(0, 0.35, s.p) : o).toFixed(3)
        if (o > 0) engine.render(s)
        // Halfway through the map phase: one frame drawn unseen (the layer is still transparent),
        // so the new city's shaders, shadows and textures are ready before the zoom-in shows it.
        else if (s.phase === 'map' && s.p > 0.5 && warmed !== s.leg) {
          warmed = s.leg
          engine.render(s)
        }
      })
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        start()
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
      off()
      ro?.disconnect()
      engine?.dispose()
    }
  }, [tour])

  const leg = LEGS[ui.leg]
  const landmark = LANDMARK_NAME[leg.to]
  const driving = mode === '3d' && ui.phase !== 'map'
  const arrived = ui.phase === 'arrive' || ui.phase === 'zoomOut'
  const progress = ui.phase === 'drive' ? ui.d : arrived ? 1 : 0
  const left = Math.max(0, Math.round(leg.minutes * (1 - progress)))
  const eta = useMemo(() => clock(new Date(now.getTime() + left * 60_000)), [now, left])
  const ahead = [1, 2, 3].map((i) => REGION_NAME[TOUR[(ui.leg + 1 + i) % (TOUR.length - 1)]])
  const kmh = ui.phase === 'drive' ? ui.speed * 3.6 : 0
  const waiting = ui.phase === 'drive' && Boolean(ui.wait)
  // Keep the last reason so the pill's text doesn't change while it fades out.
  const [lastWait, setLastWait] = useState('light')
  if (ui.wait && ui.wait !== lastWait) setLastWait(ui.wait)

  return (
    <div ref={stage} className="relative h-[82svh] min-h-[540px] w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#eef2f8_70%)] sm:h-[88svh] sm:max-h-[920px] sm:min-h-[620px]">
      {/* Map */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full">
          <UzbekistanScene tour={tour} ui={ui} still={mode === 'map'} />
        </div>
      </div>

      {/* Street scene */}
      <div ref={street} className="absolute inset-0 opacity-0" aria-hidden={!driving}>
        <canvas ref={canvas} className="h-full w-full" role="img" aria-label={t('{0} dan {1} ga yo‘l: TaxiLine mashinasi ketmoqda', t(REGION_NAME[leg.from]), t(REGION_NAME[leg.to]))} />
      </div>

      {/* Map caption: the leg about to start, or the one just finished */}
      <div
        className={`absolute inset-x-0 bottom-6 z-10 flex justify-center px-4 transition duration-500 sm:bottom-10 ${ui.phase === 'map' || mode !== '3d' ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
      >
        <div className={`flex items-center gap-3 rounded-full px-4 py-2.5 ${glass}`}>
          <span className="rounded-full bg-[#1d2229] px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
            {ui.leg + 1} / {LEGS.length}
          </span>
          <span className="flex items-center gap-1.5 text-[14px] font-bold text-[#1d2229] sm:text-[16px]">
            <MapPin className="h-4 w-4 text-[#00a3ae]" />
            {t(REGION_NAME[leg.from])} <span className="text-[#00a3ae]">→</span> {t(REGION_NAME[leg.to])}
          </span>
          <span className="hidden text-[13px] font-medium text-[#6b7280] sm:inline">{t('{0} km', leg.km)}</span>
        </div>
      </div>

      {/* In-car HUD */}
      {mode === '3d' ? (
        <div ref={hud} className="pointer-events-none absolute inset-0 opacity-0">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 text-[12px] font-medium text-[#3b4656] sm:px-8 sm:pt-5 sm:text-[13px]">
            <span className="flex items-center gap-3">
              <span className="tabular-nums">{clock(now)}</span>
              <span className="flex items-center gap-1">
                <Sun className="h-3.5 w-3.5" /> 24°C
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Wifi className="h-3.5 w-3.5" />
              <span className="flex items-center gap-1">
                <BatteryFull className="h-4 w-4" /> 100%
              </span>
            </span>
          </div>

          <div
            className={`absolute left-1/2 top-[158px] z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#1d2229]/90 px-4 py-2 text-[12px] font-semibold text-white shadow-lg backdrop-blur transition duration-500 sm:top-16 sm:text-[14px] ${
              arrived ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
            }`}
            aria-live="polite"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e]">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            {arrived ? t('Yetib keldik: {0}, {1}', t(landmark), t(REGION_NAME[leg.to])) : ''}
          </div>

          {/* Why the van is standing: a red light, or people crossing */}
          <div
            className={`absolute left-1/2 top-[158px] z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-semibold shadow-lg backdrop-blur transition-[opacity,transform] duration-300 sm:top-16 sm:text-[14px] ${
              waiting ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
            } ${lastWait === 'light' ? 'bg-[#1d2229]/90 text-white' : 'bg-white/90 text-[#1d2229] ring-1 ring-black/5'}`}
            aria-live="polite"
          >
            {lastWait === 'light' ? (
              <>
                <span className="flex flex-col gap-[3px] rounded-[6px] bg-[#0e1116] px-[5px] py-[4px]" aria-hidden="true">
                  <span className="h-2 w-2 rounded-full bg-[#ff3b30] shadow-[0_0_6px_#ff3b30]" />
                  <span className="h-2 w-2 rounded-full bg-[#39404b]" />
                  <span className="h-2 w-2 rounded-full bg-[#39404b]" />
                </span>
                {t('Qizil chiroq — kutyapmiz')}
              </>
            ) : (
              <>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f59e0b] text-white">
                  <Footprints className="h-3.5 w-3.5" />
                </span>
                {t('Piyodalarni o‘tkazib yuboryapmiz')}
              </>
            )}
          </div>

          <div className="absolute left-3 top-10 w-[min(60%,250px)] space-y-2.5 sm:left-8 sm:top-14 sm:w-[270px]">
            <div className={`overflow-hidden rounded-[18px] ${glass}`}>
              <div className="flex items-center gap-2.5 p-3 pb-2">
                <img src="/home/driver-mascot.webp" alt="" className="h-11 w-11 shrink-0 rounded-full bg-[#fff3c4] object-contain p-0.5 sm:h-12 sm:w-12" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-[#16a34a]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                    {arrived ? t('Yetib keldik') : t('Keyingi manzil')}
                  </p>
                  <p className="truncate text-[13.5px] font-bold text-[#1d2229]">{t(landmark)}</p>
                  <p className="truncate text-[11px] text-[#6b7280]">{t(REGION_NAME[leg.to])}</p>
                </div>
              </div>
              <div className="mx-3 hidden h-[118px] rounded-[12px] bg-[#f3f6fa] p-1.5 sm:block">
                <MiniMap legIndex={ui.leg} s={progress} />
              </div>
              <div className="grid grid-cols-3 divide-x divide-[#e5eaf1] border-t border-[#e5eaf1] text-center text-[11px] font-semibold text-[#3b4656] sm:mt-2">
                <span className="py-2">{t('{0} km', Math.round(leg.km * (1 - progress)))}</span>
                <span className="py-2">{arrived ? '—' : formatDuration(left)}</span>
                <span className="py-2 tabular-nums">{arrived ? clock(now) : eta}</span>
              </div>
            </div>
            <div className={`hidden rounded-[18px] p-3 sm:block ${glass}`}>
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#6b7280]">
                <span>{t('Sayohat')}</span>
                <span className="tabular-nums">
                  {ui.leg + 1} / {LEGS.length}
                </span>
              </div>
              <ol className="mt-2 space-y-1.5">
                {[REGION_NAME[leg.to], ...ahead].map((name, i) => (
                  <li key={`${name}${i}`} className="flex items-center gap-2 text-[12.5px] font-semibold text-[#1d2229]">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${i === 0 ? 'bg-[#2f7bff]' : 'bg-[#cbd5e1]'}`} />
                    <span className={`truncate ${i === 0 ? '' : 'text-[#6b7280]'}`}>{t(name)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="absolute right-3 top-10 sm:left-[318px] sm:right-auto sm:top-14">
            <Speedometer kmh={kmh} />
          </div>

          <div className={`absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-5 rounded-full px-6 py-3 text-[#3b4656] sm:bottom-6 sm:gap-10 sm:px-10 ${glass}`} aria-hidden="true">
            <SquareParking className="h-5 w-5" />
            <LockOpen className="hidden h-5 w-5 sm:block" />
            <Fan className="h-5 w-5" />
            <span className="flex items-center gap-2 whitespace-nowrap text-[15px] font-semibold tabular-nums sm:text-[17px]">
              <ChevronLeft className="h-4 w-4" /> 24.5 °C <ChevronRight className="h-4 w-4" />
            </span>
            <Wind className="h-5 w-5" />
            <Box className="hidden h-5 w-5 sm:block" />
            <LayoutGrid className="h-5 w-5" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
