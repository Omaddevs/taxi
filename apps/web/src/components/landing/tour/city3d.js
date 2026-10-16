import * as THREE from 'three'
import { buildLandmark } from './landmarks3d'
import { BLOCK, GRID, LANE, PITCH, STREET, getRoute, rng } from './routeGen'
import { StreetLife } from './streetLife'
import { LEGS } from './uzTour'

/* The tour's street scene in three.js: a city grid in the soft "car display" look — pale blocks
   on raised sidewalks, lane markings and zebras, street trees, people walking, translucent blue
   traffic — and TaxiLine's van driving the leg's route (from routeGen) with a chase camera that
   follows it through the turns. The van is the set of rendered views; the one shown depends on
   its heading relative to the camera. At the end of the route: a stone square and the region's
   landmark (landmarks3d), which the camera turns to frame.

   World: x east, z south, y up, metres. Heading 0 = north (−z), clockwise. */

const SKY = new THREE.Color('#e7edf6')
const BLOCKS = GRID + 1 // blocks from -BLOCKS..BLOCKS-1 on each axis
const VIEW_HEIGHT = 1.85 // the van's height in metres, whichever view is shown
const VIEW_RATIO = { b: 0.942, bl: 0.583, br: 0.581, l: 0.453, r: 0.453, fl: 0.597, fr: 0.597, f: 0.875 }

const dirOf = (h) => [Math.sin(h), -Math.cos(h)]
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

function radialTexture(inner, outer) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64)
  grad.addColorStop(0, inner)
  grad.addColorStop(1, outer)
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function tileTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  g.fillStyle = '#ebe4d6'
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = 'rgba(170,155,130,0.45)'
  g.lineWidth = 3
  for (let i = 0; i <= 256; i += 64) {
    g.beginPath()
    g.moveTo(i, 0)
    g.lineTo(i, 256)
    g.moveTo(0, i)
    g.lineTo(256, i)
    g.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const ribbonMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uCar: { value: 0 } },
    vertexShader: `attribute float dist; varying float vDist; varying float vSide;
      attribute float side;
      void main() { vDist = dist; vSide = side; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uCar; varying float vDist; varying float vSide;
      void main() {
        float ahead = vDist - uCar;
        float a = smoothstep(-1.0, 4.0, ahead) * (1.0 - smoothstep(60.0, 170.0, ahead));
        float edge = 1.0 - smoothstep(0.75, 1.0, abs(vSide));
        vec3 c = mix(vec3(0.18, 0.48, 1.0), vec3(0.0, 0.78, 0.83), clamp(ahead / 140.0, 0.0, 1.0));
        gl_FragColor = vec4(c, a * 0.82 * edge);
      }`,
  })

export class TourDrive {
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    // Shader compile logs are read back synchronously — a stall worth paying only in development.
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.background = SKY
    this.scene.fog = new THREE.Fog(SKY, 140, 560)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.5, 1400)

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xcbd6e6, 1.7))
    this.sun = new THREE.DirectionalLight(0xffffff, 1.55)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    Object.assign(this.sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 400 })
    this.sun.shadow.bias = -0.0005
    this.sun.shadow.normalBias = 0.6
    this.scene.add(this.sun, this.sun.target)

    this.mats = {
      road: new THREE.MeshStandardMaterial({ color: '#c9d2df', roughness: 0.95 }),
      walk: new THREE.MeshStandardMaterial({ color: '#eef2f7', roughness: 0.95 }),
      building: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, emissive: '#dfe7f3', emissiveIntensity: 0.18 }),
      mark: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      trunk: new THREE.MeshStandardMaterial({ color: '#9b8466', roughness: 1 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#8fd16b', roughness: 0.8, flatShading: true }),
      person: new THREE.MeshStandardMaterial({ color: '#5b8def', roughness: 0.6, transparent: true, opacity: 0.85 }),
      walker: new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.6 }),
      zebra: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }),
      traffic: new THREE.MeshStandardMaterial({ color: '#7fa6ea', roughness: 0.35, transparent: true, opacity: 0.62 }),
      trafficTop: new THREE.MeshStandardMaterial({ color: '#5b7fc4', roughness: 0.3, transparent: true, opacity: 0.62 }),
      plaza: new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.9 }),
    }

    // Ground: the whole floor is road; blocks sit on it as raised sidewalks.
    const span = (BLOCKS * 2 + 4) * PITCH
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(span, span), this.mats.road)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    this.buildStatic()
    this.buildVan()
    this.views = {}
    const loader = new THREE.TextureLoader()
    for (const key of Object.keys(VIEW_RATIO)) {
      const tex = loader.load(`/landing/minivan/${key}.webp`)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 4
      this.views[key] = tex
    }
    this.van.material.map = this.views.b

    this.legKey = -1
    this.cam = { yaw: 0, pos: new THREE.Vector3(), look: new THREE.Vector3() }
    this.lastNow = 0
    // Adaptive resolution: a device that keeps missing frames gets fewer pixels, never a stutter.
    this.pace = { ratio: this.renderer.getPixelRatio(), frames: 0, slow: 0 }
  }

  /* ── The city ──────────────────────────────────────────────────────────────────────────── */

  buildStatic() {
    const blockCount = (BLOCKS * 2) ** 2
    const box = new THREE.BoxGeometry(1, 1, 1)
    box.translate(0, 0.5, 0)
    this.slabs = new THREE.InstancedMesh(box, this.mats.walk, blockCount)
    this.slabs.receiveShadow = true
    this.buildings = new THREE.InstancedMesh(box, this.mats.building, blockCount * 5)
    this.buildings.castShadow = this.buildings.receiveShadow = true
    this.trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 2.6, 6).translate(0, 1.3, 0), this.mats.trunk, blockCount * 12)
    this.leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.7, 1).translate(0, 3.9, 0), this.mats.leaf, blockCount * 12)
    this.leaves.castShadow = true
    // Culled by cullTrees, slot by slot; the colour buffer exists from the start (one shader).
    this.trunks.frustumCulled = this.leaves.frustumCulled = false
    this.leaves.setColorAt(0, new THREE.Color('#8fd16b'))

    // Lane markings and zebras (flat quads just above the road).
    const quad = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    const lines = []
    const zebras = []
    for (let j = -GRID; j <= GRID; j++) {
      for (let i = -GRID; i < GRID; i++) {
        // A street segment between intersections (i, j) and (i+1, j), and its vertical twin.
        for (const horizontal of [true, false]) {
          const a = i * PITCH + STREET / 2
          const b = (i + 1) * PITCH - STREET / 2
          const c = j * PITCH
          const seg = (along, across, len, w) => (horizontal ? [along, across, len, w] : [across, along, w, len])
          lines.push(seg((a + b) / 2, c - 0.14, b - a, 0.12), seg((a + b) / 2, c + 0.14, b - a, 0.12))
          for (let p = a + 2; p < b - 3; p += 9) for (const o of [-LANE, LANE]) lines.push(seg(p + 1.5, c + o, 3, 0.14))
          for (const end of [a + 2.2, b - 2.2]) for (let o = -STREET / 2 + 1; o < STREET / 2 - 0.6; o += 1.2) zebras.push(seg(end, o + 0.3, 3.2, 0.6))
        }
      }
    }
    const place = (list, mat) => {
      const mesh = new THREE.InstancedMesh(quad, mat, list.length)
      const m4 = new THREE.Matrix4()
      list.forEach(([x, z, sx, sz], idx) => mesh.setMatrixAt(idx, m4.compose(new THREE.Vector3(x, 0.03, z), new THREE.Quaternion(), new THREE.Vector3(sx, 1, sz))))
      mesh.receiveShadow = true
      this.scene.add(mesh)
      return mesh
    }
    place(lines, this.mats.mark)
    place(zebras, this.mats.zebra)

    this.scene.add(this.slabs, this.buildings, this.trunks, this.leaves)
    this.life = new StreetLife(this.scene, this.mats)
  }

  /** Blocks, buildings and trees for this leg's city, clearing the square and the landmark's lot. */
  layoutCity(route, lm) {
    const r = rng(route.seed)
    const m4 = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0)
    const sq = route.square
    const lmHalfW = Math.max(sq.size / 2, lm.width / 2 + 14)
    // The lot to keep clear, in the square's frame (along = the route's final direction).
    const [dx, dz] = route.dir
    const clear = (x, z, pad = 0) => {
      const rx = x - sq.x
      const rz = z - sq.z
      const along = rx * dx + rz * dz
      const across = rx * -dz + rz * dx
      return Math.abs(along) < sq.size / 2 + pad && Math.abs(across) < lmHalfW + pad
    }
    // The last street into the square: kept free of trees so nothing stands between the van
    // (and the camera framing the landmark) and the building.
    const last = route.samples[route.samples.length - 1]
    const onApproach = (x, z) => {
      const rx = x - last.x
      const rz = z - last.z
      const along = rx * dx + rz * dz
      const across = rx * -dz + rz * dx
      return along > -PITCH * 1.1 && along < 4 && Math.abs(across) < STREET / 2 + 6
    }
    let b = 0
    let s = 0
    // Trees are kept as a list and drawn only where the camera looks (cullTrees).
    this.trees = []
    for (let bi = -BLOCKS; bi < BLOCKS; bi++) {
      for (let bj = -BLOCKS; bj < BLOCKS; bj++) {
        const cx = bi * PITCH + PITCH / 2
        const cz = bj * PITCH + PITCH / 2
        const cleared = clear(cx, cz, BLOCK / 2)
        this.slabs.setMatrixAt(s++, cleared ? hidden : m4.compose(new THREE.Vector3(cx, 0, cz), q, new THREE.Vector3(BLOCK, 0.22, BLOCK)))
        // 2–5 buildings per block, set back from the kerb.
        const n = 2 + Math.floor(r() * 4)
        for (let k = 0; k < 5; k++) {
          if (k >= n || cleared) {
            this.buildings.setMatrixAt(b, hidden)
          } else {
            const w = 14 + r() * 22
            const d = 14 + r() * 22
            const h = 8 + r() ** 1.6 * 46
            const x = cx + (r() - 0.5) * (BLOCK - w - 10)
            const z = cz + (r() - 0.5) * (BLOCK - d - 10)
            this.buildings.setMatrixAt(b, m4.compose(new THREE.Vector3(x, 0.22, z), q, new THREE.Vector3(w, h, d)))
            const tone = 0.9 + r() * 0.1
            this.buildings.setColorAt(b, new THREE.Color(tone * 0.93, tone * 0.96, tone))
          }
          b++
        }
        // Street trees along the kerbs.
        for (let k = 0; k < 12; k++) {
          const side = k % 4
          const along = (Math.floor(k / 4) + 0.5) / 3 - 0.5
          const edge = BLOCK / 2 - 2
          const x = cx + (side === 0 ? -edge : side === 1 ? edge : along * (BLOCK - 8))
          const z = cz + (side === 2 ? -edge : side === 3 ? edge : along * (BLOCK - 8))
          const sc = 0.8 + r() * 0.45
          const color = new THREE.Color().setHSL(0.27 + r() * 0.05, 0.5, 0.58 + r() * 0.08)
          if (clear(x, z, 6) || onApproach(x, z)) continue
          this.trees.push({ x, z, matrix: new THREE.Matrix4().compose(new THREE.Vector3(x, 0.22, z), q, new THREE.Vector3(sc, sc, sc)), color })
        }
      }
    }
    // The square and the last intersection before it stay clear of signals and traffic, so
    // nothing stands between the camera and the landmark when it frames it.
    const lastNode = route.nodes[route.nodes.length - 1].map((v) => v * PITCH)
    const nearLast = (x, z) => Math.abs(x - lastNode[0]) < STREET + 2 && Math.abs(z - lastNode[1]) < STREET + 2
    this.life.layout(route.seed, (x, z, pad = 0) => clear(x, z, pad) || nearLast(x, z), route.ctl)
    this.treeShown = null
    for (const mesh of [this.slabs, this.buildings]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }

  buildVan() {
    // Drawn last and without depth writes, so its transparent corners never cut the glow below.
    this.van = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, alphaTest: 0.04 }))
    this.van.center.set(0.5, 0.02)
    this.van.renderOrder = 10
    this.vanShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 4.6).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: radialTexture('rgba(20,35,60,0.45)', 'rgba(20,35,60,0)'), transparent: true, depthWrite: false }),
    )
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1.75, 2.05, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#2f7bff', transparent: true, opacity: 0.55, depthWrite: false }),
    )
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 5.2).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: radialTexture('rgba(47,123,255,0.4)', 'rgba(47,123,255,0)'), transparent: true, depthWrite: false }),
    )
    this.scene.add(this.glow, this.vanShadow, this.ring, this.van)
  }

  /* ── Per leg ───────────────────────────────────────────────────────────────────────────── */

  setLeg(index) {
    if (index === this.legKey) return
    this.legKey = index
    const route = getRoute(index)
    this.route = route

    // Ribbon along the route, with each vertex's distance for the shader.
    if (this.ribbon) {
      this.scene.remove(this.ribbon)
      this.ribbon.geometry.dispose()
    }
    const s = route.samples
    const pos = []
    const dist = []
    const side = []
    s.forEach((p) => {
      const [hx, hz] = dirOf(p.heading)
      const rx = -hz
      const rz = hx
      for (const sgn of [-1, 1]) {
        pos.push(p.x + rx * 0.95 * sgn, 0.07, p.z + rz * 0.95 * sgn)
        dist.push(p.d)
        side.push(sgn)
      }
    })
    const idx = []
    for (let i = 0; i < s.length - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('dist', new THREE.Float32BufferAttribute(dist, 1))
    geo.setAttribute('side', new THREE.Float32BufferAttribute(side, 1))
    geo.setIndex(idx)
    this.ribbon = new THREE.Mesh(geo, this.ribbonMat ?? (this.ribbonMat = ribbonMaterial()))
    this.ribbon.renderOrder = 2
    this.scene.add(this.ribbon)

    // The square and its landmark, facing back down the street the van comes in on.
    if (this.landmark) {
      this.scene.remove(this.landmark.group)
      this.landmark.group.traverse((o) => o.geometry?.dispose())
    }
    if (this.square) this.scene.remove(this.square)
    const to = LEGS[index].to
    const lm = buildLandmark(to)
    const [dx, dz] = route.dir
    const stop = route.end
    const front = { x: stop.x + dx * 36, z: stop.z + dz * 36 }
    lm.group.position.set(front.x, 0.22, front.z)
    lm.group.rotation.y = Math.atan2(-dx, -dz)
    this.landmark = { ...lm, front, dir: [dx, dz] }
    this.scene.add(lm.group)

    const sq = route.square
    const sqW = Math.max(sq.size, lm.width + 28)
    this.square = new THREE.Mesh(new THREE.BoxGeometry(dx ? sq.size : sqW, 0.24, dx ? sqW : sq.size), this.mats.plaza)
    this.square.material.map.repeat.set((dx ? sq.size : sqW) / 8, (dx ? sqW : sq.size) / 8)
    this.square.position.set(sq.x, 0.12, sq.z)
    this.square.receiveShadow = true
    this.scene.add(this.square)

    this.layoutCity(route, lm)
    this.cam.yaw = route.samples[0].heading
    this.freeze()
    this.prewarm()
  }

  /** Compile every shader and upload every texture of the scene now — while the map is still on
   * screen — instead of on the first frame that shows them, which would stall the zoom-in (or the
   * first crowd coming into view) for up to a second. */
  prewarm() {
    this.scene.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      for (const mat of mats) for (const key of ['map', 'emissiveMap', 'normalMap', 'alphaMap']) if (mat[key]?.isTexture) this.renderer.initTexture(mat[key])
    })
    this.camera.updateMatrixWorld()
    // (compile() takes every material in the scene, hidden objects' too.) three.js polls the
    // programs on a timer until they're ready, so dispose() waits for this to finish.
    const done = this.renderer.compileAsync(this.scene, this.camera).catch(() => {})
    this.compiling = Promise.all([this.compiling, done])
    return done
  }

  /** Only the van, its marks and the sun move: everything else keeps the matrix it has now, so
   * three.js doesn't recompute a few hundred static transforms every frame. */
  freeze() {
    const live = new Set([this.van, this.vanShadow, this.ring, this.glow, this.sun, this.sun.target])
    this.scene.traverse((o) => {
      if (o === this.scene || live.has(o) || !o.matrixAutoUpdate) return
      o.updateMatrix()
      o.matrixAutoUpdate = false
      o.matrixWorldNeedsUpdate = true
    })
  }

  /** The trees in view (crown and its shadow included), packed to the front of the instanced
   * meshes; rewritten only when that set changes. */
  cullTrees() {
    const shown = []
    this.trees.forEach((tree, n) => {
      if (this.life.sees(tree.x, 3.5, tree.z, 7)) shown.push(n)
    })
    const prev = this.treeShown
    if (prev && prev.length === shown.length && prev.every((v, k) => v === shown[k])) return
    this.treeShown = shown
    shown.forEach((n, slot) => {
      const tree = this.trees[n]
      this.trunks.setMatrixAt(slot, tree.matrix)
      this.leaves.setMatrixAt(slot, tree.matrix)
      this.leaves.setColorAt(slot, tree.color)
    })
    for (const mesh of [this.trunks, this.leaves]) {
      mesh.count = shown.length
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }

  /** Called every frame with the time since the last one (ms). */
  adapt(interval) {
    const pace = this.pace
    if (interval > 100) return // a pause (tab hidden, scrolled away), not a slow frame
    pace.frames++
    if (interval > 24) pace.slow++
    if (pace.frames < 90) return
    // Most of the last 90 frames under ~40 fps: step the resolution down (not below 1.25×).
    if (pace.slow > 45 && pace.ratio > 1.25) {
      pace.ratio = Math.max(1.25, pace.ratio - 0.25)
      this.renderer.setPixelRatio(pace.ratio)
    }
    pace.frames = pace.slow = 0
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / Math.max(1, h)
    this.camera.updateProjectionMatrix()
  }

  /* ── Per frame ─────────────────────────────────────────────────────────────────────────── */

  placeVan(x, z, heading, camYaw) {
    // Which rendered view: the van's heading relative to the way the camera looks.
    const rel = wrapAngle(heading - camYaw)
    const a = Math.abs(rel)
    // (Each file named by what it shows: 'br' = front up-right on screen, 'l' = front to the right…)
    const key = a < 0.32 ? 'b' : a < 1.15 ? (rel > 0 ? 'br' : 'bl') : a < 2.1 ? (rel > 0 ? 'l' : 'r') : a < 2.8 ? (rel > 0 ? 'fl' : 'fr') : 'f'
    if (this.van.material.map !== this.views[key]) {
      this.van.material.map = this.views[key]
      this.van.material.needsUpdate = true
    }
    this.van.scale.set(VIEW_HEIGHT / VIEW_RATIO[key], VIEW_HEIGHT, 1)
    this.van.position.set(x, 0.05, z)
    this.vanShadow.position.set(x, 0.06, z)
    this.ring.position.set(x, 0.08, z)
    this.glow.position.set(x, 0.065, z)
    const pulse = 0.4 + Math.sin(performance.now() / 280) * 0.15
    this.ring.material.opacity = pulse
  }

  /** Draw the moment `state` describes (see tourClock). */
  render(state) {
    if (!this.route) return
    const now = performance.now()
    const dt = Math.min(0.05, this.lastNow ? (now - this.lastNow) / 1000 : 0.016)
    if (this.lastNow) this.adapt(now - this.lastNow)
    this.lastNow = now
    const { x, z, heading } = state
    const route = this.route

    // Camera yaw trails the van's heading, so turns show the van's side for a moment.
    this.cam.yaw += wrapAngle(heading - this.cam.yaw) * Math.min(1, dt * 2.6)
    const [fx, fz] = dirOf(this.cam.yaw)
    const chase = { pos: new THREE.Vector3(x - fx * 11, 4.8, z - fz * 11), look: new THREE.Vector3(x + fx * 16, 1.1, z + fz * 16) }
    let pos = chase.pos
    let look = chase.look

    const lm = this.landmark
    const vFov = (this.camera.fov * Math.PI) / 180
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect)
    // Far enough back for the whole landmark — its width with a margin, its height with room
    // above — looking at its middle from a little above the square.
    // On a narrow (phone) screen a wide building may run off the sides — fitting its whole width
    // there would leave it tiny; the centre portal and its height are what matter.
    // A tower is framed from above the rooftops, so the blocks in between don't hide its foot.
    const tall = lm.height > lm.width * 2
    const fitWidth = Math.min(lm.width, this.camera.aspect < 1 ? lm.width * 0.55 : lm.width)
    const frameDist = Math.max(fitWidth / 2 / Math.tan(hFov / 2) / 0.84, (lm.height * (tall ? 1.38 : 1.3)) / (2 * Math.tan(vFov / 2)), 46)
    const framing = {
      pos: new THREE.Vector3(lm.front.x - lm.dir[0] * frameDist, tall ? Math.max(62, lm.height * 0.4) : Math.max(6, lm.height * 0.2), lm.front.z - lm.dir[1] * frameDist),
      look: new THREE.Vector3(lm.front.x, lm.height * 0.5, lm.front.z),
    }
    const above = (cx, cz) => ({ pos: new THREE.Vector3(cx - fx * 8, 190, cz - fz * 8), look: new THREE.Vector3(cx, 0, cz) })
    const lerpPose = (a, b, t) => ({ pos: a.pos.clone().lerp(b.pos, t), look: a.look.clone().lerp(b.look, t) })

    if (state.phase === 'map' || state.phase === 'zoomIn') {
      const from = above(x, z)
      const t = state.phase === 'map' ? 0 : ease(state.p)
      ;({ pos, look } = lerpPose(from, chase, t))
    } else if (state.phase === 'arrive') {
      ;({ pos, look } = lerpPose(chase, framing, ease(Math.min(1, state.p / 0.55))))
    } else if (state.phase === 'zoomOut') {
      ;({ pos, look } = lerpPose(framing, above(lm.front.x, lm.front.z), ease(state.p)))
    }
    this.camera.position.copy(pos)
    this.camera.lookAt(look)

    this.placeVan(x, z, heading, Math.atan2(look.x - pos.x, -(look.z - pos.z)))
    // The ribbon shows the road ahead while driving; it is gone once the van has arrived.
    this.ribbonMat.uniforms.uCar.value = state.phase === 'arrive' || state.phase === 'zoomOut' ? 1e5 : state.d * route.length

    // The sun follows the action so shadows stay crisp near the camera.
    const tgt = state.phase === 'arrive' || state.phase === 'zoomOut' ? lm.front : { x, z }
    this.sun.position.set(tgt.x + 70, 120, tgt.z + 40)
    this.sun.target.position.set(tgt.x, 0, tgt.z)

    this.camera.updateMatrixWorld()
    this.life.update(state.sceneT, { x, z }, this.camera)
    this.cullTrees()
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    // Leaving the page while shaders are still compiling: free everything once they're done,
    // or three.js's readiness check would read the disposed materials and throw.
    if (this.compiling) this.compiling.then(() => this.release())
    else this.release()
  }

  release() {
    this.renderer.dispose()
    this.scene.traverse((o) => {
      o.geometry?.dispose?.()
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      mats.forEach((mat) => {
        mat.map?.dispose?.()
        mat.dispose?.()
      })
    })
    Object.values(this.views).forEach((tex) => tex.dispose())
  }
}
