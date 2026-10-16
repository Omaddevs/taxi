import { PITCH, STREET } from './grid'

/* Traffic rules of the tour city — pure functions of the scene time T (seconds), so the van's
   precomputed drive, the other cars and the people on screen all agree.

   Signals: every intersection runs one 30 s cycle with its own offset —
     north–south: green 0–11, yellow 11–13, red 13–30
     east–west:   green 15–26, yellow 26–28, red otherwise   (2 s all-red between)
   Crosswalks at intersections: people cross a street while its traffic is red (they start 1–2.5 s
   into the other street's green and are across before that street's green comes back). Mid-block crosswalks (on about a
   fifth of the streets, no signal): people step out on their own schedule; cars yield.

   A leg can adjust its city through `ctl` (see routeGen): `offsets` retimes a signal (key "i,j")
   and `quiet` empties a crosswalk for the leg — so the van's wait count stays in bounds while
   everything on screen still follows the same timing. */

export const CYCLE = 30
const GREEN = 11
const YELLOW = 2
export const WALK_WIDTH = STREET + 1.6 // kerb to kerb, plus a step onto each pavement
export const ZEBRA_OFFSET = STREET / 2 + 2.2 // intersection crosswalk centre from the node
export const STOP_CENTER = STREET / 2 + 6.7 // where a car's centre stops before an intersection
export const MID_STOP = 4.6 // …and before a mid-block crosswalk

export function hash(...n) {
  let h = 2166136261
  for (const v of n) {
    h ^= Math.imul((v | 0) + 0x9e3779b9, 0x85ebca6b)
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  }
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
const mod = (a, b) => ((a % b) + b) % b
const AX = { ns: 0, ew: 1 }

const TABLE_R = 8 // nodes -8..8 on each axis: the city and the lanes running past its edge
const TABLE_W = TABLE_R * 2 + 1
const offset = (i, j, ctl) => {
  const table = ctl?.table
  if (table && i >= -TABLE_R && i <= TABLE_R && j >= -TABLE_R && j <= TABLE_R) return table[(i + TABLE_R) * TABLE_W + j + TABLE_R]
  return ctl?.offsets.get(`${i},${j}`) ?? hash(i, j, 11) * CYCLE
}

/** A leg's finished `ctl` with every signal offset looked up once, for the per-frame drawing.
 * (routeGen still edits its own `ctl` while it plans the drive, so that one stays a plain map.) */
export function frozenCtl(ctl) {
  const table = new Float64Array(TABLE_W * TABLE_W)
  for (let i = -TABLE_R; i <= TABLE_R; i++)
    for (let j = -TABLE_R; j <= TABLE_R; j++) table[(i + TABLE_R) * TABLE_W + j + TABLE_R] = offset(i, j, ctl)
  return { offsets: ctl?.offsets ?? new Map(), quiet: ctl?.quiet ?? new Set(), table }
}

/** 'green' | 'yellow' | 'red' for traffic moving along `axis` ('ns' or 'ew') at node (i, j). */
export function lightState(i, j, axis, T, ctl) {
  const x = mod(T + offset(i, j, ctl) - (axis === 'ns' ? 0 : CYCLE / 2), CYCLE)
  return x < GREEN ? 'green' : x < GREEN + YELLOW ? 'yellow' : 'red'
}

function crossers(seed, local, startMin, startSpan) {
  const out = []
  const r = hash(...seed, 0)
  const count = r < 0.4 ? 0 : r < 0.78 ? 1 : 2
  for (let k = 0; k < count; k++) {
    const s0 = startMin + hash(...seed, k, 1) * startSpan
    const speed = 1.55 + hash(...seed, k, 2) * 0.35
    const dur = WALK_WIDTH / speed
    out.push({ s0, dur, dir: hash(...seed, k, 3) < 0.5 ? 1 : -1, lat: (hash(...seed, k, 4) - 0.5) * 2.2, local })
  }
  return out
}

/** People on the crosswalk across the `axis` street at node (i, j), on `side` (±1): [{u, dir, lat}]
 * with u = 0..1 across, plus `busy` (someone on it or about to step on, within `ahead` s). */
const EMPTY = { people: [], busy: false }

export function intersectionWalk(i, j, axis, side, T, ahead = 0, ctl) {
  if (ctl?.quiet.has(walkKey(i, j, axis, side))) return EMPTY
  // People cross the `axis` street while the other axis has green.
  const win = axis === 'ns' ? CYCLE / 2 : 0
  const L = T + offset(i, j, ctl) - win
  const c = Math.floor(L / CYCLE)
  const local = L - c * CYCLE
  const list = crossers([i, j, AX[axis], side, c], local, 1, 1.5)
  return evaluate(list, local, ahead)
}

/** Mid-block crosswalks: on the `axis` street with index `k`, between nodes `m` and m+1. */
export function hasMidWalk(axis, k, m) {
  return hash(k, m, AX[axis], 7) < 0.2
}
const MID_PERIOD = 34
export function midWalk(axis, k, m, T, ahead = 0, ctl) {
  if (ctl?.quiet.has(midKey(axis, k, m))) return EMPTY
  const L = T + hash(k, m, AX[axis], 8) * MID_PERIOD
  const c = Math.floor(L / MID_PERIOD)
  const local = L - c * MID_PERIOD
  return evaluate(crossers([k, m, AX[axis], 9, c], local, 0, 5), local, ahead)
}

function evaluate(list, local, ahead) {
  const people = []
  let busy = false
  for (const p of list) {
    // A few seconds at the kerb first, so whoever a driver is waiting for is already in view.
    if (local >= p.s0 - 4 && local < p.s0) people.push({ u: 0, dir: p.dir, lat: p.lat, waiting: true })
    if (local >= p.s0 && local <= p.s0 + p.dur) people.push({ u: (local - p.s0) / p.dur, dir: p.dir, lat: p.lat })
    if (local + ahead >= p.s0 - 0.8 && local <= p.s0 + p.dur + 0.4) busy = true
  }
  return { people, busy }
}

/** World position of a person crossing: `axis` is the street crossed, `at` its coordinate along
 * the street (where the zebra is), `line` the street's centre line. */
export function crosserPosition(axis, line, at, p) {
  const across = p.dir * (-WALK_WIDTH / 2 + p.u * WALK_WIDTH)
  // An east–west street (z = line) is crossed walking along z; a north–south one along x.
  return axis === 'ew' ? [at + p.lat * 0.5, line + across] : [line + across, at + p.lat * 0.5]
}

export const nodeAt = (k) => k * PITCH
export const walkKey = (i, j, axis, side) => `w:${i},${j},${axis},${side}`
export const midKey = (axis, k, m) => `m:${axis},${k},${m}`
/** Signal offset that starts `axis`'s green at time T (half a second ago). */
export const greenNowOffset = (axis, T) => mod((axis === 'ns' ? 0 : CYCLE / 2) + 0.5 - T, CYCLE)
