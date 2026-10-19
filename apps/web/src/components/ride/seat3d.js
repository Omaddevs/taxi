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

/** A side silhouette (shape x = world z, y = up) extruded across the car, `half` each side of x=0. */
function sideSlab(shape, half, bevel) {
  const depth = Math.max(half * 2 - bevel * 2, 0.001)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 28,
  })
  g.rotateY(-Math.PI / 2) // extrusion → world -x
  g.translate(depth / 2, 0, 0)
  g.computeVertexNormals()
  return g
}

/** Pulls a clip's corners in towards the centre line past `from` (towards `to`) — the rounded
 * nose and tail seen from above. */
function roundPlan(g, from, to, amount) {
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.smoothstep(pos.getZ(i), Math.min(from, to), Math.max(from, to))
    const k = from < to ? t : 1 - t
    pos.setX(i, pos.getX(i) * (1 - amount * k * k))
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  return g
}

/** The Chevrolet bowtie: a wide bar crossed by a short upright one, slanted. */
function bowtie(material, x, y, z, ry = 0) {
  const g = new THREE.Group()
  const bar = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.036, 0.016, 2, 0.008), material)
  bar.rotation.z = -0.12
  const post = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.075, 0.016, 2, 0.008), material)
  post.rotation.z = -0.12
  g.add(bar, post)
  g.position.set(x, y, z)
  g.rotation.y = ry
  return g
}

function buildCar(mats) {
  const car = new THREE.Group()

  // Chevrolet Cobalt, roof off. The body is built from its side silhouette: a front clip (bumper,
  // grille, sloping hood), a rear clip (high trunk, bumper) and the two door panels between them,
  // each extruded across the car; the clips are then rounded off in plan view at the corners.
  const WHEEL_R = 0.33
  const ARCH_R = 0.41
  const FRONT_AXLE = -1.3
  const REAR_AXLE = 1.3

  const front = new THREE.Shape()
  front.moveTo(-0.62, 1.0)
  front.quadraticCurveTo(-1.5, 0.98, -2.06, 0.86) // hood, sloping down to the nose
  front.quadraticCurveTo(-2.24, 0.82, -2.26, 0.66) // hood edge into the grille
  front.quadraticCurveTo(-2.3, 0.42, -2.22, 0.24) // bumper face
  front.lineTo(FRONT_AXLE - ARCH_R, 0.22)
  front.lineTo(FRONT_AXLE - ARCH_R, WHEEL_R)
  front.absarc(FRONT_AXLE, WHEEL_R, ARCH_R, Math.PI, 0, true)
  front.lineTo(FRONT_AXLE + ARCH_R, 0.22)
  front.lineTo(-0.62, 0.22)
  front.closePath()

  const rearStart = 1.2
  const archTop = Math.acos((rearStart - REAR_AXLE) / ARCH_R) // where the rear arch meets the doors
  const rear = new THREE.Shape()
  rear.moveTo(rearStart, 1.0)
  rear.quadraticCurveTo(1.6, 1.03, 2.02, 1.0) // high trunk deck
  rear.quadraticCurveTo(2.22, 1.02, 2.25, 0.86) // rear edge
  rear.quadraticCurveTo(2.29, 0.5, 2.2, 0.24) // bumper face
  rear.lineTo(REAR_AXLE + ARCH_R, 0.22)
  rear.lineTo(REAR_AXLE + ARCH_R, WHEEL_R)
  rear.absarc(REAR_AXLE, WHEEL_R, ARCH_R, 0, archTop, false)
  rear.closePath()

  const door = new THREE.Shape()
  door.moveTo(-0.62, 0.97)
  door.quadraticCurveTo(0.3, 0.97, rearStart, 1.0) // beltline rising to the rear
  door.lineTo(rearStart, WHEEL_R + Math.sin(archTop) * ARCH_R)
  door.absarc(REAR_AXLE, WHEEL_R, ARCH_R, archTop, Math.PI, false)
  door.lineTo(REAR_AXLE - ARCH_R, 0.22)
  door.lineTo(-0.62, 0.22)
  door.closePath()

  const frontClip = new THREE.Mesh(roundPlan(sideSlab(front, 0.86, 0.08), -1.6, -2.3, 0.14), mats.paint)
  const rearClip = new THREE.Mesh(roundPlan(sideSlab(rear, 0.86, 0.08), 1.75, 2.3, 0.09), mats.paint)
  car.add(frontClip, rearClip)
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(sideSlab(door, 0.05, 0.035), mats.paint)
    panel.position.x = side * 0.825
    car.add(panel)
  }

  // Two creases running down the hood.
  for (const x of [-0.3, 0.3]) {
    const crease = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.02, 1.3, 2, 0.008), mats.paint)
    crease.position.set(x, 0.985, -1.32)
    crease.rotation.x = -0.075
    car.add(crease)
  }

  // Wheel wells: dark liners inside the arches.
  const well = new THREE.CylinderGeometry(ARCH_R - 0.01, ARCH_R - 0.01, 1.6, 28, 1, true, 0, Math.PI)
  well.rotateZ(Math.PI / 2)
  for (const z of [FRONT_AXLE, REAR_AXLE]) {
    const liner = new THREE.Mesh(well, mats.well)
    liner.position.set(0, WHEEL_R, z)
    car.add(liner)
  }

  // Sills and the lower bumpers in black.
  for (const side of [-1, 1]) {
    const sill = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.09, 1.66, 3, 0.03), mats.trim)
    sill.position.set(side * 0.84, 0.25, -0.02)
    car.add(sill)
  }

  // Body line, door seams, handles and the TaxiLine stripe along each side.
  for (const side of [-1, 1]) {
    const x = side * 0.878
    const crease = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.018, 3.9), mats.paint)
    crease.position.set(x, 0.82, 0)
    car.add(crease)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 3.4), mats.stripe)
    stripe.position.set(x + side * 0.002, 0.6, 0.05)
    car.add(stripe)
    for (const z of [-0.62, 0.36, 1.08]) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.62, 0.008), mats.seam)
      seam.position.set(x + side * 0.003, 0.66, z)
      car.add(seam)
    }
    for (const z of [-0.12, 0.84]) {
      const handle = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.035, 0.16, 2, 0.012), mats.chrome)
      handle.position.set(x + side * 0.01, 0.9, z)
      car.add(handle)
    }
  }

  // Windshield: a tinted pane leaning back, black A-pillars and header.
  const glass = new THREE.Mesh(new RoundedBoxGeometry(1.44, 0.016, 0.62, 2, 0.006), mats.glass)
  glass.position.set(0, 1.18, -0.6)
  glass.rotation.x = -0.82
  car.add(glass)
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.06, 0.66, 2, 0.025), mats.trim)
    pillar.position.set(side * 0.74, 1.18, -0.6)
    pillar.rotation.x = -0.82
    car.add(pillar)
  }
  const header = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.06, 0.08, 2, 0.025), mats.trim)
  header.position.set(0, 1.42, -0.37)
  car.add(header)

  // Door mirrors: black base, body-colour cap.
  for (const side of [-1, 1]) {
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.07, 0.12, 2, 0.02), mats.trim)
    base.position.set(side * 0.9, 1.03, -0.5)
    const cap = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.13, 0.1, 3, 0.04), mats.paint)
    cap.position.set(side * 1.0, 1.06, -0.5)
    car.add(base, cap)
  }

  // Nose: swept headlights, chrome-barred upper grille with the gold bowtie, a wide lower
  // grille and round fog lamps.
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.13, 0.3, 4, 0.05), mats.headlight)
    lamp.position.set(side * 0.56, 0.76, -2.25)
    lamp.rotation.set(0.16, side * 0.42, 0)
    car.add(lamp)
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10), mats.chrome)
    inner.position.set(side * 0.6, 0.77, -2.38)
    car.add(inner)
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 18), mats.headlight)
    fog.rotation.x = Math.PI / 2
    fog.position.set(side * 0.6, 0.42, -2.37)
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 20), mats.chrome)
    bezel.position.set(side * 0.6, 0.42, -2.385)
    car.add(fog, bezel)
  }
  const upper = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.1, 0.06, 3, 0.03), mats.grille)
  upper.position.set(0, 0.71, -2.37)
  const chromeBar = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.028, 0.05, 2, 0.012), mats.chrome)
  chromeBar.position.set(0, 0.775, -2.38)
  const lower = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.2, 0.06, 3, 0.05), mats.grille)
  lower.position.set(0, 0.49, -2.39)
  car.add(upper, chromeBar, lower)
  for (const y of [0.46, 0.54]) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.012, 0.02), mats.chrome)
    slat.position.set(0, y, -2.42)
    car.add(slat)
  }
  car.add(bowtie(mats.gold, 0, 0.745, -2.41))

  // Tail: wraparound lamps, chrome trunk strip with the bowtie, plate and the rear bumper.
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.15, 0.2, 4, 0.05), mats.taillight)
    lamp.position.set(side * 0.58, 0.9, 2.28)
    lamp.rotation.y = -side * 0.38
    car.add(lamp)
  }
  const strip = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.035, 0.03, 2, 0.012), mats.chrome)
  strip.position.set(0, 0.86, 2.36)
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.12, 0.02, 2, 0.01), mats.plate)
  plate.position.set(0, 0.64, 2.37)
  const rearLower = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.1, 0.06, 3, 0.03), mats.trim)
  rearLower.position.set(0, 0.3, 2.33)
  car.add(strip, plate, rearLower, bowtie(mats.gold, 0, 0.92, 2.37, Math.PI))

  // Wheels: tyre, silver five-spoke alloy, hub cap.
  const tyre = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.22, 36)
  tyre.rotateZ(Math.PI / 2)
  const rim = new THREE.CylinderGeometry(0.2, 0.2, 0.225, 30)
  rim.rotateZ(Math.PI / 2)
  for (const [x, z] of [[-0.8, FRONT_AXLE], [0.8, FRONT_AXLE], [-0.8, REAR_AXLE], [0.8, REAR_AXLE]]) {
    const side = Math.sign(x)
    const w = new THREE.Group()
    w.add(new THREE.Mesh(tyre, mats.tyre))
    w.add(new THREE.Mesh(rim, mats.rimDark))
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const spoke = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.17, 0.05, 2, 0.012), mats.rim)
      spoke.position.set(side * 0.115, Math.cos(a) * 0.1, Math.sin(a) * 0.1)
      spoke.rotation.x = a
      w.add(spoke)
    }
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 8, 30), mats.rim)
    lip.rotation.y = Math.PI / 2
    lip.position.x = side * 0.115
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), mats.rim)
    hub.rotation.z = Math.PI / 2
    hub.position.x = side * 0.12
    w.add(lip, hub)
    w.position.set(x, WHEEL_R, z)
    car.add(w)
  }

  // Cabin: carpet, door cards, dashboard, console, the wheel.
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.75), mats.floor)
  floor.position.set(0, FLOOR_Y, 0.25)
  floor.receiveShadow = true
  car.add(floor)
  for (const side of [-1, 1]) {
    const doorCard = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.5, 1.66, 3, 0.02), mats.cabin)
    doorCard.position.set(side * 0.76, 0.68, 0.24)
    doorCard.receiveShadow = true
    car.add(doorCard)
    const rest = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.05, 0.5, 3, 0.02), mats.leatherDark)
    rest.position.set(side * 0.72, 0.8, -0.05)
    car.add(rest)
  }
  const back = new THREE.Mesh(new RoundedBoxGeometry(1.44, 0.48, 0.06, 3, 0.02), mats.cabin)
  back.position.set(0, 0.66, 1.16)
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
  constructor(host, { onSeat, onIcons, reducedMotion = false }) {
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
    renderer.domElement.style.touchAction = 'pan-y'
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
      headlight: m({ color: '#c9d3de', metalness: 0.55, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, emissive: '#eaf6ff', emissiveIntensity: 0.25 }),
      taillight: m({ color: '#b3122f', emissive: '#e11d48', emissiveIntensity: 0.7, roughness: 0.2, clearcoat: 1 }),
      screen: new THREE.MeshStandardMaterial({ color: '#0f1720', emissive: '#00a3ae', emissiveIntensity: 0.35, roughness: 0.2 }),
      tyre: new THREE.MeshStandardMaterial({ color: '#16191d', roughness: 0.9 }),
      chrome: new THREE.MeshStandardMaterial({ color: '#e6e9ee', roughness: 0.15, metalness: 1 }),
      gold: new THREE.MeshStandardMaterial({ color: '#d6a73a', roughness: 0.25, metalness: 1 }),
      grille: new THREE.MeshStandardMaterial({ color: '#121519', roughness: 0.45 }),
      well: new THREE.MeshStandardMaterial({ color: '#0e1013', roughness: 0.95, side: THREE.DoubleSide }),
      seam: new THREE.MeshBasicMaterial({ color: '#b9c0c9' }),
      plate: new THREE.MeshStandardMaterial({ color: '#f4f5f7', roughness: 0.5 }),
      rimDark: new THREE.MeshStandardMaterial({ color: '#30343a', roughness: 0.5, metalness: 0.6 }),
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
      new THREE.PlaneGeometry(3.0, 5.4),
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
    this.yaw = this.reducedMotion ? DEFAULT_YAW : DEFAULT_YAW + 2.5
    this.pitch = DEFAULT_PITCH
    this.yawGoal = this.yaw
    this.pitchGoal = DEFAULT_PITCH
    this.distance = 7
    // Hold the opening view (the Cobalt's face) for a moment, then swing round to the seats.
    this.lastInteraction = performance.now() - (this.reducedMotion ? 3500 : 2600)

    this.glowTarget = new THREE.Color()
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.drag = null
    this.bind()

    this.resize()
    if (onIcons) {
      try {
        onIcons(this.renderIcons())
      } catch {
        /* the legend falls back to flat icons */
      }
    }
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
            this.yawGoal = THREE.MathUtils.clamp(this.drag.yaw - dx * 0.008, -2.9, 2.9)
            // On touch screens vertical swipes scroll the sheet, so only a mouse tilts the view.
            if (e.pointerType === 'mouse') this.pitchGoal = THREE.MathUtils.clamp(this.drag.pitch - dy * 0.006, 0.45, 1.2)
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

  /** Legend icons: an empty seat, a man and a woman on their tinted seats, rendered with the same
   * materials and lights as the car — drawn into a corner of this canvas before the first frame
   * and copied out as PNG data URLs. */
  renderIcons(size = 112) {
    const pr = this.renderer.getPixelRatio()
    const { width, height } = this.renderer.domElement
    const px = Math.round(size * pr)
    if (width < px * 3 || height < px) return null

    const scene = new THREE.Scene()
    scene.environment = this.scene.environment
    scene.environmentIntensity = 0.9
    scene.add(new THREE.HemisphereLight('#ffffff', '#6b7686', 0.6))
    const light = new THREE.DirectionalLight('#fff7ee', 2.2)
    light.position.set(-1.5, 3, -2.5)
    scene.add(light)
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20)
    const target = new THREE.Vector3(0, 0.92, 0.06)
    camera.position.copy(target).add(new THREE.Vector3(0.62, 0.42, -1).normalize().multiplyScalar(2.35))
    camera.lookAt(target)

    const geometry = seatGeometry(0.5, true)
    const kinds = ['EMPTY', 'MALE', 'FEMALE']
    const made = []
    this.renderer.setScissorTest(true)
    this.renderer.setClearColor(0x000000, 0)
    kinds.forEach((kind, i) => {
      const tint = new THREE.Color(COLORS.leather)
      if (kind !== 'EMPTY') tint.lerp(new THREE.Color(COLORS[kind === 'FEMALE' ? 'female' : 'male']), 0.42)
      const material = new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.5, sheen: 0.5, sheenColor: '#ffffff' })
      const group = new THREE.Group()
      group.add(new THREE.Mesh(geometry, material))
      if (kind !== 'EMPTY') {
        const person = personGroup(kind, this.mats)
        person.position.set(0, CUSHION_Y, 0.04)
        group.add(person)
      }
      scene.add(group)
      made.push(group, material)
      this.renderer.setViewport(i * size, 0, size, size)
      this.renderer.setScissor(i * size, 0, size, size)
      this.renderer.clear()
      this.renderer.render(scene, camera)
      scene.remove(group)
    })
    this.renderer.setScissorTest(false)
    this.renderer.setViewport(0, 0, width / pr, height / pr)

    // Copy the three squares out before the browser clears the drawing buffer.
    const icons = {}
    kinds.forEach((kind, i) => {
      const c = document.createElement('canvas')
      c.width = c.height = px
      c.getContext('2d').drawImage(this.renderer.domElement, i * px, height - px, px, px, 0, 0, px, px)
      icons[kind] = c.toDataURL('image/png')
    })
    this.renderer.clear()

    geometry.dispose()
    for (const item of made) {
      if (item.isMaterial) item.dispose()
      else item.traverse((o) => o.isMesh && o.geometry !== geometry && o.geometry.dispose())
    }
    return icons
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
    const fitH = 5.2 / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)))
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
    // Browsers keep only ~16 live WebGL contexts; reopening the sheet must not run out of them.
    this.renderer.forceContextLoss()
    el.remove()
  }
}
