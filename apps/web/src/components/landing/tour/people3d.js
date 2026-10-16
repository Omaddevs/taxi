import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/* People in the tour city, modelled on a clay mannequin in a suit: head with a hair cap and nose,
   neck and shirt collar, a single-breasted jacket with lapels, pockets and buttons over the
   hips, trousers and shoes; arms in sleeves with hands. Five instanced parts — the body, two
   legs pivoting at the hips and two arms at the shoulders — so each person walks: legs swing,
   arms swing opposite. Metres, facing +z, 1.76 m tall. */

const HIP = 0.93
const SHOULDER = 1.405

const at = (geometry, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  geometry.applyMatrix4(
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)),
  )

function bodyGeometry() {
  // Jacket: one turned profile — hem, waist, chest, shoulders sloping into the collar — widened
  // across the shoulders and flattened front to back.
  const profile = [
    [0.001, 0.82],
    [0.172, 0.82],
    [0.178, 0.9],
    [0.168, 1.06],
    [0.182, 1.22],
    [0.196, 1.34],
    [0.2, 1.41],
    [0.186, 1.455],
    [0.14, 1.49],
    [0.075, 1.51],
    [0.001, 1.515],
  ].map(([r, y]) => new THREE.Vector2(r, y))
  const parts = [
    at(new THREE.LatheGeometry(profile, 28), 0, 0, 0, 0, 0, 0, 1.12, 1, 0.6),
    // Lapels: two narrow plates in a V, the shirt and tie between them.
    at(new THREE.BoxGeometry(0.042, 0.21, 0.008), 0.04, 1.35, 0.121, 0.02, 0, -0.24),
    at(new THREE.BoxGeometry(0.042, 0.21, 0.008), -0.04, 1.35, 0.121, 0.02, 0, 0.24),
    at(new THREE.BoxGeometry(0.02, 0.16, 0.007), 0, 1.37, 0.12, 0.02, 0, 0),
    // Flap pockets, breast pocket, two buttons.
    at(new THREE.BoxGeometry(0.09, 0.012, 0.014), 0.105, 0.98, 0.104),
    at(new THREE.BoxGeometry(0.09, 0.012, 0.014), -0.105, 0.98, 0.104),
    at(new THREE.BoxGeometry(0.06, 0.01, 0.014), -0.1, 1.31, 0.116),
    at(new THREE.SphereGeometry(0.01, 6, 4), 0, 1.12, 0.108),
    at(new THREE.SphereGeometry(0.01, 6, 4), 0, 1.03, 0.106),
    // Neck and shirt collar.
    at(new THREE.CylinderGeometry(0.048, 0.055, 0.12, 12), 0, 1.55, 0),
    at(new THREE.CylinderGeometry(0.062, 0.066, 0.045, 12), 0, 1.525, 0.004),
    // Head: skull, jaw, hair cap, nose, ears.
    at(new THREE.SphereGeometry(0.095, 18, 14), 0, 1.675, 0.004, 0, 0, 0, 0.84, 1.1, 0.98),
    at(new THREE.SphereGeometry(0.068, 14, 10), 0, 1.632, 0.006, 0, 0, 0, 0.95, 0.82, 0.92),
    at(new THREE.SphereGeometry(0.098, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.46), 0, 1.7, -0.012, -0.28, 0, 0, 0.87, 0.92, 1),
    at(new THREE.BoxGeometry(0.018, 0.034, 0.024), 0, 1.66, 0.094, 0.3),
    at(new THREE.SphereGeometry(0.02, 6, 4), 0.08, 1.665, -0.004, 0, 0, 0, 0.45, 1, 0.75),
    at(new THREE.SphereGeometry(0.02, 6, 4), -0.08, 1.665, -0.004, 0, 0, 0, 0.45, 1, 0.75),
  ]
  return mergeGeometries(parts.map((g) => g.toNonIndexed()))
}

/** A leg hanging from the hip pivot (origin): trouser, cuff and shoe. */
function legGeometry() {
  const parts = [
    at(new THREE.CapsuleGeometry(0.08, 0.78, 4, 12), 0, -0.44, 0, 0, 0, 0, 1, 1, 0.95),
    at(new THREE.CylinderGeometry(0.074, 0.074, 0.04, 12), 0, -0.86, 0),
    at(new THREE.CapsuleGeometry(0.052, 0.17, 4, 8), 0, -0.89, 0.05, Math.PI / 2, 0, 0, 1.05, 1, 0.75),
  ]
  return mergeGeometries(parts.map((g) => g.toNonIndexed()))
}

/** An arm hanging from the shoulder pivot (origin): sleeve, cuff and hand, slightly bent. */
function armGeometry() {
  const parts = [
    at(new THREE.CapsuleGeometry(0.056, 0.26, 4, 12), 0, -0.15, 0),
    at(new THREE.CylinderGeometry(0.05, 0.046, 0.28, 10), 0, -0.44, 0.02, 0.08, 0, 0),
    at(new THREE.CapsuleGeometry(0.032, 0.09, 4, 6), 0, -0.64, 0.035, 0.05, 0, 0, 1, 1, 0.65),
  ]
  return mergeGeometries(parts.map((g) => g.toNonIndexed()))
}

const CLAY = ['#ece8e1', '#e5e0d7', '#efece6', '#ddd8ce', '#e9e3d6', '#e2e2df']
const CLAY_0 = new THREE.Color(CLAY[0])

export class Crowd {
  constructor(scene, count, material) {
    this.count = count
    const mat = material ?? new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82 })
    const make = (geometry) => {
      const m = new THREE.InstancedMesh(geometry, mat, count)
      m.castShadow = true
      m.receiveShadow = true
      m.frustumCulled = false
      scene.add(m)
      return m
    }
    this.body = make(bodyGeometry())
    const leg = legGeometry()
    const arm = armGeometry()
    this.limbs = [make(leg), make(leg), make(arm), make(arm)]
    this.parts = [this.body, ...this.limbs]
    for (const m of this.parts) m.setColorAt(0, CLAY_0) // allocates instanceColor
    // Each person keeps one clay tone, whichever slot draws them (see set's `who`).
    this.tones = CLAY.map((hex) => new THREE.Color(hex))
    this.who = new Int32Array(count).fill(-1)
    this.root = new THREE.Matrix4()
    this.local = new THREE.Matrix4()
    this.out = new THREE.Matrix4()
    this.q = new THREE.Quaternion()
    this.e = new THREE.Euler()
    this.v = new THREE.Vector3()
    this.one = new THREE.Vector3(1, 1, 1)
    // Pivots: legs at the hips, arms at the shoulders.
    this.pivots = [
      [0.1, HIP, 0],
      [-0.1, HIP, 0],
      [0.2, SHOULDER, 0],
      [-0.2, SHOULDER, 0],
    ]
  }

  /** Slot `n` draws person `who` (default: the slot itself) at (x, y, z) facing (dx, dz); `phase`
   * drives the stride, `stride` 0 = standing. */
  set(n, x, y, z, dx, dz, phase, stride = 1, who = n) {
    if (this.who[n] !== who) {
      this.who[n] = who
      const tone = this.tones[who % this.tones.length]
      for (const m of this.parts) {
        m.setColorAt(n, tone)
        m.instanceColor.needsUpdate = true
      }
    }
    this.q.setFromAxisAngle(this.v.set(0, 1, 0), Math.atan2(dx, dz))
    const bob = stride * Math.abs(Math.sin(phase)) * 0.035
    this.root.compose(this.v.set(x, y + bob, z), this.q, this.one)
    this.body.setMatrixAt(n, this.root)
    const swing = Math.sin(phase) * 0.42 * stride
    const angles = [swing, -swing, -swing * 0.75, swing * 0.75]
    this.pivots.forEach(([px, py, pz], k) => {
      this.e.set(angles[k], 0, k > 1 ? (px > 0 ? 0.06 : -0.06) : 0)
      this.local.compose(this.v.set(px, py, pz), this.q.setFromEuler(this.e), this.one)
      this.limbs[k].setMatrixAt(n, this.out.multiplyMatrices(this.root, this.local))
    })
  }

  /** Draw slots 0..shown-1 only. */
  commit(shown) {
    for (const m of this.parts) {
      m.count = shown
      m.visible = shown > 0 // an empty instanced mesh still costs a draw call
      if (shown) m.instanceMatrix.needsUpdate = true
    }
  }
}
