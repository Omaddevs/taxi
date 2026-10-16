import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/* Street furniture of the tour city, modelled on real signal installations:
     — the signal rig at an approach: a galvanised pole on the corner with a mast arm over the
       lanes; on the arm a signal head on a black backplate with a white border (three lamps with
       tunnel visors and LED lenses), a radar/camera unit on some intersections; on the pole a
       second head at the driver's eye level, a pedestrian-crossing sign, and a priority sign on
       top — "main road" on east–west streets, "give way" on north–south ones;
     — the post at a mid-block crosswalk: pedestrian-crossing sign, a flashing amber beacon and a
       small solar panel.
   Every part is instanced: one rig = the same part list placed by one world matrix. Parts that
   share a material, a shadow setting and a condition are baked into one instanced mesh (build()),
   so a rig of some thirty parts draws in under twenty calls.
   Local frame of a rig: origin at the foot of the pole, +z towards the oncoming traffic, the arm
   reaching along −x over the lanes. */

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const roundRect = (g, x, y, w, h, r) => {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

let TEX = null
export function signTextures() {
  if (TEX) return TEX
  TEX = {
    // Pedestrian crossing: blue square, white triangle, walker on a zebra; fluorescent border.
    crossing: canvasTexture(256, 256, (g) => {
      roundRect(g, 0, 0, 256, 256, 22)
      g.fillStyle = '#c8f03c'
      g.fill()
      roundRect(g, 18, 18, 220, 220, 14)
      g.fillStyle = '#ffffff'
      g.fill()
      roundRect(g, 26, 26, 204, 204, 10)
      g.fillStyle = '#1f5fbf'
      g.fill()
      g.beginPath()
      g.moveTo(128, 44)
      g.lineTo(212, 206)
      g.lineTo(44, 206)
      g.closePath()
      g.fillStyle = '#ffffff'
      g.fill()
      g.fillStyle = '#111418'
      for (let i = 0; i < 5; i++) g.fillRect(70 + i * 24, 186, 14, 12)
      g.beginPath()
      g.arc(132, 96, 11, 0, Math.PI * 2)
      g.fill()
      g.lineWidth = 10
      g.lineCap = 'round'
      g.strokeStyle = '#111418'
      g.beginPath()
      g.moveTo(128, 112)
      g.lineTo(122, 146)
      g.lineTo(104, 176)
      g.moveTo(122, 146)
      g.lineTo(142, 176)
      g.moveTo(126, 122)
      g.lineTo(150, 138)
      g.moveTo(126, 122)
      g.lineTo(106, 138)
      g.stroke()
    }),
    // Main road: a yellow square on its corner inside a white one.
    priority: canvasTexture(256, 256, (g) => {
      g.translate(128, 128)
      g.rotate(Math.PI / 4)
      roundRect(g, -86, -86, 172, 172, 14)
      g.fillStyle = '#ffffff'
      g.fill()
      g.lineWidth = 4
      g.strokeStyle = '#9aa3ad'
      g.stroke()
      roundRect(g, -56, -56, 112, 112, 6)
      g.fillStyle = '#f5c518'
      g.fill()
      g.lineWidth = 6
      g.strokeStyle = '#2b2b2b'
      g.stroke()
    }),
    // Give way: an inverted triangle with a red border.
    giveWay: canvasTexture(256, 256, (g) => {
      const tri = (inset) => {
        g.beginPath()
        g.moveTo(16 + inset * 1.7, 26 + inset)
        g.lineTo(240 - inset * 1.7, 26 + inset)
        g.lineTo(128, 236 - inset * 2)
        g.closePath()
      }
      tri(0)
      g.fillStyle = '#d7262b'
      g.fill()
      tri(26)
      g.fillStyle = '#ffffff'
      g.fill()
    }),
    // LED lens: a dot grid, tinted per lamp by the instance colour.
    lens: canvasTexture(128, 128, (g) => {
      g.fillStyle = '#5a5a5a'
      g.beginPath()
      g.arc(64, 64, 64, 0, Math.PI * 2)
      g.fill()
      for (let y = 8; y < 128; y += 11)
        for (let x = 8 + ((y / 11) % 2) * 5; x < 128; x += 11) {
          if ((x - 64) ** 2 + (y - 64) ** 2 > 56 ** 2) continue
          const glow = g.createRadialGradient(x, y, 0, x, y, 5)
          glow.addColorStop(0, '#ffffff')
          glow.addColorStop(1, 'rgba(255,255,255,0.35)')
          g.fillStyle = glow
          g.beginPath()
          g.arc(x, y, 4.4, 0, Math.PI * 2)
          g.fill()
        }
    }),
    solar: canvasTexture(128, 96, (g) => {
      g.fillStyle = '#1b2a4a'
      g.fillRect(0, 0, 128, 96)
      g.strokeStyle = '#7f93b8'
      g.lineWidth = 2
      for (let x = 0; x <= 128; x += 21) {
        g.beginPath()
        g.moveTo(x, 0)
        g.lineTo(x, 96)
        g.stroke()
      }
      for (let y = 0; y <= 96; y += 24) {
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(128, y)
        g.stroke()
      }
      const sheen = g.createLinearGradient(0, 0, 128, 96)
      sheen.addColorStop(0, 'rgba(255,255,255,0.22)')
      sheen.addColorStop(0.5, 'rgba(255,255,255,0)')
      g.fillStyle = sheen
      g.fillRect(0, 0, 128, 96)
    }),
  }
  return TEX
}

const M = (x, y, z, rx = 0, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1))

/** A set of instanced parts placed together. */
const ATTRS = ['position', 'normal', 'uv']
export class Rig {
  constructor(scene, count) {
    this.scene = scene
    this.count = count
    this.specs = []
    this.parts = []
    this.hidden = new THREE.Matrix4().makeScale(0, 0, 0)
  }

  /** A part: its geometry at `local` in the rig's frame. Returns a handle whose `mesh` is set by build(). */
  add(geometry, material, local, { shadow = true, when } = {}) {
    const spec = { geometry, material, local, shadow, when, mesh: null }
    this.specs.push(spec)
    return spec
  }

  /** Bake the parts into instanced meshes, one per material + shadow + condition. */
  build() {
    const conds = new Map()
    const groups = new Map()
    for (const spec of this.specs) {
      if (!conds.has(spec.when)) conds.set(spec.when, conds.size)
      const key = `${spec.material.uuid}|${spec.shadow}|${conds.get(spec.when)}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(spec)
    }
    for (const list of groups.values()) {
      const geos = list.map((spec) => {
        const g = (spec.geometry.index ? spec.geometry.toNonIndexed() : spec.geometry.clone()).applyMatrix4(spec.local)
        for (const name of Object.keys(g.attributes)) if (!ATTRS.includes(name)) g.deleteAttribute(name)
        g.clearGroups()
        return g
      })
      const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos)
      if (geos.length > 1) geos.forEach((g) => g.dispose())
      const mesh = new THREE.InstancedMesh(geometry, list[0].material, this.count)
      mesh.castShadow = list[0].shadow
      mesh.frustumCulled = false
      this.scene.add(mesh)
      for (const spec of list) spec.mesh = mesh
      this.parts.push({ mesh, when: list[0].when })
    }
    this.specs = []
  }

  /** Place rig `n`; `opts` is handed to each part's `when` (null hides the rig). */
  place(n, world, opts) {
    for (const p of this.parts) {
      const show = world && (!p.when || p.when(opts))
      p.mesh.setMatrixAt(n, show ? world : this.hidden)
    }
  }

  /** Upload the placed matrices; with `shown`, draw only rigs 0..shown-1. */
  commit(shown = this.count) {
    for (const p of this.parts) {
      p.mesh.count = shown
      p.mesh.visible = shown > 0
      p.mesh.instanceMatrix.needsUpdate = true
    }
  }
}

const mats = () => ({
  steel: new THREE.MeshStandardMaterial({ color: '#a9b1ba', roughness: 0.42, metalness: 0.65 }),
  dark: new THREE.MeshStandardMaterial({ color: '#23272e', roughness: 0.55, metalness: 0.25 }),
  housing: new THREE.MeshStandardMaterial({ color: '#3a4049', roughness: 0.5, metalness: 0.3 }),
  white: new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.5 }),
  visor: new THREE.MeshStandardMaterial({ color: '#1c2026', roughness: 0.6, side: THREE.DoubleSide }),
  camera: new THREE.MeshStandardMaterial({ color: '#eceff2', roughness: 0.35, metalness: 0.2 }),
  glassDark: new THREE.MeshStandardMaterial({ color: '#0d1117', roughness: 0.1, metalness: 0.5 }),
  plate: new THREE.MeshStandardMaterial({ color: '#9aa2ab', roughness: 0.5, metalness: 0.5 }),
  amber: new THREE.MeshBasicMaterial({ color: '#ffb020', toneMapped: false }),
})

/** Lamp parts (`lamp` = 'red' | 'yellow' | 'green') on a head whose face centre is at (x, y, z). */
function head(rig, m, x, y, z, lamps, scale = 1) {
  const s = scale
  rig.add(new THREE.BoxGeometry(0.78 * s, 1.72 * s, 0.03), m.white, M(x, y, z - 0.2 * s)) // backplate border
  rig.add(new THREE.BoxGeometry(0.7 * s, 1.64 * s, 0.035), m.dark, M(x, y, z - 0.185 * s)) // backplate
  rig.add(new THREE.BoxGeometry(0.44 * s, 1.36 * s, 0.32 * s), m.housing, M(x, y, z - 0.02 * s))
  const visor = new THREE.CylinderGeometry(0.19 * s, 0.19 * s, 0.26 * s, 18, 1, true, Math.PI * 0.38, Math.PI * 1.24) // hood over the top
  const lens = new THREE.CircleGeometry(0.15 * s, 24)
  ;['red', 'yellow', 'green'].forEach((name, k) => {
    const ly = y + (0.43 - k * 0.43) * s
    rig.add(visor, m.visor, M(x, ly, z + 0.27 * s, Math.PI / 2, 0, 0), { shadow: false })
    lamps[name].push(rig.add(lens, m.lens, M(x, ly, z + 0.145 * s), { shadow: false }))
  })
}

/** The approach rig: build its parts; returns { rig, lamps: {red: [part…], yellow, green} }. */
export function buildSignalRig(scene, count) {
  const tex = signTextures()
  // One LED-lens material per lamp colour, so each colour's lenses on both heads bake together.
  const m = { ...mats(), lens: null }
  const rig = new Rig(scene, count)
  const lamps = { red: [], yellow: [], green: [] }
  const ARM = 6.4
  const ARM_Y = 7.6 // the head over the lanes clears 5.4 m, above the chase camera

  rig.add(new THREE.CylinderGeometry(0.26, 0.3, 0.5, 12), m.steel, M(0, 0.25, 0)) // base collar
  rig.add(new THREE.CylinderGeometry(0.11, 0.14, ARM_Y + 1.6, 14), m.steel, M(0, (ARM_Y + 1.6) / 2, 0))
  rig.add(new THREE.CylinderGeometry(0.075, 0.09, ARM, 10), m.steel, M(-ARM / 2, ARM_Y, 0, 0, 0, Math.PI / 2)) // mast arm
  rig.add(new THREE.CylinderGeometry(0.04, 0.04, 3.1, 8), m.steel, M(-1.35, ARM_Y - 0.62, 0, 0, 0, Math.atan2(2.7, 1.25))) // brace
  rig.add(new THREE.BoxGeometry(0.16, 0.42, 0.16), m.steel, M(-ARM + 0.9, ARM_Y - 0.21, 0)) // hanger
  m.lens = new THREE.MeshBasicMaterial({ map: tex.lens, toneMapped: false })
  head(rig, m, -ARM + 0.9, ARM_Y - 1.32, 0, lamps) // over the lanes
  head(rig, m, 0, 3.05, 0.3, lamps, 0.72) // at eye level, on the pole
  rig.add(new THREE.BoxGeometry(0.42, 0.6, 0.24), m.plate, M(0.32, 2.05, 0)) // controller box

  // Radar / camera on the arm (some intersections).
  const radar = { when: (o) => o?.radar }
  rig.add(new THREE.BoxGeometry(0.14, 0.32, 0.14), m.steel, M(-2.6, ARM_Y + 0.22, 0), radar)
  rig.add(new THREE.BoxGeometry(0.42, 0.3, 0.72), m.camera, M(-2.6, ARM_Y + 0.5, 0.1), radar)
  rig.add(new THREE.BoxGeometry(0.5, 0.06, 0.82), m.camera, M(-2.6, ARM_Y + 0.68, 0.12), radar) // sun hood
  rig.add(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 18), m.glassDark, M(-2.6, ARM_Y + 0.5, 0.48, Math.PI / 2, 0, 0), radar)
  rig.add(new THREE.BoxGeometry(0.36, 0.52, 0.2), m.white, M(-4.1, ARM_Y - 0.36, 0.05), radar) // IR flash

  // Signs: pedestrian crossing on every approach, priority on top.
  const sign = (map, w, h, x, y, z, when) => {
    rig.add(new THREE.BoxGeometry(w, h, 0.04), m.plate, M(x, y, z - 0.03), { when })
    rig.add(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.45, transparent: true, alphaTest: 0.2 }), M(x, y, z), { shadow: false, when })
  }
  sign(tex.crossing, 0.8, 0.8, 0, 4.55, 0.16)
  sign(tex.priority, 0.92, 0.92, 0, ARM_Y + 1.05, 0.16, (o) => o?.axis === 'ew')
  sign(tex.giveWay, 0.9, 0.82, 0, ARM_Y + 1.05, 0.16, (o) => o?.axis === 'ns')
  rig.build()
  // Each lamp colour: its baked mesh(es), once each.
  for (const name of Object.keys(lamps)) lamps[name] = [...new Set(lamps[name].map((spec) => spec.mesh))].map((mesh) => ({ mesh }))
  // Lamp colours from the start, so their shader is the instance-coloured one from the first compile.
  const off = new THREE.Color('#2a2f37')
  for (const parts of Object.values(lamps)) for (const { mesh } of parts) for (let n = 0; n < count; n++) mesh.setColorAt(n, off)
  return { rig, lamps }
}

/** The mid-block crosswalk post: crossing sign, amber beacon and a solar panel. */
export function buildCrossingPost(scene, count) {
  const tex = signTextures()
  const m = mats()
  const rig = new Rig(scene, count)
  rig.add(new THREE.CylinderGeometry(0.075, 0.09, 4.6, 12), m.steel, M(0, 2.3, 0))
  rig.add(new THREE.BoxGeometry(0.76, 0.76, 0.04), m.plate, M(0, 3.1, 0.07))
  rig.add(new THREE.PlaneGeometry(0.76, 0.76), new THREE.MeshStandardMaterial({ map: tex.crossing, roughness: 0.45 }), M(0, 3.1, 0.1), { shadow: false })
  rig.add(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 16), m.dark, M(0, 3.75, 0.08, Math.PI / 2, 0, 0))
  const beacon = rig.add(new THREE.CircleGeometry(0.13, 20), m.amber, M(0, 3.75, 0.2), { shadow: false })
  rig.add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), m.steel, M(0.3, 4.6, 0, 0, 0, Math.PI / 3))
  rig.add(new THREE.BoxGeometry(1.15, 0.04, 0.8), new THREE.MeshStandardMaterial({ map: tex.solar, roughness: 0.25, metalness: 0.4 }), M(0.78, 4.95, 0, 0.5, 0, 0))
  rig.build()
  return { rig, beacon }
}
