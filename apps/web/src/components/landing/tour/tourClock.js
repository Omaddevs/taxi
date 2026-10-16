import { useEffect, useState } from 'react'
import { LEGS } from './uzTour'
import { TIME_SCALE, driveSeconds, getRoute, routeAt } from './routeGen'

/* One clock for the landing tour stage. Each leg runs through five phases:
     map      — the 3D map, the van at the departure city, the leg's road lighting up
     zoomIn   — the map dives into the van while the street camera swoops down behind it
     drive    — through the city: turns, traffic, people (time follows the route's speed profile)
     arrive   — stopped at the landmark's square, the camera takes the building in
     zoomOut  — the camera climbs away and the map returns, the van now at the destination
   `sceneT` is the street scene's clock (route seconds): it runs through all five phases — before
   0 while the map shows, the drive itself from 0 — so signals, people and traffic keep moving and
   match the van's precomputed drive. Listeners get the state every frame; React re-renders through `ui` only a few times a second.
   It runs while the stage is on screen and resumes where it paused. */

export const PHASE_MS = { map: 2200, zoomIn: 1700, arrive: 4200, zoomOut: 1700 }
const ORDER = ['map', 'zoomIn', 'drive', 'arrive', 'zoomOut']
const phaseMs = (phase, leg) => (phase === 'drive' ? driveSeconds(leg) * 1000 : PHASE_MS[phase])

function createTour() {
  const listeners = new Set()
  const state = { leg: 0, phase: 'map', p: 0, t: 0, x: 0, z: 0, heading: 0, speed: 0, d: 0, wait: null, sceneT: 0, seconds: 0 }
  let raf = 0
  let phaseStart = 0
  let pausedAt = 0
  let lastNow = 0

  const settle = (leg, t) => {
    const r = getRoute(leg)
    const at = routeAt(r, t)
    state.t = t
    state.x = at.x
    state.z = at.z
    state.heading = at.heading
    state.speed = at.v
    state.d = at.d / r.length
    state.wait = at.wait
  }

  const step = (now) => {
    if (!phaseStart) phaseStart = now
    if (lastNow) state.seconds += Math.min(0.05, (now - lastNow) / 1000)
    lastNow = now
    let elapsed = now - phaseStart
    let dur = phaseMs(state.phase, state.leg)
    if (elapsed >= dur) {
      const i = ORDER.indexOf(state.phase)
      if (i === ORDER.length - 1) state.leg = (state.leg + 1) % LEGS.length
      state.phase = ORDER[(i + 1) % ORDER.length]
      phaseStart = now
      elapsed = 0
      dur = phaseMs(state.phase, state.leg)
    }
    state.p = Math.min(1, elapsed / dur)
    const route = getRoute(state.leg)
    const sec = (ms) => (ms / 1000) * TIME_SCALE
    if (state.phase === 'drive') settle(state.leg, sec(elapsed))
    else settle(state.leg, state.phase === 'map' || state.phase === 'zoomIn' ? 0 : route.duration)
    state.sceneT = {
      map: -sec(PHASE_MS.map + PHASE_MS.zoomIn) + sec(elapsed),
      zoomIn: -sec(PHASE_MS.zoomIn) + sec(elapsed),
      drive: sec(elapsed),
      arrive: route.duration + sec(elapsed),
      zoomOut: route.duration + sec(PHASE_MS.arrive + elapsed),
    }[state.phase]
    listeners.forEach((fn) => fn(state))
  }
  const tick = (now) => {
    step(now)
    raf = requestAnimationFrame(tick)
  }

  settle(0, 0)
  return {
    state,
    subscribe(fn) {
      listeners.add(fn)
      fn(state)
      return () => listeners.delete(fn)
    },
    emit() {
      listeners.forEach((fn) => fn(state))
    },
    /** Jump to `p` (0..1) of a leg's phase — used by the dev tools. */
    seek(leg, phase, p = 0) {
      state.leg = leg
      state.phase = phase
      const now = performance.now()
      phaseStart = now - p * phaseMs(phase, leg)
      pausedAt = raf ? 0 : now
      lastNow = 0
      step(now) // draw that moment right away, even with the clock stopped
    },
    start() {
      if (raf) return
      lastNow = 0
      // Resume mid-phase: shift its start by the time spent paused.
      if (pausedAt && phaseStart) phaseStart += performance.now() - pausedAt
      raf = requestAnimationFrame(tick)
    },
    stop() {
      if (!raf) return
      cancelAnimationFrame(raf)
      raf = 0
      pausedAt = performance.now()
    },
  }
}

/** The tour clock for the stage: runs while `ref`'s element is visible (never with reduced
 * motion — the stage then shows the map). `ui` re-renders on a new leg or phase and about every
 * 150 ms in between. */
export function useTour(ref) {
  const [tour] = useState(createTour)
  const [ui, setUi] = useState(() => ({ ...tour.state }))

  useEffect(() => {
    let lastPush = 0
    let last = ''
    const off = tour.subscribe((s) => {
      const now = performance.now()
      const key = `${s.leg}:${s.phase}`
      if (key !== last || now - lastPush > 150) {
        lastPush = now
        last = key
        setUi({ ...s })
      }
    })
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return off
    const el = ref.current
    if (!el) return off
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? tour.start() : tour.stop()), { threshold: 0.2 })
    io.observe(el)
    return () => {
      io.disconnect()
      tour.stop()
      off()
    }
  }, [tour, ref])

  return { tour, ui }
}
