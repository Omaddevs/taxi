import { BLOCK, GRID, LANE, PITCH, STREET } from './grid'
import { MID_STOP, STOP_CENTER, ZEBRA_OFFSET, greenNowOffset, hasMidWalk, intersectionWalk, lightState, midKey, midWalk, walkKey } from './traffic'

export { BLOCK, GRID, LANE, PITCH, STREET }

/* The van's trip through the tour city on each leg — pure data shared by the tour clock and the
   3D scene.

   The route is a walk along the street grid (a few left and right turns) ending at the square in
   front of the leg's landmark, kept to the inner right-hand lane and turning on arcs. The drive
   along it is simulated by the rules (traffic.js): the van keeps to a speed envelope (slower
   through turns, easing to a stop at the square), stops at red and yellow lights it can stop
   for, and waits — in the intersection, before the crosswalk — for people crossing the street it
   turns into, and before mid-block crosswalks while people are on them. The result is a timeline
   (time → distance, speed, why it is waiting). Everything is seeded by the leg.

   So the tour doesn't turn into a string of waits, the van stops for a red light only three
   times on the whole tour and gives way to people twice, on the legs listed below — once each.
   Past a leg's allowance, each signal ahead is retimed to turn green as the van comes up to it
   and each crosswalk ahead stays empty for the leg (route.ctl, used by everything drawn — the
   rules still hold for every car and person on screen). */

const RED_LEGS = [0, 4, 8]
const WALK_LEGS = [2, 6]
export const MAX_RED = RED_LEGS.length
export const MAX_WALK = WALK_LEGS.length
const allowance = (leg) => ({ light: RED_LEGS.includes(leg) ? 1 : 0, walk: WALK_LEGS.includes(leg) ? 1 : 0 })

const LANE_OFFSET = LANE / 2 // right-hand traffic, inner lane
const V_MAX = 17 // m/s ≈ 61 km/h — city speed
const V_TURN = 7.5 // m/s ≈ 27 km/h
const ACCEL = 3.2
const BRAKE = 4.5
export const TIME_SCALE = 3 // the drive plays faster than real time
const DT = 0.05

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DIRS = [
  [0, -1], // north (−z)
  [1, 0], // east
  [0, 1], // south
  [-1, 0], // west
]
const right = ([dx, dz]) => [-dz, dx]
const axisOf = ([dx]) => (dx ? 'ew' : 'ns')

/** Intersections visited: start, a few turns, never revisiting, staying inside the grid. */
function walk(r) {
  for (let attempt = 0; attempt < 60; attempt++) {
    let pos = [Math.floor(r() * 3) - 1, 3]
    let dir = 0
    const pts = [pos]
    const seen = new Set([pos.join()])
    const turns = 3 + Math.floor(r() * 2)
    let ok = true
    for (let k = 0; k <= turns && ok; k++) {
      const steps = k === turns ? 2 : 1 + Math.floor(r() * 2)
      for (let s = 0; s < steps; s++) {
        const next = [pos[0] + DIRS[dir][0], pos[1] + DIRS[dir][1]]
        // Keep two blocks of room for the landmark's square past the end.
        if (Math.abs(next[0]) > GRID - 2 || Math.abs(next[1]) > GRID - 2 || seen.has(next.join())) {
          ok = false
          break
        }
        pos = next
        seen.add(pos.join())
        pts.push(pos)
      }
      if (k < turns) dir = (dir + (r() > 0.5 ? 1 : 3)) % 4
    }
    if (ok && pts.length >= 6) return { pts, endDir: dir }
  }
  return { pts: [[0, 3], [0, 2], [0, 1], [1, 1], [1, 0], [1, -1]], endDir: 0 }
}

/** The lane polyline with turn arcs, resampled every ~2 m: {x, z, d, heading, turn, vlim}. */
function geometry(nodes, endDir) {
  const P = (n) => [n[0] * PITCH, n[1] * PITCH]
  const segDir = []
  for (let i = 1; i < nodes.length; i++) segDir.push([Math.sign(nodes[i][0] - nodes[i - 1][0]), Math.sign(nodes[i][1] - nodes[i - 1][1])])
  segDir.push(DIRS[endDir])
  const corner = (i) => {
    const p = P(nodes[i])
    const ra = right(segDir[Math.max(0, i - 1)])
    const rb = right(segDir[i])
    return ra[0] === rb[0] && ra[1] === rb[1]
      ? [p[0] + ra[0] * LANE_OFFSET, p[1] + ra[1] * LANE_OFFSET]
      : [p[0] + (ra[0] + rb[0]) * LANE_OFFSET, p[1] + (ra[1] + rb[1]) * LANE_OFFSET]
  }
  const s0 = segDir[0]
  const p0 = P(nodes[0])
  const pts = [[p0[0] + right(s0)[0] * LANE_OFFSET - s0[0] * 34, p0[1] + right(s0)[1] * LANE_OFFSET - s0[1] * 34, false]]
  for (let i = 1; i < nodes.length; i++) {
    const c = corner(i)
    const a = segDir[i - 1]
    const b = segDir[i]
    if (a[0] === b[0] && a[1] === b[1]) {
      pts.push([c[0], c[1], false])
      continue
    }
    // Right turns hug the corner, left turns sweep wider across the intersection.
    const isRight = right(a)[0] === b[0] && right(a)[1] === b[1]
    const R = isRight ? 7 : 12
    const q0 = [c[0] - a[0] * R, c[1] - a[1] * R]
    const q2 = [c[0] + b[0] * R, c[1] + b[1] * R]
    pts.push([q0[0], q0[1], false])
    for (let k = 1; k < 10; k++) {
      const u = k / 10
      pts.push([(1 - u) ** 2 * q0[0] + 2 * (1 - u) * u * c[0] + u * u * q2[0], (1 - u) ** 2 * q0[1] + 2 * (1 - u) * u * c[1] + u * u * q2[1], true])
    }
    pts.push([q2[0], q2[1], false])
  }
  // Past the last intersection the street opens onto the square; the van stops at its edge.
  const last = P(nodes[nodes.length - 1])
  const ed = DIRS[endDir]
  const er = right(ed)
  pts.push([last[0] + er[0] * LANE_OFFSET + ed[0] * (STREET / 2 + 10), last[1] + er[1] * LANE_OFFSET + ed[1] * (STREET / 2 + 10), false])

  const dense = []
  for (let i = 1; i < pts.length; i++) {
    const [ax, az, at] = pts[i - 1]
    const [bx, bz, bt] = pts[i]
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2))
    for (let k = i === 1 ? 0 : 1; k <= n; k++) dense.push({ x: ax + ((bx - ax) * k) / n, z: az + ((bz - az) * k) / n, turn: at || bt })
  }
  let d = 0
  dense.forEach((p, i) => {
    if (i) d += Math.hypot(p.x - dense[i - 1].x, p.z - dense[i - 1].z)
    p.d = d
    const a = dense[Math.max(0, i - 1)]
    const b = dense[Math.min(dense.length - 1, i + 1)]
    p.heading = Math.atan2(b.x - a.x, -(b.z - a.z)) // 0 = north (−z), clockwise
  })
  // Static speed envelope: turn speed, accelerating forwards, braking to the final stop.
  const v = dense.map((p) => (p.turn ? V_TURN : V_MAX))
  v[0] = 0
  v[v.length - 1] = 0
  for (let i = 1; i < v.length; i++) v[i] = Math.min(v[i], Math.sqrt(v[i - 1] ** 2 + 2 * ACCEL * (dense[i].d - dense[i - 1].d)))
  for (let i = v.length - 2; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] ** 2 + 2 * BRAKE * (dense[i + 1].d - dense[i].d)))
  dense.forEach((p, i) => (p.vlim = v[i]))
  return { samples: dense, length: d, segDir, lastNode: last }
}

/** Distance along the route where (p − point)·dir first reaches `at`. */
function dAlong(samples, from, point, dir, at) {
  for (let i = from; i < samples.length; i++) {
    const s = samples[i]
    if ((s.x - point[0]) * dir[0] + (s.z - point[1]) * dir[1] >= at) return { d: s.d, i }
  }
  return null
}

/** Where the van must be ready to stop, in order along the route. */
function gates(nodes, geo) {
  const out = []
  const { samples, segDir } = geo
  let from = 0
  nodes.forEach((n, k) => {
    const c = [n[0] * PITCH, n[1] * PITCH]
    const a = segDir[Math.max(0, k - 1)]
    const b = segDir[k]
    // Mid-block crosswalk on the street leading here.
    if (k > 0) {
      const axis = axisOf(a)
      const street = axis === 'ew' ? n[1] : n[0]
      const m = Math.min(axis === 'ew' ? nodes[k - 1][0] : nodes[k - 1][1], axis === 'ew' ? n[0] : n[1])
      if (hasMidWalk(axis, street, m)) {
        const mid = [c[0] - a[0] * (PITCH / 2), c[1] - a[1] * (PITCH / 2)]
        const at = dAlong(samples, from, mid, a, -MID_STOP)
        if (at) out.push({ d: at.d, kind: 'mid', axis, street, m })
      }
    }
    // The signal.
    const stop = dAlong(samples, from, c, a, -STOP_CENTER)
    if (!stop) return
    out.push({ d: stop.d, kind: 'light', i: n[0], j: n[1], axis: axisOf(a) })
    from = stop.i
    // Turning: wait inside the intersection for people crossing the street turned into.
    if (k < nodes.length - 1 && (a[0] !== b[0] || a[1] !== b[1])) {
      const inBox = dAlong(samples, from, c, b, ZEBRA_OFFSET - 1.6 - 2.4)
      if (inBox) out.push({ d: inBox.d, kind: 'walk', i: n[0], j: n[1], axis: axisOf(b), side: b[0] + b[1] })
    }
  })
  return out.sort((p, q) => p.d - q.d)
}

/** Can the van go past `g` now? → null, or the reason it must wait. */
function blocked(g, T, v, dist, ctl) {
  // Plans brake at BRAKE; only when even a hard stop (2× that) would overrun is it too late.
  const cannotStop = v > 4 && (v * v) / (4 * BRAKE) > dist - 0.4
  if (g.kind === 'light') {
    const s = lightState(g.i, g.j, g.axis, T, ctl)
    if (s === 'green' || (s === 'yellow' && cannotStop)) return null
    return 'light'
  }
  const busy = g.kind === 'walk' ? intersectionWalk(g.i, g.j, g.axis, g.side, T, 2.5, ctl).busy : midWalk(g.axis, g.street, g.m, T, 2.5, ctl).busy
  return busy && !cannotStop ? 'walk' : null
}

function vlimAt(samples, d) {
  let lo = 0
  let hi = samples.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (samples[mid].d < d) lo = mid
    else hi = mid
  }
  const a = samples[lo]
  const b = samples[hi]
  return a.vlim + ((b.vlim - a.vlim) * (d - a.d)) / (b.d - a.d || 1)
}

/** Drive the route by the rules: [{t, d, v, wait}] every DT seconds of scene time. */
function simulate(geo, gateList, ctl, allowed) {
  const { samples, length } = geo
  const timeline = []
  const decided = new Set()
  const stops = { light: 0, walk: 0 }
  let prevWait = null
  let d = 0
  let v = 0
  let t = 0
  let g = 0
  while (t < 600) {
    while (g < gateList.length && d > gateList[g].d + 0.3) g++
    let target = Math.max(vlimAt(samples, d), d < length - 0.5 ? 1.2 : 0) // never stall short of the end
    let wait = null
    let holdingGate = -1
    // The nearest gate ahead that holds the van decides; those passed no longer matter.
    for (let k = g; k < gateList.length && gateList[k].d - d < 60; k++) {
      const gate = gateList[k]
      const dist = gate.d - d
      // First time a gate comes into view: once the van has used up its waits, clear it.
      if (!decided.has(k)) {
        decided.add(k)
        if (gate.kind === 'light' && stops.light >= allowed.light) {
          // Green from just before the van gets there (it is 11 s long), never later than now.
          const eta = dist / Math.max(v, 6) + 1.5
          ctl.offsets.set(`${gate.i},${gate.j}`, greenNowOffset(gate.axis, t + Math.max(0, eta - 5)))
        }
        if (gate.kind === 'walk' && stops.walk >= allowed.walk) ctl.quiet.add(walkKey(gate.i, gate.j, gate.axis, gate.side))
        if (gate.kind === 'mid' && stops.walk >= allowed.walk) ctl.quiet.add(midKey(gate.axis, gate.street, gate.m))
      }
      const why = blocked(gate, t, v, dist, ctl)
      if (why) {
        target = Math.min(target, dist < 0.25 ? 0 : Math.sqrt(2 * BRAKE * Math.max(0, dist - 0.2)))
        if (dist < 25) {
          wait = why
          holdingGate = k
        }
        break
      }
    }
    v = target > v ? Math.min(target, v + ACCEL * DT) : Math.max(target, v - BRAKE * 2 * DT)
    d = Math.min(length, d + v * DT)
    const shown = v < 0.6 ? wait : null
    // One stop per gate, however the wait flickers while the van creeps up to its line.
    if (shown && holdingGate !== prevWait) stops[shown]++
    if (shown) prevWait = holdingGate
    timeline.push({ t, d, v, wait: shown })
    t += DT
    if (d >= length - 0.05 && v < 0.05) break
  }
  timeline.push({ t, d: length, v: 0, wait: null })
  return timeline
}

const cache = new Map()

/** The leg's route: geometry samples, the simulated timeline, physical `duration` (s), the square
 * and the landmark's placement in front of it. */
export function getRoute(legIndex) {
  if (cache.has(legIndex)) return cache.get(legIndex)
  const seed = Math.imul(legIndex + 11, 2654435761) >>> 0
  const r = rng(seed)
  const { pts, endDir } = walk(r)
  const geo = geometry(pts, endDir)
  const gateList = gates(pts, geo)
  const ctl = { offsets: new Map(), quiet: new Set() }
  const timeline = simulate(geo, gateList, ctl, allowance(legIndex))
  const ed = DIRS[endDir]
  const route = {
    samples: geo.samples,
    length: geo.length,
    timeline,
    gates: gateList,
    ctl,
    duration: timeline[timeline.length - 1].t,
    end: geo.samples[geo.samples.length - 1],
    dir: ed,
    seed,
    nodes: pts,
    // The square: two blocks deep past the last intersection, the landmark at its far side.
    square: { x: geo.lastNode[0] + ed[0] * PITCH, z: geo.lastNode[1] + ed[1] * PITCH, size: PITCH + BLOCK },
  }
  cache.set(legIndex, route)
  return route
}

function posAt(route, d) {
  const s = route.samples
  let lo = 0
  let hi = s.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (s[mid].d < d) lo = mid
    else hi = mid
  }
  const a = s[lo]
  const b = s[hi]
  const f = Math.max(0, Math.min(1, (d - a.d) / (b.d - a.d || 1)))
  let dh = b.heading - a.heading
  if (dh > Math.PI) dh -= Math.PI * 2
  if (dh < -Math.PI) dh += Math.PI * 2
  return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, heading: a.heading + dh * f }
}

/** The van at scene time `t` (s): {x, z, heading, v, d, wait}. */
export function routeAt(route, t) {
  const tl = route.timeline
  const i = Math.max(0, Math.min(tl.length - 2, Math.floor(t / DT)))
  const a = tl[i]
  const b = tl[i + 1]
  const f = Math.max(0, Math.min(1, (t - a.t) / DT))
  const d = a.d + (b.d - a.d) * f
  return { ...posAt(route, d), v: a.v + (b.v - a.v) * f, d, wait: a.wait }
}

/** Real seconds the drive phase lasts on screen. */
export const driveSeconds = (legIndex) => getRoute(legIndex).duration / TIME_SCALE
