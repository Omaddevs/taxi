import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/* "O‘rindiq tanlang" in 3D: a white sedan with the roof cut away, leather seats, the driver at
   the wheel (left-hand drive) and a seated mannequin — a man or a woman — on every picked seat.
   Metres; the car points to -z, its left side is -x, y is up. Loaded on demand by SeatSheet. */

export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

const COLORS = {
  paint: '#f4f6f8',
  stripe: '#00c7d4',
  trim: '#20262e',
  cabin: '#2a3039',
  floor: '#1b2027',
  leather: '#d9c6a2',
  driverSeat: '#3a4250',
  male: '#2563eb',
  female: '#e91e63',
  skin: '#e7bb92',
  hairMale: '#2a1c14',
  hairFemale: '#3b2417',
  trousers: '#273142',
  shoes: '#15191f',
  driverShirt: '#e9edf2',
}

// Seat centres (cushion middle) and widths.
const SEATS = {
  FRONT: { x: 0.37, z: -0.02, w: 0.5, front: true },
  REAR_LEFT: { x: -0.47, z: 0.86, w: 0.44 },
  REAR_MIDDLE: { x: 0, z: 0.86, w: 0.42 },
  REAR_RIGHT: { x: 0.47, z: 0.86, w: 0.44 },
}
const DRIVER = { x: -0.37, z: -0.02, w: 0.5, front: true }

const FLOOR_Y = 0.36
const CUSHION_Y = 0.6 // top of the seat cushion

const at = (g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  g.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(sx, sy, sz),
    ),
  )
const merge = (parts) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))

function radialTexture(inner, outer) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, inner)
  grad.addColorStop(1, outer)
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ── Car body ────────────────────────────────────────────────────────────────────────────────

/** Top-down outline (shape y = -world z): a rounded nose, straight flanks, a rounded tail. */
function outline(halfW, front, rear) {
  const s = new THREE.Shape()
  const nose = 0.5
  const tail = 0.38
  s.moveTo(-halfW + 0.12, -rear)
  s.lineTo(halfW - 0.12, -rear)
  s.quadraticCurveTo(halfW, -rear, halfW, -rear + tail)
  s.lineTo(halfW, front - nose)
  s.bezierCurveTo(halfW, front - 0.12, halfW - 0.22, front, halfW - 0.5, front)
  s.lineTo(-halfW + 0.5, front)
  s.bezierCurveTo(-halfW + 0.22, front, -halfW, front - 0.12, -halfW, front - nose)
  s.lineTo(-halfW, -rear + tail)
  s.quadraticCurveTo(-halfW, -rear, -halfW + 0.12, -rear)
  return s
}

function roundedRect(x0, y0, x1, y1, r) {
  const p = new THREE.Path()
  p.moveTo(x0 + r, y0)
  p.lineTo(x1 - r, y0)
  p.quadraticCurveTo(x1, y0, x1, y0 + r)
  p.lineTo(x1, y1 - r)
  p.quadraticCurveTo(x1, y1, x1 - r, y1)
  p.lineTo(x0 + r, y1)
  p.quadraticCurveTo(x0, y1, x0, y1 - r)
  p.lineTo(x0, y0 + r)
  p.quadraticCurveTo(x0, y0, x0 + r, y0)
  return p
}

function extrudeUp(shape, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 24,
  })
  g.rotateX(-Math.PI / 2) // shape xy → world x/-z, extrusion → +y
  return g
}

function buildCar(mats) {
  const car = new THREE.Group()

  // Lower body: one shell with the cabin cut out of it (beltline at ~0.94 m).
  const body = outline(0.84, 1.95, 1.88)
  body.holes.push(roundedRect(-0.74, -1.12, 0.74, 0.6, 0.16)) // cabin opening, shape y = -z
  const shell = new THREE.Mesh(extrudeUp(body, 0.44, 0.13), mats.paint)
  shell.position.y = 0.38
  car.add(shell)

  // Sills and bumpers in dark trim, under the paint line.
  const skirt = new THREE.Mesh(extrudeUp(outline(0.86, 1.98, 1.91), 0.1, 0.05), mats.trim)
  skirt.position.y = 0.24
  car.add(skirt)

  // Hood crease and trunk lid: gentle raised panels.
  const hood = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.06, 1.06, 4, 0.03), mats.paint)
  hood.position.set(0, 0.94, -1.28)
  hood.rotation.x = -0.07
  car.add(hood)
  const trunk = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.06, 0.6, 4, 0.03), mats.paint)
  trunk.position.set(0, 0.96, 1.48)
  trunk.rotation.x = 0.05
  car.add(trunk)

  // Twin brand stripes over the hood and the trunk lid.
  for (const x of [-0.13, 0.13]) {
    const onHood = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.012, 1.0, 2, 0.005), mats.stripe)
    onHood.position.set(x, 0.976, -1.28)
    onHood.rotation.x = -0.07
    car.add(onHood)
    const onTrunk = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.012, 0.56, 2, 0.005), mats.stripe)
    onTrunk.position.set(x, 0.996, 1.48)
    onTrunk.rotation.x = 0.05
    car.add(onTrunk)
  }

  // Brand stripe along both flanks.
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 3.0), mats.stripe)
    stripe.position.set(side * 0.935, 0.66, 0.05)
    car.add(stripe)
  }

  // Windshield: a tinted pane leaning back, framed by A-pillars and a header.
  // Base on the scuttle in front of the dash, top leaning back over the front seats.
  const glass = new THREE.Mesh(new RoundedBoxGeometry(1.44, 0.016, 0.62, 2, 0.006), mats.glass)
  glass.position.set(0, 1.16, -0.62)
  glass.rotation.x = -0.82
  car.add(glass)
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.06, 0.66, 2, 0.025), mats.trim)
    pillar.position.set(side * 0.74, 1.16, -0.62)
    pillar.rotation.x = -0.82
    car.add(pillar)
  }
  const header = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.06, 0.08, 2, 0.025), mats.trim)
  header.position.set(0, 1.4, -0.39)
  car.add(header)
  // Wheel arches: dark lips over each wheel.
  const arch = new THREE.TorusGeometry(0.38, 0.045, 8, 28, Math.PI)
  arch.rotateY(Math.PI / 2)
  for (const [x, z] of [[-0.93, -1.28], [0.93, -1.28], [-0.93, 1.26], [0.93, 1.26]]) {
    const lip = new THREE.Mesh(arch, mats.trim)
    lip.position.set(x, 0.36, z)
    car.add(lip)
  }

  // Mirrors.
  for (const side of [-1, 1]) {
    const mirror = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.12, 0.08, 3, 0.03), mats.paint)
    mirror.position.set(side * 1.0, 1.0, -0.62)
    car.add(mirror)
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.01), mats.glass)
    face.position.set(side * 1.0, 1.0, -0.575)
    car.add(face)
  }

  // Lights and grille.
  for (const side of [-1, 1]) {
    const head = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.07, 0.1, 3, 0.03), mats.headlight)
    head.position.set(side * 0.55, 0.86, -2.0)
    head.rotation.y = side * 0.25
    car.add(head)
    const tail = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.07, 0.08, 3, 0.03), mats.taillight)
    tail.position.set(side * 0.55, 0.88, 1.94)
    tail.rotation.y = -side * 0.22
    car.add(tail)
  }
  const grille = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.1, 0.06, 3, 0.025), mats.trim)
  grille.position.set(0, 0.72, -2.02)
  car.add(grille)

  // Wheels: tyre, rim and a few spokes.
  const tyre = new THREE.CylinderGeometry(0.33, 0.33, 0.23, 32)
  tyre.rotateZ(Math.PI / 2)
  const rim = new THREE.CylinderGeometry(0.21, 0.21, 0.24, 24)
  rim.rotateZ(Math.PI / 2)
  for (const [x, z] of [[-0.82, -1.28], [0.82, -1.28], [-0.82, 1.26], [0.82, 1.26]]) {
    const w = new THREE.Group()
    w.add(new THREE.Mesh(tyre, mats.tyre))
    w.add(new THREE.Mesh(rim, mats.rim))
    w.position.set(x, 0.33, z)
    car.add(w)
  }

  // Cabin: carpet, door cards, dashboard, console, the wheel.
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.75), mats.floor)
  floor.position.set(0, FLOOR_Y, 0.25)
  floor.receiveShadow = true
  car.add(floor)
  for (const side of [-1, 1]) {
    const door = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.5, 1.66, 3, 0.02), mats.cabin)
    door.position.set(side * 0.71, 0.66, 0.24)
    door.receiveShadow = true
    car.add(door)
    const rest = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.05, 0.5, 3, 0.02), mats.leatherDark)
    rest.position.set(side * 0.67, 0.78, -0.05)
    car.add(rest)
  }
  const back = new THREE.Mesh(new RoundedBoxGeometry(1.44, 0.48, 0.06, 3, 0.02), mats.cabin)
  back.position.set(0, 0.68, 1.1)
  car.add(back)

  const dash = new THREE.Mesh(new RoundedBoxGeometry(1.46, 0.24, 0.36, 4, 0.08), mats.cabin)
  dash.position.set(0, 0.86, -0.5)
  car.add(dash)
  const screen = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.15, 0.02, 2, 0.01), mats.screen)
  screen.position.set(0.02, 1.01, -0.36)
  screen.rotation.x = -0.35
  car.add(screen)
  const console_ = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.18, 0.62, 3, 0.05), mats.cabin)
  console_.position.set(0, 0.5, 0.02)
  car.add(console_)
  const lever = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), mats.rim)
  lever.position.set(0, 0.64, -0.08)
  car.add(lever)

  const wheel = new THREE.Group()
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 10, 36), mats.trim))
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), mats.trim)
  hub.rotation.x = Math.PI / 2
  wheel.add(hub)
  for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.025, 0.015), mats.trim)
    spoke.position.set(Math.cos(a) * 0.085, Math.sin(a) * 0.085, 0)
    spoke.rotation.z = a
    wheel.add(spoke)
  }
  wheel.position.set(DRIVER.x, 0.98, -0.34)
  wheel.rotation.x = -0.45
  car.add(wheel)

  return car
}

// ── Seats ───────────────────────────────────────────────────────────────────────────────────

function seatGeometry(w, front) {
  const parts = [
    at(new RoundedBoxGeometry(w, 0.13, 0.5, 4, 0.05), 0, CUSHION_Y - 0.065, 0),
    at(new RoundedBoxGeometry(w, 0.62, 0.13, 4, 0.05), 0, CUSHION_Y + 0.26, 0.25, -0.2),
    at(new RoundedBoxGeometry(w * 0.56, 0.16, 0.1, 4, 0.045), 0, CUSHION_Y + 0.66, 0.34, -0.2),
  ]
  if (front) {
    // Side bolsters on the cushion and backrest.
    for (const side of [-1, 1]) {
      parts.push(at(new RoundedBoxGeometry(0.07, 0.07, 0.46, 3, 0.03), side * (w / 2 - 0.035), CUSHION_Y + 0.02, 0))
      parts.push(at(new RoundedBoxGeometry(0.07, 0.5, 0.08, 3, 0.03), side * (w / 2 - 0.035), CUSHION_Y + 0.27, 0.2, -0.2))
    }
  }
  return merge(parts)
}

// ── Seated mannequins ─────────────────────────────────────────────────────────────────────────

/** A seated person on a cushion at y=0 (origin under the hips), facing -z. `female` changes the
 * build and hair; `driving` raises the arms to the wheel. Returns a group of three meshes. */
function personGroup(kind, mats) {
  const female = kind === 'FEMALE'
  const driving = kind === 'DRIVER'
  const k = female ? 0.95 : 1
  const shoulders = female ? 0.17 : 0.2
  const lean = -0.18 // matches the backrest

  // Torso: hips, waist, chest and shoulders as one turned profile, flattened front to back.
  const profile = (female
    ? [[0.001, 0], [0.15, 0], [0.16, 0.08], [0.13, 0.2], [0.15, 0.32], [0.165, 0.42], [0.15, 0.47], [0.08, 0.5], [0.001, 0.505]]
    : [[0.001, 0], [0.15, 0], [0.155, 0.08], [0.15, 0.2], [0.17, 0.32], [0.19, 0.42], [0.175, 0.47], [0.09, 0.5], [0.001, 0.505]]
  ).map(([r, y]) => new THREE.Vector2(r, y))
  const torso = [at(new THREE.LatheGeometry(profile, 24), 0, 0.06, 0.06, lean, 0, 0, 1, 1, 0.62)]

  // Clothes: thighs forward, shins down to the floor (trousers); arms in the top's colour.
  const legs = []
  for (const side of [-1, 1]) {
    legs.push(at(new THREE.CapsuleGeometry(0.068, 0.34, 4, 10), side * 0.095, 0.07, -0.18, Math.PI / 2))
    legs.push(at(new THREE.CapsuleGeometry(0.058, 0.3, 4, 10), side * 0.1, -0.13, -0.4, 0.12))
    legs.push(at(new THREE.CapsuleGeometry(0.05, 0.13, 4, 8), side * 0.1, -0.3, -0.45, Math.PI / 2, 0, 0, 1.05, 1, 0.75))
  }

  const arms = []
  for (const side of [-1, 1]) {
    const sx = side * shoulders
    if (driving) {
      // Upper arm forward and down, forearm up to the rim.
      arms.push(at(new THREE.CapsuleGeometry(0.048, 0.22, 4, 8), sx, 0.42, -0.04, 0.9, 0, side * -0.1))
      arms.push(at(new THREE.CapsuleGeometry(0.042, 0.2, 4, 8), sx * 0.75, 0.42, -0.24, 1.8, 0, side * 0.25))
    } else {
      // Upper arm down the side, forearm along the thigh.
      arms.push(at(new THREE.CapsuleGeometry(0.048, 0.22, 4, 8), sx, 0.36, 0.06, lean + 0.12))
      arms.push(at(new THREE.CapsuleGeometry(0.042, 0.2, 4, 8), sx * 0.85, 0.17, -0.1, 1.35))
    }
  }

  // Skin: neck, head, hands.
  const headY = 0.69
  const headZ = 0.0
  const skin = [
    at(new THREE.CylinderGeometry(0.045, 0.05, 0.09, 12), 0, 0.58, 0.02, lean),
    at(new THREE.SphereGeometry(0.095, 20, 16), 0, headY, headZ, 0, 0, 0, female ? 0.82 : 0.86, 1.08, 0.98),
    at(new THREE.SphereGeometry(0.018, 8, 6), 0, headY - 0.01, headZ - 0.095),
  ]
  for (const side of [-1, 1]) {
    skin.push(at(new THREE.SphereGeometry(0.02, 6, 4), side * (female ? 0.078 : 0.082), headY, headZ, 0, 0, 0, 0.45, 1, 0.75))
    const hand = driving ? [side * 0.15, 0.53, -0.33] : [side * shoulders * 0.8, 0.12, -0.24]
    skin.push(at(new THREE.SphereGeometry(0.042, 10, 8), ...hand, 0, 0, 0, 0.8, 0.6, 1.1))
  }

  // Hair: a short cap for men; for women a fuller cap, a fall down the back and a fringe.
  const hair = [
    at(new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, 0, Math.PI * (female ? 0.55 : 0.47)), 0, headY + 0.012, headZ + 0.008, -0.25, 0, 0, female ? 0.9 : 0.9, 1, 1.02),
  ]
  if (female) {
    hair.push(at(new THREE.CapsuleGeometry(0.085, 0.2, 4, 12), 0, headY - 0.12, headZ + 0.07, -0.12, 0, 0, 1.15, 1, 0.6))
    for (const side of [-1, 1]) {
      hair.push(at(new THREE.CapsuleGeometry(0.03, 0.15, 4, 8), side * 0.075, headY - 0.07, headZ + 0.0, 0, 0, side * 0.08))
    }
  }

  const top = female ? mats.female : driving ? mats.driverShirt : mats.male
  const group = new THREE.Group()
  const add = (parts, mat) => {
    const m = new THREE.Mesh(merge(parts), mat)
    m.castShadow = true
    group.add(m)
  }
  add([...torso, ...arms], top)
  add(legs, mats.trousers)
  add(skin, mats.skin)
  add(hair, female ? mats.hairFemale : mats.hairMale)
  group.scale.setScalar(k)
  return group
}

// ── Scene ─────────────────────────────────────────────────────────────────────────────────────

const easeOutBack = (t) => {
  const c = 1.5
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
}
const easeOut = (t) => 1 - (1 - t) ** 3

const GLOW_ACTIVE = new THREE.Color('#00c7d4')
const GLOW_HOVER = new THREE.Color('#ffffff')
const DEFAULT_YAW = 0.42
const DEFAULT_PITCH = 0.66 // radians from the vertical
const TARGET = new THREE.Vector3(0, 0.6, 0.0)

export class SeatScene {
  constructor(host, { onSeat, reducedMotion = false }) {
    this.host = host
    this.onSeat = onSeat
    this.reducedMotion = reducedMotion
    this.seats = []
    this.active = null
    this.hover = null

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.95
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.touchAction = 'none'
    host.appendChild(renderer.domElement)
    this.renderer = renderer

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.75
    pmrem.dispose()
    this.scene = scene

    scene.add(new THREE.HemisphereLight('#ffffff', '#6b7686', 0.45))
    const key = new THREE.DirectionalLight('#fff7ee', 2.1)
    key.position.set(-2.6, 6, 1.8)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -1.2
    key.shadow.camera.right = 1.2
    key.shadow.camera.top = 1.6
    key.shadow.camera.bottom = -1.2
    key.shadow.camera.near = 2
    key.shadow.camera.far = 10
    key.shadow.bias = -0.0008
    key.shadow.radius = 4
    key.target.position.set(0, 0.5, 0.3)
    scene.add(key, key.target)

    const m = (o) => new THREE.MeshPhysicalMaterial(o)
    this.mats = {
      paint: m({ color: COLORS.paint, roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 }),
      stripe: m({ color: COLORS.stripe, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 }),
      trim: new THREE.MeshStandardMaterial({ color: COLORS.trim, roughness: 0.6 }),
      cabin: new THREE.MeshStandardMaterial({ color: COLORS.cabin, roughness: 0.8 }),
      floor: new THREE.MeshStandardMaterial({ color: COLORS.floor, roughness: 0.95 }),
      leatherDark: new THREE.MeshStandardMaterial({ color: '#4a5260', roughness: 0.6 }),
      glass: m({ color: '#24394d', roughness: 0.04, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.42, depthWrite: false }),
      headlight: m({ color: '#ffffff', emissive: '#e8f6ff', emissiveIntensity: 0.9, roughness: 0.1, clearcoat: 1 }),
      taillight: m({ color: '#b3122f', emissive: '#e11d48', emissiveIntensity: 0.7, roughness: 0.2, clearcoat: 1 }),
      screen: new THREE.MeshStandardMaterial({ color: '#0f1720', emissive: '#00a3ae', emissiveIntensity: 0.35, roughness: 0.2 }),
      tyre: new THREE.MeshStandardMaterial({ color: '#16191d', roughness: 0.9 }),
      rim: new THREE.MeshStandardMaterial({ color: '#c7ccd3', roughness: 0.25, metalness: 0.9 }),
      driverSeat: m({ color: COLORS.driverSeat, roughness: 0.55, sheen: 0.4, sheenColor: '#ffffff' }),
      skin: new THREE.MeshStandardMaterial({ color: COLORS.skin, roughness: 0.65 }),
      hairMale: new THREE.MeshStandardMaterial({ color: COLORS.hairMale, roughness: 0.7 }),
      hairFemale: new THREE.MeshStandardMaterial({ color: COLORS.hairFemale, roughness: 0.6 }),
      trousers: new THREE.MeshStandardMaterial({ color: COLORS.trousers, roughness: 0.85 }),
      male: new THREE.MeshStandardMaterial({ color: COLORS.male, roughness: 0.7 }),
      female: new THREE.MeshStandardMaterial({ color: COLORS.female, roughness: 0.7 }),
      driverShirt: new THREE.MeshStandardMaterial({ color: COLORS.driverShirt, roughness: 0.8 }),
    }

    // Soft contact shadow under the car.
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 5.0),
      new THREE.MeshBasicMaterial({ map: radialTexture('rgba(15,23,32,0.42)', 'rgba(15,23,32,0)'), transparent: true, depthWrite: false }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.002
    scene.add(shadow)

    this.car = buildCar(this.mats)
    scene.add(this.car)

    // Driver: seat and mannequin, not pickable.
    const driverSeat = new THREE.Mesh(seatGeometry(DRIVER.w, true), this.mats.driverSeat)
    driverSeat.position.set(DRIVER.x, 0, DRIVER.z)
    driverSeat.castShadow = driverSeat.receiveShadow = true
    scene.add(driverSeat)
    const driver = personGroup('DRIVER', this.mats)
    driver.position.set(DRIVER.x, CUSHION_Y, DRIVER.z + 0.04)
    scene.add(driver)

    // Passenger seats: each with its own leather material (tinted when taken) and a ring that
    // marks the seat being edited.
    this.slots = {}
    this.pickables = []
    const ringGeometry = new THREE.TorusGeometry(0.31, 0.02, 8, 48)
    ringGeometry.rotateX(Math.PI / 2)
    for (const [position, spec] of Object.entries(SEATS)) {
      const material = m({ color: COLORS.leather, roughness: 0.5, sheen: 0.5, sheenColor: '#ffffff', emissive: '#000000' })
      const seat = new THREE.Mesh(seatGeometry(spec.w, spec.front), material)
      seat.position.set(spec.x, 0, spec.z)
      seat.castShadow = seat.receiveShadow = true
      seat.userData.position = position
      scene.add(seat)
      this.pickables.push(seat)

      const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: '#00c7d4', transparent: true, opacity: 0 }))
      ring.position.set(spec.x, CUSHION_Y + 0.015, spec.z)
      ring.scale.set(spec.w / 0.6, 1, 0.95)
      ring.visible = false
      scene.add(ring)

      this.slots[position] = {
        spec,
        seat,
        material,
        ring,
        tint: new THREE.Color(COLORS.leather),
        person: null,
        gender: null,
        anim: null,
      }
    }

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60)
    this.yaw = this.reducedMotion ? DEFAULT_YAW : DEFAULT_YAW + 0.9
    this.pitch = DEFAULT_PITCH
    this.yawGoal = DEFAULT_YAW
    this.pitchGoal = DEFAULT_PITCH
    this.distance = 7
    this.lastInteraction = 0

    this.glowTarget = new THREE.Color()
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.drag = null
    this.bind()

    this.resize()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(host)

    this.clock = new THREE.Clock()
    this.running = true
    this.onVisibility = () => {
      if (document.hidden) this.running = false
      else if (!this.running) {
        this.running = true
        this.clock.getDelta()
        this.loop()
      }
    }
    document.addEventListener('visibilitychange', this.onVisibility)
    this.loop()
  }

  // ── input ──
  bind() {
    const el = this.renderer.domElement
    this.handlers = {
      pointerdown: (e) => {
        el.setPointerCapture?.(e.pointerId)
        this.drag = { x: e.clientX, y: e.clientY, yaw: this.yawGoal, pitch: this.pitchGoal, moved: false }
      },
      pointermove: (e) => {
        if (this.drag) {
          const dx = e.clientX - this.drag.x
          const dy = e.clientY - this.drag.y
          if (Math.abs(dx) + Math.abs(dy) > 6) this.drag.moved = true
          if (this.drag.moved) {
            this.yawGoal = THREE.MathUtils.clamp(this.drag.yaw - dx * 0.008, -1.25, 1.25)
            this.pitchGoal = THREE.MathUtils.clamp(this.drag.pitch - dy * 0.006, 0.45, 1.2)
            this.lastInteraction = performance.now()
            this.host.dataset.dragged = '1'
          }
          return
        }
        if (e.pointerType === 'mouse') this.setHover(this.pick(e))
      },
      pointerup: (e) => {
        const drag = this.drag
        this.drag = null
        if (drag && !drag.moved) {
          const position = this.pick(e)
          if (position) this.onSeat(position)
        }
      },
      pointerleave: () => this.setHover(null),
      pointercancel: () => {
        this.drag = null
      },
    }
    for (const [name, fn] of Object.entries(this.handlers)) el.addEventListener(name, fn)
  }

  pick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const targets = [...this.pickables]
    for (const slot of Object.values(this.slots)) if (slot.person) targets.push(slot.person)
    const hit = this.raycaster.intersectObjects(targets, true)[0]
    if (!hit) return null
    let o = hit.object
    while (o && !o.userData.position) o = o.parent
    return o?.userData.position ?? null
  }

  setHover(position) {
    if (position === this.hover) return
    this.hover = position
    this.renderer.domElement.style.cursor = position ? 'pointer' : 'grab'
  }

  // ── state from React ──
  /** `seats`: [{ position, gender }], `active`: the seat being edited (or null). */
  update(seats, active) {
    this.active = active
    for (const [position, slot] of Object.entries(this.slots)) {
      const gender = seats.find((s) => s.position === position)?.gender ?? null
      if (gender === slot.gender) continue
      slot.gender = gender
      slot.tint.set(gender ? new THREE.Color(COLORS.leather).lerp(new THREE.Color(COLORS[gender === 'FEMALE' ? 'female' : 'male']), 0.42) : COLORS.leather)
      const old = slot.person
      if (old) this.retire(old)
      slot.person = null
      if (gender) {
        const person = personGroup(gender, this.mats)
        person.userData.position = position
        person.position.set(slot.spec.x, CUSHION_Y, slot.spec.z + 0.04)
        person.userData.baseScale = person.scale.x
        person.userData.born = performance.now() + (old ? 140 : 0)
        person.scale.setScalar(0.0001)
        this.scene.add(person)
        slot.person = person
      }
    }
  }

  retire(person) {
    person.userData.dying = performance.now()
    person.userData.position = null // not pickable any more
    ;(this.dying ??= []).push(person)
  }

  /** Page coordinates of a seat's cushion — used by tests to tap it like a person would. */
  seatPoint(position) {
    const spec = SEATS[position]
    const v = new THREE.Vector3(spec.x, CUSHION_Y + 0.1, spec.z).project(this.camera)
    const rect = this.renderer.domElement.getBoundingClientRect()
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height }
  }

  // ── frame ──
  resize() {
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    // Fit the car's length in portrait, its width in landscape.
    const fitH = 4.6 / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)))
    const fitW = 3.0 / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect)
    this.distance = Math.max(fitH * 1.02, fitW)
    this.camera.updateProjectionMatrix()
  }

  loop = () => {
    if (!this.running) return
    this.frame = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const now = performance.now()

    // Drift back to the default view a while after the last drag.
    if (!this.drag && now - this.lastInteraction > 3500) {
      this.yawGoal = DEFAULT_YAW
      this.pitchGoal = DEFAULT_PITCH
    }
    const ease = 1 - Math.exp(-dt * (this.drag ? 14 : 3.2))
    this.yaw += (this.yawGoal - this.yaw) * ease
    this.pitch += (this.pitchGoal - this.pitch) * ease
    const r = this.distance
    this.camera.position.set(
      TARGET.x + r * Math.sin(this.pitch) * Math.sin(this.yaw),
      TARGET.y + r * Math.cos(this.pitch),
      TARGET.z + r * Math.sin(this.pitch) * Math.cos(this.yaw),
    )
    this.camera.lookAt(TARGET)

    const t = now / 1000
    for (const [position, slot] of Object.entries(this.slots)) {
      // Seat colour eases towards its tint; hover lifts it a touch.
      slot.material.color.lerp(slot.tint, 1 - Math.exp(-dt * 10))
      // Edited seat glows in the brand colour (breathing); hover lifts any seat a touch.
      const on = this.active === position
      const glow = on ? 0.16 + Math.sin(t * 4) * 0.07 : this.hover === position ? 0.07 : 0
      this.glowTarget.copy(on ? GLOW_ACTIVE : GLOW_HOVER).multiplyScalar(glow)
      slot.material.emissive.lerp(this.glowTarget, 1 - Math.exp(-dt * 12))

      // …and a ring around it.
      const ringMat = slot.ring.material
      ringMat.opacity += ((on ? 0.55 + Math.sin(t * 4) * 0.25 : 0) - ringMat.opacity) * (1 - Math.exp(-dt * 10))
      slot.ring.visible = ringMat.opacity > 0.01
      const s = on ? 1 + Math.sin(t * 4) * 0.03 : 1
      slot.ring.scale.set((slot.spec.w / 0.6) * s, 1, 0.95 * s)

      // New passenger: drops into the seat with a little bounce.
      const p = slot.person
      if (p && p.userData.born) {
        const k = this.reducedMotion ? 1 : THREE.MathUtils.clamp((now - p.userData.born) / 520, 0, 1)
        const scale = p.userData.baseScale * (k > 0 ? easeOutBack(k) : 0.0001)
        p.scale.setScalar(Math.max(scale, 0.0001))
        p.position.y = CUSHION_Y + (1 - easeOut(k)) * 0.35
        if (k >= 1) p.userData.born = 0
      }
    }

    if (this.dying?.length) {
      this.dying = this.dying.filter((p) => {
        const k = this.reducedMotion ? 1 : THREE.MathUtils.clamp((now - p.userData.dying) / 220, 0, 1)
        p.scale.setScalar(Math.max(p.userData.baseScale * (1 - easeOut(k)), 0.0001))
        p.position.y = CUSHION_Y + easeOut(k) * 0.2
        if (k < 1) return true
        this.scene.remove(p)
        p.traverse((o) => o.geometry?.dispose())
        return false
      })
    }

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.running = false
    cancelAnimationFrame(this.frame)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.ro?.disconnect()
    const el = this.renderer.domElement
    for (const [name, fn] of Object.entries(this.handlers ?? {})) el.removeEventListener(name, fn)
    this.scene.traverse((o) => {
      o.geometry?.dispose()
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      for (const mat of mats) {
        mat.map?.dispose()
        mat.dispose()
      }
    })
    this.scene.environment?.dispose()
    this.renderer.dispose()
    el.remove()
  }
}
