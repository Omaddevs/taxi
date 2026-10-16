import * as THREE from 'three'
import { buildCrossingPost, buildSignalRig } from './signalRig'
import { Crowd } from './people3d'
import { BLOCK, GRID, LANE, PITCH, STREET } from './grid'
import { MID_STOP, STOP_CENTER, WALK_WIDTH, ZEBRA_OFFSET, crosserPosition, frozenCtl, hasMidWalk, hash, intersectionWalk, lightState, midWalk } from './traffic'

/* Everything in the tour city that follows the traffic rules (traffic.js), drawn with three.js:
     — a signal rig at the near-right corner of every approach (signalRig.js), its lamps lit by
       lightState(); a post with a beacon at every mid-block crosswalk
     — stop lines, and the zebras of the mid-block crosswalks
     — people crossing at the zebras (only where and when the rules let them), and people
       strolling along the pavements, back and forth on their own block
     — other cars, in the outer lanes: they keep their distance from the car ahead, stop on red
       and on yellow when they can, wait for people on a crosswalk, and give way to the van.
   Signals and people are pure functions of the scene time; the cars are simulated frame by frame
   (dt from the scene time) and placed again on every leg, away from the landmark's square.
   Only what the camera can see is drawn (and, for people and signals, worked out): each thing is
   tested against the view with a margin wide enough for its shadow, and the instanced meshes draw
   just the visible ones, packed to the front. */

const CAR_LEN = 4.4
const CAR_V = 12 // m/s ≈ 43 km/h
const CAR_ACC = 2.6
const CAR_BRAKE = 5
const GAP = 2.4 // bumper to bumper when queued
const SPAN = (GRID + 0.5) * PITCH // cars drive from -SPAN to SPAN and re-enter at the far end
const OUTER = LANE * 1.5
const LAMP = Object.fromEntries(Object.entries({ red: '#ff2a1f', yellow: '#ffc21a', green: '#1fe07a', off: '#2a2f37' }).map(([k, hex]) => [k, new THREE.Color(hex)]))
const LAMP_ORDER = ['red', 'yellow', 'green']
const STATE_CODE = { red: 1, yellow: 2, green: 3 }
const BEACON = [new THREE.Color('#4a3a1c'), new THREE.Color('#ffb020')]
const FAR = 600 // past the fog's end nothing shows
const STROLLERS = 200
const UP = new THREE.Vector3(0, 1, 0)
const MAX_CROSSERS = 140
const MAX_CARS = 170

const right = ([dx, dz]) => [-dz, dx]
const APPROACHES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

export class StreetLife {
  constructor(scene, mats) {
    this.scene = scene
    this.m4 = new THREE.Matrix4()
    this.q = new THREE.Quaternion()
    this.v3 = new THREE.Vector3()
    this.one = new THREE.Vector3(1, 1, 1)

    this.buildSignals()
    this.buildMarks(mats)

    // People: clay mannequins in suits (people3d.js), strolling and crossing.
    // One crowd for both (strollers first, then crossers): five draw calls instead of ten.
    this.people = new Crowd(scene, STROLLERS + MAX_CROSSERS)
    const carBody = new THREE.BoxGeometry(1.9, 0.75, CAR_LEN).translate(0, 0.65, 0)
    const carTop = new THREE.BoxGeometry(1.6, 0.6, 2.3).translate(0, 1.32, -0.2)
    this.carMeshes = [new THREE.InstancedMesh(carBody, mats.traffic, MAX_CARS), new THREE.InstancedMesh(carTop, mats.trafficTop, MAX_CARS)]
    this.carMeshes.forEach((m) => {
      m.frustumCulled = false
      scene.add(m)
    })
    this.cars = []
    this.lanes = []
    this.walkers = []
    this.lastT = null
    this.frustum = new THREE.Frustum()
    this.sphere = new THREE.Sphere()
    this.eye = new THREE.Vector3()
    this.m4b = new THREE.Matrix4()
  }

  /** Could something at (x, y, z) within `r` metres (its shadow included) be on screen? */
  sees(x, y, z, r) {
    const dx = x - this.eye.x
    const dz = z - this.eye.z
    if (dx * dx + dz * dz > (FAR + r) ** 2) return false
    this.sphere.center.set(x, y, z)
    this.sphere.radius = r
    return this.frustum.intersectsSphere(this.sphere)
  }

  /* ── Static ────────────────────────────────────────────────────────────────────────────── */

  buildSignals() {
    // One rig per approach, at the near-right corner, facing the oncoming traffic.
    this.heads = []
    for (let i = -GRID; i <= GRID; i++)
      for (let j = -GRID; j <= GRID; j++)
        APPROACHES.forEach((d, a) => {
          const r = right(d)
          const c = STREET / 2 + 1.1
          this.heads.push({ i, j, axis: d[0] ? 'ew' : 'ns', x: i * PITCH - d[0] * c + r[0] * c, z: j * PITCH - d[1] * c + r[1] * c, d, radar: hash(i, j, a, 61) < 0.3 })
        })
    const { rig, lamps } = buildSignalRig(this.scene, this.heads.length)
    this.signalRig = rig
    this.lampParts = lamps
    // Mid-block crosswalks: a post on each kerb, facing its own direction of traffic.
    this.posts = []
    for (let k = -GRID; k <= GRID; k++)
      for (let m = -GRID; m < GRID; m++)
        for (const axis of ['ew', 'ns']) {
          if (!hasMidWalk(axis, k, m)) continue
          const mid = axis === 'ew' ? [(m + 0.5) * PITCH, k * PITCH] : [k * PITCH, (m + 0.5) * PITCH]
          for (const d of axis === 'ew' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]]) {
            const r = right(d)
            const c = STREET / 2 + 0.8
            this.posts.push({ x: mid[0] - d[0] * 3.2 + r[0] * c, z: mid[1] - d[1] * 3.2 + r[1] * c, d })
          }
        }
    const post = buildCrossingPost(this.scene, Math.max(1, this.posts.length))
    this.postRig = post.rig
    this.beacon = post.beacon
    this.headShown = [] // rig slot → index into heads
    this.postShown = []
    this.headState = new Uint8Array(this.heads.length)
    this.beaconOn = -1
  }

  buildMarks(mats) {
    const quad = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    const bars = []
    // Stop lines: across each approach's half of the road, just before its crosswalk.
    for (let i = -GRID; i <= GRID; i++)
      for (let j = -GRID; j <= GRID; j++)
        for (const d of APPROACHES) {
          const r = right(d)
          const back = STREET / 2 + 4.3
          const cx = i * PITCH - d[0] * back + r[0] * (STREET / 4)
          const cz = j * PITCH - d[1] * back + r[1] * (STREET / 4)
          bars.push(d[0] ? [cx, cz, 0.45, STREET / 2 - 0.4] : [cx, cz, STREET / 2 - 0.4, 0.45])
        }
    // Mid-block crosswalks.
    const zebras = []
    for (let k = -GRID; k <= GRID; k++)
      for (let m = -GRID; m < GRID; m++)
        for (const axis of ['ew', 'ns']) {
          if (!hasMidWalk(axis, k, m)) continue
          const at = (m + 0.5) * PITCH
          const line = k * PITCH
          for (let o = -STREET / 2 + 1; o < STREET / 2 - 0.6; o += 1.2)
            zebras.push(axis === 'ew' ? [at, line + o + 0.3, 3.2, 0.6] : [line + o + 0.3, at, 0.6, 3.2])
        }
    for (const [list, mat] of [
      [bars, mats.mark],
      [zebras, mats.zebra],
    ]) {
      const mesh = new THREE.InstancedMesh(quad, mat, list.length)
      list.forEach(([x, z, sx, sz], idx) => mesh.setMatrixAt(idx, this.m4.compose(this.v3.set(x, 0.035, z), this.q.identity(), new THREE.Vector3(sx, 1, sz))))
      mesh.receiveShadow = true
      this.scene.add(mesh)
    }
  }

  /* ── Per leg ───────────────────────────────────────────────────────────────────────────── */

  /** `blocked(x, z, pad)`: true where the landmark's square is — no signals, cars or people. */
  layout(seed, blocked, ctl) {
    this.blocked = blocked
    // Every signal's offset looked up once for the leg.
    this.ctl = frozenCtl(ctl)
    const { q, v3 } = this
    // Signals and crosswalk posts: none on the square. Each keeps its world matrix; which of them
    // are drawn is decided per frame (updateSignals).
    for (const h of [...this.heads, ...this.posts]) {
      h.hide = blocked(h.x, h.z, 4)
      q.setFromAxisAngle(v3.set(0, 1, 0), Math.atan2(-h.d[0], -h.d[1]))
      h.world ??= new THREE.Matrix4()
      h.world.compose(v3.set(h.x, 0.22, h.z), q, this.one)
      if (h.axis) h.opts ??= { axis: h.axis, radar: h.radar }
    }
    this.headShown = null
    this.postShown = null

    // People strolling: on the pavement of random blocks, pacing along one side.
    const r = (k) => hash(seed, k, 31)
    this.walkers = []
    for (let k = 0; this.walkers.length < STROLLERS && k < 600; k++) {
      const bi = Math.floor(r(k * 5) * (GRID * 2 + 2)) - GRID - 1
      const bj = Math.floor(r(k * 5 + 1) * (GRID * 2 + 2)) - GRID - 1
      const cx = bi * PITCH + PITCH / 2
      const cz = bj * PITCH + PITCH / 2
      if (blocked(cx, cz, BLOCK / 2)) continue
      const side = Math.floor(r(k * 5 + 2) * 4)
      const edge = BLOCK / 2 - 0.9
      this.walkers.push({ cx, cz, side, edge, len: 2 * (edge - 3), phase: r(k * 5 + 3), speed: 1.1 + r(k * 5 + 4) * 0.5 })
    }

    // Cars: three or four on every outer lane that stays clear of the square.
    this.cars = []
    for (let k = -GRID; k <= GRID; k++)
      for (const horizontal of [true, false])
        for (const sideSign of [1, -1]) {
          const line = k * PITCH + sideSign * OUTER
          // Right-hand traffic: eastbound on the south side (+z), northbound on the east (+x).
          const dir = horizontal ? sideSign : -sideSign
          if (laneCrosses(blocked, horizontal, line)) continue
          const count = 3 + Math.floor(hash(seed, k, horizontal ? 1 : 2, sideSign, 41) * 2)
          const spacing = (2 * SPAN) / count
          for (let c = 0; c < count && this.cars.length < MAX_CARS; c++) {
            const pos = -SPAN + spacing * (c + 0.2 + hash(seed, k, sideSign, c, 43) * 0.6)
            this.cars.push({ horizontal, line, dir, pos, v: CAR_V * 0.7, k })
          }
        }
    // The cars of each lane, together.
    const lanes = new Map()
    for (const c of this.cars) {
      const key = `${c.horizontal}:${c.line}`
      if (!lanes.has(key)) lanes.set(key, [])
      lanes.get(key).push(c)
    }
    this.lanes = [...lanes.values()]
    this.lastT = null
  }

  /* ── Per frame ─────────────────────────────────────────────────────────────────────────── */

  /** `camera` with its world matrix up to date. */
  update(T, van, camera) {
    this.frustum.setFromProjectionMatrix(this.m4b.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
    this.eye.setFromMatrixPosition(camera.matrixWorld)
    this.updateSignals(T)
    this.updatePeople(T)
    const dt = this.lastT === null ? 0 : T - this.lastT
    this.lastT = T
    // A jump (seek, a new leg) restarts the cars' motion rather than teleporting them.
    this.updateCars(dt > 0 && dt < 0.5 ? dt : 0, T, van)
  }

  updateSignals(T) {
    // Mid-block beacons blink amber together.
    const on = Math.floor(T * 1.6) % 2 ? 1 : 0
    if (on !== this.beaconOn) {
      this.beaconOn = on
      this.beacon.mesh.material.color.copy(BEACON[on])
    }
    // The rigs and posts in view (a rig's arm reaches 6.4 m over the road, its shadow a bit more),
    // placed again only when that set changes.
    const pick = (list, y, r) => {
      const out = []
      list.forEach((h, n) => {
        if (!h.hide && this.sees(h.x, y, h.z, r)) out.push(n)
      })
      return out
    }
    const same = (a, b) => b && a.length === b.length && a.every((v, k) => v === b[k])
    const heads = pick(this.heads, 4.5, 12)
    const headsMoved = !same(heads, this.headShown)
    if (headsMoved) {
      this.headShown = heads
      heads.forEach((n, slot) => this.signalRig.place(slot, this.heads[n].world, this.heads[n].opts))
      this.signalRig.commit(heads.length)
    }
    const posts = pick(this.posts, 3, 8)
    if (!same(posts, this.postShown)) {
      this.postShown = posts
      posts.forEach((n, slot) => this.postRig.place(slot, this.posts[n].world, null))
      this.postRig.commit(posts.length)
    }
    // Lamp colours change only at phase boundaries, or when other rigs come into view.
    let changed = headsMoved
    for (const n of heads) {
      const h = this.heads[n]
      const code = STATE_CODE[lightState(h.i, h.j, h.axis, T, this.ctl)]
      if (code !== this.headState[n]) {
        this.headState[n] = code
        changed = true
      }
    }
    if (!changed) return
    for (const lamp of LAMP_ORDER) {
      const lit = STATE_CODE[lamp]
      for (const part of this.lampParts[lamp]) {
        heads.forEach((n, slot) => part.mesh.setColorAt(slot, this.headState[n] === lit ? LAMP[lamp] : LAMP.off))
        if (part.mesh.instanceColor) part.mesh.instanceColor.needsUpdate = true
      }
    }
  }

  updatePeople(T) {
    // Strollers pace their side of the block, turning back at the corners.
    let shown = 0
    this.walkers.forEach((w, n) => {
      const { len } = w
      const s = ((w.phase * len + T * w.speed) % (2 * len)) / len // 0..2
      const along = -w.edge + 3 + (s < 1 ? s : 2 - s) * len
      const way = s < 1 ? 1 : -1
      const alongZ = w.side < 2
      const x = w.side === 0 ? w.cx - w.edge : w.side === 1 ? w.cx + w.edge : w.cx + along
      const z = alongZ ? w.cz + along : w.side === 2 ? w.cz - w.edge : w.cz + w.edge
      if (!this.sees(x, 1, z, 3)) return
      this.people.set(shown++, x, 0.22, z, alongZ ? 0 : way, alongZ ? way : 0, T * 4.6 * w.speed + n, 1, n)
    })

    // People on the crosswalks in view.
    let n = shown
    const put = (axis, line, at, people) => {
      for (const p of people) {
        if (n >= shown + MAX_CROSSERS) return
        const [x, z] = crosserPosition(axis, line, at, p)
        // Crossing an east–west street means walking along z, a north–south one along x.
        // Stride and clay tone belong to the person, not to the slot drawing them.
        const who = Math.floor(Math.abs(at * 7 + line * 13 + p.lat * 50 + p.dir * 3))
        this.people.set(n, x, p.waiting ? 0.22 : 0.02, z, axis === 'ew' ? 0 : p.dir, axis === 'ew' ? p.dir : 0, T * 5.2 + who, p.waiting ? 0 : 1, who)
        n++
      }
    }
    const nodeR = ZEBRA_OFFSET + WALK_WIDTH / 2 + 3
    for (let i = -GRID; i <= GRID; i++)
      for (let j = -GRID; j <= GRID; j++) {
        if (!this.sees(i * PITCH, 1, j * PITCH, nodeR) || this.blocked?.(i * PITCH, j * PITCH, STREET)) continue
        for (const side of [-1, 1]) {
          put('ew', j * PITCH, i * PITCH + side * ZEBRA_OFFSET, intersectionWalk(i, j, 'ew', side, T, 0, this.ctl).people)
          put('ns', i * PITCH, j * PITCH + side * ZEBRA_OFFSET, intersectionWalk(i, j, 'ns', side, T, 0, this.ctl).people)
        }
      }
    const midR = WALK_WIDTH / 2 + 4
    for (let k = -GRID; k <= GRID; k++)
      for (let m = -GRID; m < GRID; m++)
        for (const axis of ['ew', 'ns']) {
          if (!hasMidWalk(axis, k, m)) continue
          const at = (m + 0.5) * PITCH
          if (!this.sees(axis === 'ew' ? at : k * PITCH, 1, axis === 'ew' ? k * PITCH : at, midR)) continue
          put(axis, k * PITCH, at, midWalk(axis, k, m, T, 0, this.ctl).people)
        }
    this.people.commit(n)
  }

  updateCars(dt, T, van) {
    for (const list of this.lanes) {
      // Front to back along the direction of travel.
      list.sort((a, b) => (b.pos - a.pos) * a.dir)
      list.forEach((c, idx) => {
        let target = CAR_V
        const limit = (gap) => {
          target = Math.min(target, gap <= 0.15 ? 0 : Math.sqrt(2 * CAR_BRAKE * gap))
        }
        // The car ahead.
        const lead = list[idx - 1]
        if (lead) limit((lead.pos - c.pos) * c.dir - CAR_LEN - GAP)
        // The van, when it is in this lane ahead (on a turn, or crossing).
        const along = c.horizontal ? van.x : van.z
        const across = c.horizontal ? van.z : van.x
        const ahead = (along - c.pos) * c.dir
        if (Math.abs(across - c.line) < 2.6 && ahead > 0 && ahead < 45) limit(ahead - CAR_LEN - GAP)
        // The next intersection: its signal, and the van in it.
        const stopAt = (node) => (node - c.dir * STOP_CENTER - c.pos) * c.dir
        let node = c.dir > 0 ? Math.ceil((c.pos + STOP_CENTER - 0.5) / PITCH) * PITCH : Math.floor((c.pos - STOP_CENTER + 0.5) / PITCH) * PITCH
        if (stopAt(node) < -0.5) node += c.dir * PITCH
        const dist = stopAt(node)
        if (dist < 70) {
          const i = c.horizontal ? node / PITCH : c.k
          const j = c.horizontal ? c.k : node / PITCH
          const s = lightState(Math.round(i), Math.round(j), c.horizontal ? 'ew' : 'ns', T, this.ctl)
          const cannotStop = (c.v * c.v) / (2 * CAR_BRAKE * 1.6) > dist
          const vanThere = Math.abs(van.x - (c.horizontal ? node : c.line)) < STREET / 2 + 7 && Math.abs(van.z - (c.horizontal ? c.line : node)) < STREET / 2 + 7
          if (s === 'red' || (s === 'yellow' && !cannotStop) || (vanThere && dist > -0.5)) limit(dist)
        }
        // A mid-block crosswalk ahead with people on it.
        for (const step of [0, 1]) {
          const m = Math.floor(c.pos / PITCH) + (c.dir > 0 ? step : -step)
          const at = (m + 0.5) * PITCH
          const toStop = (at - c.dir * MID_STOP - c.pos) * c.dir
          if (toStop > -0.5 && toStop < 50 && hasMidWalk(c.horizontal ? 'ew' : 'ns', c.k, m) && midWalk(c.horizontal ? 'ew' : 'ns', c.k, m, T, 1.5, this.ctl).busy) limit(toStop)
        }
        c.v = target > c.v ? Math.min(target, c.v + CAR_ACC * dt) : Math.max(target, c.v - CAR_BRAKE * 2 * dt)
        c.pos += c.v * c.dir * dt
      })
      // Past the edge of the city: re-enter at the far end when there is room there.
      for (const c of list) {
        if (c.pos * c.dir < SPAN) continue
        const entry = -c.dir * SPAN
        const room = list.every((o) => o === c || Math.abs(o.pos - entry) > CAR_LEN + 12)
        if (room) {
          c.pos = entry
          c.v = CAR_V * 0.6
        } else c.v = 0
      }
    }
    // Draw the ones in view.
    const { m4, q, v3, one } = this
    let shown = 0
    for (const c of this.cars) {
      if (Math.abs(c.pos) >= SPAN - 0.01) continue // past the edge, waiting to re-enter
      const x = c.horizontal ? c.pos : c.line
      const z = c.horizontal ? c.line : c.pos
      if (!this.sees(x, 1, z, 4)) continue
      q.setFromAxisAngle(UP, c.horizontal ? Math.PI / 2 : 0)
      m4.compose(v3.set(x, 0, z), q, one)
      this.carMeshes[0].setMatrixAt(shown, m4)
      this.carMeshes[1].setMatrixAt(shown, m4)
      shown++
    }
    for (const m of this.carMeshes) {
      m.count = shown
      m.visible = shown > 0
      if (shown) m.instanceMatrix.needsUpdate = true
    }
  }
}

/** Does a lane run across the square? Sampled along its length. */
function laneCrosses(blocked, horizontal, line) {
  for (let p = -SPAN; p <= SPAN; p += 8) if (blocked(horizontal ? p : line, horizontal ? line : p, 3)) return true
  return false
}
