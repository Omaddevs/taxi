import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/* 3D models of the regions' landmarks for the tour's city scene, built from a small kit of
   Central Asian architecture: tiled portals (pishtaq) with pointed niches, onion domes on tiled
   drums (smooth or ribbed), tapering banded minarets, crenellated walls — plus a TV tower, rocks
   and an arched bridge. Metres; origin at the ground in the middle of the front; the front faces
   +z. build(key) → { group, width, height }. */

let M = null
function materials() {
  if (M) return M
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o })
  M = {
    brick: std('#dcbc8c'),
    brickD: std('#c49e6c'),
    brickL: std('#eed7b3'),
    tile: std('#f3eee1', { roughness: 0.6 }),
    lapis: std('#1f4f8f', { roughness: 0.45 }),
    turq: std('#22a8c9', { roughness: 0.3, metalness: 0.08 }),
    turqRib: std('#22a8c9', { roughness: 0.3, metalness: 0.08, flatShading: true }),
    green: std('#3aa17e', { roughness: 0.4 }),
    niche: std('#2f4a72', { roughness: 0.55, emissive: '#1c3256', emissiveIntensity: 0.35 }),
    door: std('#3a2a1c', { roughness: 0.6 }),
    gold: std('#e7c062', { roughness: 0.3, metalness: 0.6 }),
    stone: std('#e6dccb'),
    stoneD: std('#cfc3ae'),
    steel: std('#d9e2ec', { roughness: 0.35, metalness: 0.3 }),
    steelD: std('#8fa3b8', { roughness: 0.4, metalness: 0.3 }),
    red: std('#e05252', { roughness: 0.5 }),
    glass: std('#5f8fc4', { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }),
    white: std('#f5f7fa'),
    rock: std('#b3a38c', { flatShading: true }),
    rockD: std('#958670', { flatShading: true }),
    water: std('#9fd0ec', { roughness: 0.15 }),
    orange: std('#f2a33a', { roughness: 0.5 }),
  }
  return M
}

function kit(group) {
  const m = materials()
  const add = (mesh) => {
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  const k = {
    m,
    /** Any geometry, its centre at (x, y, z). */
    mesh(geometry, mat, x = 0, y = 0, z = 0) {
      const mesh = add(new THREE.Mesh(geometry, mat))
      mesh.position.set(x, y, z)
      return mesh
    },
    /** Box with its bottom at y, centred on (x, z). */
    box(w, h, d, mat, x = 0, y = 0, z = 0) {
      const mesh = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat))
      mesh.position.set(x, y + h / 2, z)
      return mesh
    },
    archShape(w, h) {
      const s = w * 0.55
      const shape = new THREE.Shape()
      shape.moveTo(-w / 2, 0)
      shape.lineTo(-w / 2, h - s)
      shape.quadraticCurveTo(-w / 2, h - s * 0.15, 0, h)
      shape.quadraticCurveTo(w / 2, h - s * 0.15, w / 2, h - s)
      shape.lineTo(w / 2, 0)
      shape.closePath()
      return shape
    },
    /** A flat pointed arch (niche, doorway) standing at depth z, facing +z. */
    arch(w, h, mat, x, y, z, depth = 0.4) {
      const mesh = add(new THREE.Mesh(new THREE.ExtrudeGeometry(k.archShape(w, h), { depth, bevelEnabled: false }), mat))
      mesh.position.set(x, y, z)
      return mesh
    },
    /** Rows of small niches on a wall whose front is at z. */
    arcade(x0, y0, w, h, n, z, rows = 1) {
      const cw = w / n
      const rh = h / rows
      for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) k.arch(cw * 0.6, rh * 0.72, m.niche, x0 + cw * (i + 0.5), y0 + r * rh + rh * 0.12, z, 0.25)
    },
    /** Building block, front face at z = front. */
    block(x0, w, h, dep, mat = m.brick, front = 0, y = 0) {
      k.box(w, h, dep, mat, x0 + w / 2, y, front - dep / 2)
      k.box(w, h * 0.06, dep + 0.4, m.brickL, x0 + w / 2, y + h, front - dep / 2) // parapet
    },
    /** Portal (pishtaq): framed tile facade with a deep pointed niche; front at z = front. */
    portal(cx, w, h, dep, opts = {}) {
      const { front = 2, spandrel = m.turq, face = m.tile, frame = m.lapis } = opts
      const z0 = front
      k.box(w, h, dep, face, cx, 0, z0 - dep / 2)
      const b = w * 0.07
      k.box(w + 0.2, h * 0.08, 0.5, frame, cx, h * 0.92, z0) // inscription band
      k.box(b, h * 0.92, 0.5, frame, cx - w / 2 + b / 2, 0, z0)
      k.box(b, h * 0.92, 0.5, frame, cx + w / 2 - b / 2, 0, z0)
      const nw = w * 0.6
      const nh = h * 0.78
      k.box(w - 2 * b, h * 0.3, 0.3, spandrel, cx, nh * 0.6, z0)
      k.arch(nw + w * 0.08, nh + w * 0.05, m.tile, cx, 0, z0 + 0.1, 0.3)
      k.arch(nw, nh, m.niche, cx, 0, z0 + 0.2, 0.3)
      k.arch(nw * 0.36, nh * 0.42, m.door, cx, 0, z0 + 0.35, 0.2)
      for (let i = 0; i < 5; i++) k.arch(nw * 0.1, nh * 0.15, m.lapis, cx - nw * 0.4 + i * nw * 0.2, nh * 0.62, z0 + 0.32, 0.1)
      if (opts.tigers) {
        k.box(w * 0.14, h * 0.07, 0.2, m.orange, cx - w * 0.3, h * 0.78, z0 + 0.35)
        k.box(w * 0.14, h * 0.07, 0.2, m.orange, cx + w * 0.3, h * 0.78, z0 + 0.35)
      }
    },
    /** Onion dome on a tiled drum; `ribbed` for the faceted, ribbed ones. */
    dome(x, y, z, r, h, opts = {}) {
      const { ribbed = false, drum = r * 0.55, mat = ribbed ? m.turqRib : m.turq } = opts
      const dr = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, drum, 28), m.lapis))
      dr.position.set(x, y + drum / 2, z)
      const curve = new THREE.SplineCurve([
        new THREE.Vector2(r, 0),
        new THREE.Vector2(r * 1.12, h * 0.25),
        new THREE.Vector2(r * 1.02, h * 0.52),
        new THREE.Vector2(r * 0.66, h * 0.8),
        new THREE.Vector2(r * 0.22, h * 0.95),
        new THREE.Vector2(0.01, h),
      ])
      const dome = add(new THREE.Mesh(new THREE.LatheGeometry(curve.getPoints(28), ribbed ? 18 : 40), mat))
      dome.position.set(x, y + drum, z)
      const fin = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.03, r * 0.05, h * 0.18, 8), m.gold))
      fin.position.set(x, y + drum + h + h * 0.08, z)
    },
    /** Tapering minaret with tile bands, a balcony and a lantern. */
    minaret(x, z, r, h, opts = {}) {
      const { bands = 3, lantern = true, mat = m.brick } = opts
      const body = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 28), mat))
      body.position.set(x, h / 2, z)
      for (let i = 1; i <= bands; i++) {
        const y = (h * i) / (bands + 1)
        const rr = r - (r * 0.2 * i) / (bands + 1)
        const band = add(new THREE.Mesh(new THREE.CylinderGeometry(rr + 0.06, rr + 0.06, h * 0.035, 28), m.turq))
        band.position.set(x, y, z)
      }
      if (!lantern) return
      const bal = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.2, r * 0.85, h * 0.03, 28), m.stoneD))
      bal.position.set(x, h + h * 0.015, z)
      const lan = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.78, h * 0.07, 20), m.brickL))
      lan.position.set(x, h + h * 0.065, z)
      const cap = add(new THREE.Mesh(new THREE.SphereGeometry(r * 0.8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.turq))
      cap.position.set(x, h + h * 0.1, z)
    },
    wall(x0, w, h, z, dep = 3) {
      k.box(w, h, dep, m.brick, x0 + w / 2, 0, z - dep / 2)
      const cw = h * 0.22
      for (let x = x0 + cw / 2; x < x0 + w; x += cw * 2) k.box(cw, cw, dep, m.brick, x, h, z - dep / 2)
    },
    rock(x, y, z, sx, sy, sz, mat = m.rock, rot = 0) {
      const mesh = add(new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat))
      mesh.scale.set(sx, sy, sz)
      mesh.rotation.y = rot
      mesh.position.set(x, y, z)
      return mesh
    },
  }
  return k
}

/* ── The landmarks ─────────────────────────────────────────────────────────────────────────── */

/* ── Registon maydoni ──────────────────────────────────────────────────────────────────────
   Three madrasas around the square, open to the south (+z, where the van arrives): Ulug‘bek on
   the west and Sherdor on the east face each other across it, Tillakori closes the north side.
   Each facade: a towering pishtaq (portal) with a pointed niche, girih tilework and a kufic
   frame, two-storey arcaded wings in buff brick with the blue "bannai" lozenge net, corner
   minarets (Ulug‘bek, Sherdor — slightly leaning) or guldasta turrets (Tillakori), and domes
   — Sherdor's two ribbed turquoise ones, Tillakori's great blue dome on a tall drum. */

let REG = null
function registonTextures() {
  if (REG) return REG
  const make = (w, h, draw) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    draw(c.getContext('2d'), w, h)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    return t
  }
  const star = (g, cx, cy, r, fill, stroke) => {
    g.beginPath()
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI / 8) * i
      const rr = i % 2 ? r * 0.62 : r
      const x = cx + Math.cos(a) * rr
      const y = cy + Math.sin(a) * rr
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    g.closePath()
    g.fillStyle = fill
    g.fill()
    g.lineWidth = 3
    g.strokeStyle = stroke
    g.stroke()
  }
  const lattice = (g, step, color, width) => {
    g.strokeStyle = color
    g.lineWidth = width
    for (let i = -256; i <= 512; i += step) {
      g.beginPath()
      g.moveTo(i, 0)
      g.lineTo(i + 256, 256)
      g.moveTo(i, 256)
      g.lineTo(i + 256, 0)
      g.stroke()
    }
  }
  REG = {
    // Girih: eight-point stars in turquoise and gold on lapis, in a white strapwork lattice.
    girih: make(256, 256, (g) => {
      g.fillStyle = '#1d3f86'
      g.fillRect(0, 0, 256, 256)
      lattice(g, 64, '#e9f1f4', 5)
      const pts = [[0, 0], [128, 0], [256, 0], [64, 64], [192, 64], [0, 128], [128, 128], [256, 128], [64, 192], [192, 192], [0, 256], [128, 256], [256, 256]]
      for (const [x, y] of pts) {
        star(g, x, y, 26, (x + y) % 128 ? '#2bb3c9' : '#f0c75a', '#e9f1f4')
        g.fillStyle = '#1d3f86'
        g.beginPath()
        g.arc(x, y, 7, 0, Math.PI * 2)
        g.fill()
      }
    }),
    // Buff brick with the blue lozenge net.
    brick: make(256, 256, (g) => {
      g.fillStyle = '#d9bb87'
      g.fillRect(0, 0, 256, 256)
      g.strokeStyle = 'rgba(150,115,70,0.35)'
      g.lineWidth = 2
      for (let y = 0; y <= 256; y += 16) {
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(256, y)
        g.stroke()
        for (let x = (y / 16) % 2 ? 0 : 16; x < 256; x += 32) {
          g.beginPath()
          g.moveTo(x, y)
          g.lineTo(x, y + 16)
          g.stroke()
        }
      }
      lattice(g, 64, '#2a5ea8', 5)
      lattice(g, 64, '#46b8c8', 1.5)
    }),
    // Kufic inscription band: white block letters on lapis between gold rules.
    kufic: make(512, 64, (g) => {
      g.fillStyle = '#183673'
      g.fillRect(0, 0, 512, 64)
      g.fillStyle = '#f2f4f2'
      let seed = 7
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
      for (let x = 8; x < 504; x += 14) {
        const h = 14 + Math.floor(rnd() * 3) * 10
        g.fillRect(x, 50 - h, 6, h)
        if (rnd() > 0.5) g.fillRect(x, 44, 14, 6)
        if (rnd() > 0.7) g.fillRect(x, 50 - h, 12, 5)
      }
      g.fillStyle = '#f0c75a'
      g.fillRect(0, 0, 512, 4)
      g.fillRect(0, 60, 512, 4)
    }),
    // Sherdor's spandrels: the tiger chasing a doe beneath a sun with a face.
    tiger: make(512, 256, (g) => {
      g.fillStyle = '#1d3f86'
      g.fillRect(0, 0, 512, 256)
      g.fillStyle = '#2bb3c9'
      for (let x = 0; x < 512; x += 32) for (let y = 0; y < 256; y += 32) if ((x + y) % 64 === 0) g.fillRect(x + 12, y + 12, 8, 8)
      g.fillStyle = '#e88a2a'
      g.beginPath()
      g.ellipse(200, 170, 90, 34, -0.05, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      g.arc(292, 150, 28, 0, Math.PI * 2)
      g.fill()
      for (const x of [140, 170, 230, 260]) g.fillRect(x, 190, 14, 52)
      g.lineWidth = 12
      g.strokeStyle = '#e88a2a'
      g.beginPath()
      g.moveTo(112, 160)
      g.quadraticCurveTo(70, 120, 100, 90)
      g.stroke()
      g.strokeStyle = '#1a1a1a'
      g.lineWidth = 5
      for (let x = 140; x < 280; x += 22) {
        g.beginPath()
        g.moveTo(x, 142)
        g.lineTo(x + 8, 198)
        g.stroke()
      }
      g.fillStyle = '#f5f0e6'
      g.beginPath()
      g.ellipse(410, 200, 46, 20, 0, 0, Math.PI * 2)
      g.fill()
      for (const x of [380, 430]) g.fillRect(x, 212, 8, 34)
      g.fillStyle = '#f0c75a'
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI / 8) * i
        g.beginPath()
        g.moveTo(330 + Math.cos(a) * 32, 70 + Math.sin(a) * 32)
        g.lineTo(330 + Math.cos(a + 0.2) * 52, 70 + Math.sin(a + 0.2) * 52)
        g.lineTo(330 + Math.cos(a - 0.2) * 52, 70 + Math.sin(a - 0.2) * 52)
        g.fill()
      }
      g.beginPath()
      g.arc(330, 70, 32, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#c47a1e'
      g.beginPath()
      g.arc(320, 64, 4, 0, Math.PI * 2)
      g.arc(340, 64, 4, 0, Math.PI * 2)
      g.fill()
      g.fillRect(322, 80, 16, 4)
    }),
  }
  return REG
}

function tiled(tex, rx, ry, extra = {}, rotation = 0) {
  const t = tex.clone()
  t.needsUpdate = true
  t.repeat.set(rx, ry)
  t.rotation = rotation
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, ...extra })
}

/** One madrasa facade in its own frame: front at z = 0 facing +z, centred on x = 0. */
function madrasa(k, o) {
  const T = registonTextures()
  const { m } = k
  const { W, H, D, PW, PH } = o
  const wingW = (W - PW) / 2
  const brick = o.brick ?? ((w, h) => tiled(T.brick, w / 6, h / 6))
  // Wings: two storeys of niches under a kufic band.
  for (const side of [-1, 1]) {
    const cx = side * (PW / 2 + wingW / 2)
    k.mesh(new THREE.BoxGeometry(wingW, H, D), brick(wingW, H), cx, H / 2, -D / 2)
    const n = Math.max(2, Math.round(wingW / 6.5))
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < n; i++) {
        const x = cx - wingW / 2 + (wingW / n) * (i + 0.5)
        const y = 1.2 + row * (H / 2 - 0.4)
        k.arch((wingW / n) * 0.62, H / 2 - 2.6, m.tile, x, y, 0.02, 0.15)
        k.arch((wingW / n) * 0.5, H / 2 - 3.2, m.niche, x, y, 0.12, 0.15)
      }
    k.mesh(new THREE.BoxGeometry(wingW, 1.4, 0.3), tiled(T.kufic, wingW / 12, 1), cx, H - 1.1, 0.12)
  }
  // Pishtaq: framed with a kufic band, girih (or tiger) spandrels, a tall pointed niche.
  const zf = 2.2
  k.mesh(new THREE.BoxGeometry(PW, PH, D + zf), brick(PW, PH), 0, PH / 2, -(D + zf) / 2 + zf)
  const band = PW * 0.07
  k.mesh(new THREE.BoxGeometry(PW, band, 0.3), tiled(T.kufic, PW / 10, 1), 0, PH - band / 2 - 0.6, zf + 0.12)
  for (const side of [-1, 1])
    k.mesh(new THREE.BoxGeometry(band, PH - band - 0.6, 0.3), tiled(T.kufic, PH / 10, 1, {}, Math.PI / 2), side * (PW / 2 - band / 2), (PH - band - 0.6) / 2, zf + 0.12)
  const nw = PW * 0.62
  const nh = PH * 0.8
  const spandrel = o.tigers ? tiled(T.tiger, 1, 1) : tiled(T.girih, PW / 7, PH / 10)
  k.mesh(new THREE.BoxGeometry(PW - 2 * band, PH * 0.34, 0.2), spandrel, 0, nh - PH * 0.08, zf + 0.11)
  k.arch(nw + 1.4, nh + 0.8, m.tile, 0, 0, zf + 0.16, 0.25)
  k.arch(nw, nh, tiled(T.girih, nw / 5, nh / 5, { color: '#9fb4d6' }), 0, 0, zf + 0.22, 0.25)
  k.arch(nw * 0.42, nh * 0.42, m.door, 0, 0, zf + 0.4, 0.15)
  for (const side of [-1, 1]) k.arch(nw * 0.18, nh * 0.2, m.niche, side * nw * 0.25, nh * 0.48, zf + 0.42, 0.1)
  // Minarets (leaning a little outwards) or turrets at the front corners; domes behind.
  for (const side of [-1, 1]) {
    if (o.minarets) {
      const h = o.minarets
      const lean = 0.025
      const top = side * (W / 2 + h * lean)
      const shaft = k.mesh(new THREE.CylinderGeometry(1.9, 2.5, h, 28), tiled(T.brick, 2, h / 8), side * (W / 2 + (h / 2) * lean), h / 2, 0)
      shaft.rotation.z = side * -lean
      for (const y of [h * 0.34, h * 0.66]) k.mesh(new THREE.CylinderGeometry(2.25, 2.3, 0.9, 28), tiled(T.kufic, 3, 1), side * (W / 2 + y * lean), y, 0)
      k.mesh(new THREE.CylinderGeometry(2.5, 1.9, 1.1, 28), m.stoneD, top, h + 0.5, 0)
      k.mesh(new THREE.CylinderGeometry(1.7, 1.7, 2.4, 20), m.brickL, top, h + 2.2, 0)
      k.mesh(new THREE.SphereGeometry(1.75, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.turq, top, h + 3.4, 0)
    }
    if (o.guldasta && o.round) {
      // Bukhara's thick round corner towers with a flat, banded top.
      k.mesh(new THREE.CylinderGeometry(3.4, 3.6, o.guldasta, 32), brick(8, o.guldasta), side * W / 2, o.guldasta / 2, -2)
      k.mesh(new THREE.CylinderGeometry(3.55, 3.45, 1, 32), m.brickL, side * W / 2, o.guldasta + 0.5, -2)
    } else if (o.guldasta) {
      k.mesh(new THREE.CylinderGeometry(1.9, 2.2, o.guldasta, 24), brick(4, o.guldasta), side * W / 2, o.guldasta / 2, -1)
      k.mesh(new THREE.SphereGeometry(1.95, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.turq, side * W / 2, o.guldasta, -1)
    }
  }
  for (const d of o.domes ?? []) k.dome(d.x, d.y, d.z, d.r, d.h, { ribbed: d.ribbed, drum: d.drum })
}

function registon(k, group) {
  const place = (x, z, rotY, opts) => {
    const g = new THREE.Group()
    madrasa(kit(g), opts)
    g.position.set(x, 0, z)
    g.rotation.y = rotY
    group.add(g)
  }
  // Ulug‘bek (west), facing east across the square.
  place(-38, -28, Math.PI / 2, {
    W: 56, H: 16, D: 16, PW: 22, PH: 35, minarets: 33,
    domes: [{ x: -20, y: 16, z: -12, r: 4.2, h: 5.5 }, { x: 20, y: 16, z: -12, r: 4.2, h: 5.5 }],
  })
  // Sherdor (east), facing west — the tigers on its portal, two ribbed domes behind it.
  place(38, -28, -Math.PI / 2, {
    W: 56, H: 16, D: 16, PW: 22, PH: 35, minarets: 33, tigers: true,
    domes: [{ x: -14, y: 16, z: -11, r: 5.6, h: 9, ribbed: true, drum: 6 }, { x: 14, y: 16, z: -11, r: 5.6, h: 9, ribbed: true, drum: 6 }],
  })
  // Tillakori (north), facing south: a wide two-storey front, turrets, the great dome on the left.
  place(0, -64, 0, {
    W: 76, H: 15, D: 18, PW: 24, PH: 30, guldasta: 20,
    domes: [{ x: -24, y: 15, z: -12, r: 8.5, h: 12, drum: 9 }],
  })
  void k
  return { width: 112, height: 42 }
}

/* Toshkent teleminorasi (375 m), scaled to 170 units and measured off a reference render:
   three curved concrete legs on a round stylobate, the lattice shaft rising between them, the
   lower pod with its blue honeycomb glazing, three antenna platforms, the observation pod and the
   tapering spire with its fins. */
let towerTex = null
function towerTextures() {
  if (towerTex) return towerTex
  const canvasTex = (w, h, draw, repeat) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    draw(c.getContext('2d'), w, h)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
    t.anisotropy = 4
    return t
  }
  // Honeycomb of pale frames over blue-violet glass.
  const hex = (repeat) =>
    canvasTex(
      128,
      128,
      (g) => {
        const glass = g.createLinearGradient(0, 0, 0, 128)
        glass.addColorStop(0, '#5e6f9e')
        glass.addColorStop(1, '#3f4f7d')
        g.fillStyle = glass
        g.fillRect(0, 0, 128, 128)
        g.strokeStyle = '#e4e2dc'
        g.lineWidth = 7
        const cell = (cx, cy) => {
          g.beginPath()
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i + Math.PI / 6
            const x = cx + Math.cos(a) * 30
            const y = cy + Math.sin(a) * 40
            if (i) g.lineTo(x, y)
            else g.moveTo(x, y)
          }
          g.closePath()
          g.stroke()
        }
        for (const [cx, cy] of [[0, 0], [64, 0], [128, 0], [32, 64], [96, 64], [0, 128], [64, 128], [128, 128]]) cell(cx, cy)
        g.fillStyle = 'rgba(255,255,255,0.18)'
        g.fillRect(0, 0, 128, 10)
      },
      repeat,
    )
  // X-braced steel lattice on transparency.
  const lattice = (repeat) =>
    canvasTex(
      64,
      64,
      (g) => {
        g.strokeStyle = '#b9bec6'
        g.lineWidth = 4
        g.strokeRect(2, 0, 60, 64)
        g.lineWidth = 3
        g.beginPath()
        g.moveTo(2, 0)
        g.lineTo(62, 64)
        g.moveTo(62, 0)
        g.lineTo(2, 64)
        g.moveTo(2, 32)
        g.lineTo(62, 32)
        g.stroke()
      },
      repeat,
    )
  towerTex = { hexLow: hex([10, 2]), hexHigh: hex([9, 1.4]), latticeLow: lattice([4, 18]), latticeHigh: lattice([6, 22]) }
  return towerTex
}

function teleminora(k) {
  const { m } = k
  const tx = towerTextures()
  const concrete = new THREE.MeshStandardMaterial({ color: '#d9d5cc', roughness: 0.8 })
  const concreteD = new THREE.MeshStandardMaterial({ color: '#bdb8ae', roughness: 0.85 })
  const steel = new THREE.MeshStandardMaterial({ color: '#c3c7cd', roughness: 0.45, metalness: 0.45 })
  const pad = new THREE.MeshStandardMaterial({ color: '#8a6656', roughness: 0.8 })
  const fin = new THREE.MeshStandardMaterial({ color: '#dfe3e8', roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  const lattice = (map) => new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.5 })
  const glass = (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.25, metalness: 0.15 })
  const lathe = (profile, mat, segs = 48) => k.mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs), mat)
  const ring = (r, y, h, mat, rTop = r) => k.mesh(new THREE.CylinderGeometry(rTop, r, h, 48), mat, 0, y + h / 2, 0)

  // Stylobate: a low round podium with glazed walls and a faceted rim.
  ring(11.4, 0, 2.2, m.glass)
  ring(12.2, 2.2, 0.9, concreteD, 11.6)
  ring(11.2, 3.1, 1.2, concrete, 9.8)
  ring(3.4, 4.3, 2.4, pad, 2.6)

  // The three curved legs: wide at the top where they hold the pod, slim at their feet.
  for (const a of [Math.PI / 6, (5 * Math.PI) / 6, (3 * Math.PI) / 2]) {
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a))
    const at = (r, y) => dir.clone().multiplyScalar(r).setY(y)
    const curve = new THREE.QuadraticBezierCurve3(at(16.2, 0.6), at(9.5, 22), at(3.3, 46))
    const pts = curve.getPoints(24)
    for (let i = 0; i < pts.length - 1; i++) {
      const t = i / (pts.length - 1)
      const rad = 0.55 + t * t * 1.6 // tapering towards the foot
      const seg = pts[i + 1].clone().sub(pts[i])
      const piece = k.mesh(new THREE.CylinderGeometry(rad + 0.05, rad, seg.length() + 0.05, 14), concrete)
      piece.position.copy(pts[i]).add(seg.clone().multiplyScalar(0.5))
      piece.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), seg.normalize())
    }
    k.box(1.6, 1.4, 1.6, pad, dir.x * 16.2, 0, dir.z * 16.2) // foot block
  }
  // Collar where the legs meet the shaft, flaring out under the lower pod.
  lathe([[0.1, 44], [3.6, 44], [4.2, 46.5], [5.4, 48.2], [6.6, 48.8], [0.1, 48.8]], concrete)

  // Lattice shaft between the legs.
  k.mesh(new THREE.CylinderGeometry(1.35, 1.6, 40, 16, 1, true), lattice(tx.latticeLow), 0, 24.3, 0)
  k.mesh(new THREE.CylinderGeometry(0.5, 0.5, 40, 8), steel, 0, 24.3, 0)

  // Lower pod: a stepped deck, the honeycomb drum, and a glazed neck above.
  ring(6.7, 48.8, 1, concreteD)
  k.mesh(new THREE.CylinderGeometry(6.6, 6.5, 8.8, 48, 1, true), glass(tx.hexLow), 0, 54.2, 0)
  ring(6.9, 58.6, 0.8, concrete, 6.6)
  ring(5.6, 59.4, 1.2, concreteD, 5.2)
  k.mesh(new THREE.CylinderGeometry(3.9, 3.9, 2.6, 36, 1, true), m.glass, 0, 61.9, 0)
  ring(4.6, 63.2, 0.6, concrete)

  // Upper lattice shaft with three antenna platforms (thin fins on either side).
  k.mesh(new THREE.CylinderGeometry(2.5, 2.7, 37.5, 16, 1, true), lattice(tx.latticeHigh), 0, 82.1, 0)
  k.mesh(new THREE.CylinderGeometry(1.1, 1.1, 37.5, 10), steel, 0, 82.1, 0)
  for (const y of [64.4, 79.3, 94.2]) {
    ring(3.2, y - 0.3, 0.6, steel)
    for (const side of [-1, 1]) {
      const f = k.mesh(new THREE.BoxGeometry(4.6, 0.08, 1.6), fin, side * 5.1, y + 0.25, 0)
      f.rotation.z = side * -0.1
      const f2 = k.mesh(new THREE.BoxGeometry(1.6, 0.08, 4.6), fin, 0, y + 0.25, side * 5.1)
      f2.rotation.x = side * 0.1
    }
  }

  // Observation pod: honeycomb drum between two decks, with a low cap.
  ring(4.2, 100.8, 0.9, concreteD, 5.1)
  k.mesh(new THREE.CylinderGeometry(5.35, 5.35, 6.2, 48, 1, true), glass(tx.hexHigh), 0, 104.8, 0)
  ring(5.6, 101.7, 0.5, concrete)
  ring(5.5, 107.9, 0.6, concrete, 5.7)
  lathe([[0.1, 108.5], [5.4, 108.5], [4.6, 109.5], [1.6, 110], [0.1, 110]], concrete)

  // Spire: tapering mast with rungs, fin rings and a needle on top.
  k.mesh(new THREE.CylinderGeometry(0.5, 1.05, 50, 14), steel, 0, 135, 0)
  for (let y = 112; y < 159; y += 2.2) ring(0.9 - (y - 112) * 0.009, y, 0.18, m.steelD)
  for (const [y, r] of [[120.6, 4.6], [134, 4.6], [159.6, 3]]) {
    ring(r, y, 0.12, fin, r * 0.35)
    ring(0.95, y - 0.4, 0.8, steel)
  }
  k.mesh(new THREE.CylinderGeometry(0.06, 0.45, 10.5, 8), steel, 0, 165.3, 0)
  k.mesh(new THREE.SphereGeometry(0.28, 10, 8), m.red, 0, 170.6, 0)
  return { width: 46, height: 172 }
}

/* ── Poi Kalon, Buxoro ─────────────────────────────────────────────────────────────────────
   As seen across its square: Mir-i Arab madrasa on the left (pishtaq, two-storey arcades, round
   corner towers, two turquoise domes on tall tiled drums), Kalon mosque's portal on the right,
   a small brick dome between, and Minorai Kalon itself — 46 m, tapering, wrapped in bands of
   patterned brickwork, its rotunda of sixteen arches under a stalactite cornice and a cupola. */

let KAL = null
function kalonTextures() {
  if (KAL) return KAL
  const make = (w, h, draw) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    draw(c.getContext('2d'), w, h)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    return t
  }
  const BR = '#c9a46e'
  const BR_D = '#a88552'
  const BR_L = '#e2c595'
  const rows = (g, y0, y1, w) => {
    g.fillStyle = BR
    g.fillRect(0, y0, w, y1 - y0)
    g.strokeStyle = 'rgba(110,80,40,0.45)'
    g.lineWidth = 1.5
    for (let y = y0; y <= y1; y += 8) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(w, y)
      g.stroke()
      for (let x = ((y - y0) / 8) % 2 ? 0 : 8; x < w; x += 16) {
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x, Math.min(y1, y + 8))
        g.stroke()
      }
    }
  }
  KAL = {
    // The minaret's skin, bottom to top: plain courses, then bands of lozenges, zigzags,
    // a kufic band and a thin turquoise frieze. Mapped once around (repeat 4) and up the shaft.
    minaret: make(256, 1024, (g, w, h) => {
      rows(g, 0, h, w)
      const lozenge = (y0, y1, size, dark) => {
        g.fillStyle = BR_L
        g.fillRect(0, y0, w, y1 - y0)
        g.strokeStyle = dark
        g.lineWidth = 3
        for (let x = -size; x < w + size; x += size)
          for (let y = y0; y < y1; y += size) {
            g.beginPath()
            g.moveTo(x + size / 2, y)
            g.lineTo(x + size, y + size / 2)
            g.lineTo(x + size / 2, y + size)
            g.lineTo(x, y + size / 2)
            g.closePath()
            g.stroke()
          }
        g.fillStyle = 'rgba(0,0,0,0.12)'
        g.fillRect(0, y0, w, 3)
        g.fillRect(0, y1 - 3, w, 3)
      }
      const zigzag = (y0, y1) => {
        g.fillStyle = BR_L
        g.fillRect(0, y0, w, y1 - y0)
        g.strokeStyle = BR_D
        g.lineWidth = 4
        for (let r = 0; r < 3; r++) {
          g.beginPath()
          for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + 6 + r * ((y1 - y0 - 12) / 2) + ((x / 16) % 2 ? 6 : -6) * (r === 1 ? 1 : 0.5))
          g.stroke()
        }
      }
      const kufic = (y0, y1) => {
        g.fillStyle = BR_D
        g.fillRect(0, y0, w, y1 - y0)
        g.fillStyle = BR_L
        for (let x = 4; x < w; x += 12) {
          const hh = (y1 - y0) * (0.35 + ((x * 7) % 5) * 0.12)
          g.fillRect(x, y1 - 4 - hh, 5, hh)
        }
      }
      // y grows downwards in the canvas: top of the shaft at 0, the base at 1024.
      lozenge(30, 110, 22, BR_D)
      g.fillStyle = '#3aa7b8'
      g.fillRect(0, 112, w, 12)
      kufic(126, 166)
      zigzag(210, 260)
      lozenge(330, 400, 18, BR_D)
      zigzag(470, 510)
      lozenge(590, 660, 26, BR_D)
      zigzag(740, 780)
      lozenge(860, 920, 20, BR_D)
    }),
    plain: make(256, 256, (g, w, h) => rows(g, 0, h, w)),
  }
  return KAL
}

function kalonSkin(tex, rx, ry, extra = {}) {
  const t = tex.clone()
  t.needsUpdate = true
  t.repeat.set(rx, ry)
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, ...extra })
}

function minorKalon(k, x, z) {
  const T = kalonTextures()
  const { m } = k
  const H = 40 // shaft
  k.mesh(new THREE.CylinderGeometry(4.6, 4.75, 1.2, 40), m.stoneD, x, 0.6, z) // plinth
  k.mesh(new THREE.CylinderGeometry(3.15, 4.5, H, 40), kalonSkin(T.minaret, 4, 1), x, 1.2 + H / 2, z)
  const brickL = new THREE.MeshStandardMaterial({ color: '#d8b884', roughness: 0.85 })
  const brickD = new THREE.MeshStandardMaterial({ color: '#b48d58', roughness: 0.85 })
  // Rotunda: sixteen arched openings between piers.
  const y0 = 1.2 + H
  k.mesh(new THREE.CylinderGeometry(3.25, 3.2, 0.5, 40), brickD, x, y0 + 0.25, z)
  k.mesh(new THREE.CylinderGeometry(3.0, 3.0, 3.4, 32), m.niche, x, y0 + 2.2, z)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const pier = k.mesh(new THREE.BoxGeometry(0.42, 3.4, 0.5), brickL, x + Math.sin(a) * 3.15, y0 + 2.2, z + Math.cos(a) * 3.15)
    pier.rotation.y = a
  }
  k.mesh(new THREE.TorusGeometry(3.18, 0.18, 6, 48), brickL, x, y0 + 3.75, z).rotation.x = Math.PI / 2
  // Stalactite cornice: corbelled rings stepping out.
  ;[[3.35, 0.45], [3.6, 0.45], [3.85, 0.45], [4.05, 0.55]].forEach(([r, h], i) =>
    k.mesh(new THREE.CylinderGeometry(r, r - 0.22, h, 40), i % 2 ? brickD : brickL, x, y0 + 4.1 + i * 0.45, z),
  )
  k.mesh(new THREE.CylinderGeometry(3.6, 4.05, 1.0, 40), brickL, x, y0 + 6.3, z)
  k.mesh(new THREE.SphereGeometry(2.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), brickL, x, y0 + 6.8, z)
  k.mesh(new THREE.ConeGeometry(0.5, 1.6, 12), brickD, x, y0 + 9.6, z)
}

function poiKalon(k, group) {
  const T = kalonTextures()
  const plain = (w, h) => kalonSkin(T.plain, w / 6, h / 6)
  const place = (x, z, rotY, opts) => {
    const g = new THREE.Group()
    madrasa(kit(g), { ...opts, brick: plain })
    g.position.set(x, 0, z)
    g.rotation.y = rotY
    group.add(g)
  }
  // Mir-i Arab (west), facing east: round corner towers, two domes on tall drums.
  place(-36, -24, Math.PI / 2, {
    W: 50, H: 15, D: 16, PW: 20, PH: 30, guldasta: 16, round: true,
    domes: [{ x: -16, y: 15, z: -10, r: 6.4, h: 9.5, drum: 8 }, { x: 16, y: 15, z: -10, r: 5.2, h: 8, drum: 6 }],
  })
  // Kalon mosque (east), facing west: a long arcaded front, its portal, a blue dome behind.
  place(38, -24, -Math.PI / 2, {
    W: 54, H: 13, D: 14, PW: 20, PH: 27,
    domes: [{ x: 0, y: 13, z: -22, r: 6, h: 8.5, drum: 5 }],
  })
  // A small brick dome on a square base between them, at the back.
  const { m } = k
  k.box(16, 6, 14, plain(16, 6), -4, 0, -58)
  k.dome(-4, 6, -58, 5.6, 6.5, { mat: new THREE.MeshStandardMaterial({ color: '#cfae78', roughness: 0.85 }), drum: 2 })
  // Minorai Kalon, rising beside the mosque.
  minorKalon(k, 16, -38)
  void m
  return { width: 112, height: 52 }
}

/* ── Kalta minor, Xiva (Ichan Qal'a) ───────────────────────────────────────────────────────
   As in the view from the square: the unfinished minaret — a broad truncated cone, 14 m across
   at the base and 29 m tall, sheathed in glazed tile: plain turquoise below, bands of white and
   green chequer and zigzag, a blue-and-white majolica inscription near the flat top. On the
   right the clay city wall with its rounded crest and the gate between two round towers (their
   tops in a white-and-green tile net under turquoise onion caps), a tiled portal behind the
   wall; on the left a madrasa with an arcaded upper floor, a small capped tower and flat clay
   houses. */

let KM = null
function kaltaTextures() {
  if (KM) return KM
  const make = (w, h, draw) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    draw(c.getContext('2d'), w, h)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    return t
  }
  const TQ = '#2aa39a'
  const TQ_L = '#5cc4b4'
  const GREEN = '#1f7f6e'
  const chequer = (g, y0, y1, w, cell) => {
    g.fillStyle = '#e9f1ea'
    g.fillRect(0, y0, w, y1 - y0)
    g.fillStyle = GREEN
    for (let y = y0; y < y1; y += cell)
      for (let x = ((y - y0) / cell) % 2 ? cell : 0; x < w; x += cell * 2) {
        g.beginPath()
        g.moveTo(x + cell / 2, y)
        g.lineTo(x + cell, y + cell / 2)
        g.lineTo(x + cell / 2, y + cell)
        g.lineTo(x, y + cell / 2)
        g.fill()
      }
  }
  const rule = (g, y, w, color, h = 6) => {
    g.fillStyle = color
    g.fillRect(0, y, w, h)
  }
  KM = {
    // The minaret's tile skin; canvas top = the top of the cone.
    minaret: make(256, 1024, (g, w, h) => {
      const base = g.createLinearGradient(0, 0, 0, h)
      base.addColorStop(0, TQ_L)
      base.addColorStop(1, TQ)
      g.fillStyle = base
      g.fillRect(0, 0, w, h)
      // Glazed brick courses.
      g.strokeStyle = 'rgba(10,70,65,0.25)'
      g.lineWidth = 1
      for (let y = 0; y < h; y += 6) {
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(w, y)
        g.stroke()
      }
      rule(g, 18, w, '#f4f7f2', 8)
      rule(g, 34, w, '#f4f7f2', 4)
      // Majolica inscription band.
      g.fillStyle = '#1d4f9a'
      g.fillRect(0, 96, w, 56)
      g.fillStyle = '#f2f5f1'
      for (let x = 4; x < w; x += 10) {
        const hh = 12 + ((x * 13) % 4) * 7
        g.fillRect(x, 146 - hh, 4, hh)
        if ((x / 10) % 3 === 0) g.fillRect(x, 120, 10, 3)
      }
      rule(g, 90, w, '#f4f7f2', 5)
      rule(g, 154, w, '#f4f7f2', 5)
      // Bands of chequer and zigzag, divided by white rules.
      chequer(g, 300, 380, w, 16)
      rule(g, 296, w, '#f4f7f2', 4)
      rule(g, 380, w, '#f4f7f2', 4)
      g.strokeStyle = GREEN
      g.lineWidth = 7
      for (const y0 of [420, 445]) {
        g.beginPath()
        for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + ((x / 16) % 2 ? 10 : -6))
        g.stroke()
      }
      chequer(g, 500, 600, w, 20)
      rule(g, 496, w, '#f4f7f2', 4)
      rule(g, 600, w, '#f4f7f2', 4)
      chequer(g, 660, 720, w, 14)
      rule(g, 720, w, '#f4f7f2', 4)
    }),
    // The gate towers' upper sections: a white net on green tile.
    net: make(128, 128, (g, w, h) => {
      g.fillStyle = GREEN
      g.fillRect(0, 0, w, h)
      g.strokeStyle = '#eef5ef'
      g.lineWidth = 6
      for (let i = -128; i <= 256; i += 32) {
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i + 128, 128)
        g.moveTo(i, 128)
        g.lineTo(i + 128, 0)
        g.stroke()
      }
    }),
    // Sun-dried clay with faint brick courses.
    clay: make(256, 256, (g, w, h) => {
      g.fillStyle = '#ddbf8e'
      g.fillRect(0, 0, w, h)
      g.strokeStyle = 'rgba(150,115,70,0.22)'
      g.lineWidth = 1.5
      for (let y = 0; y <= h; y += 12) {
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(w, y)
        g.stroke()
      }
    }),
  }
  return KM
}

function kmSkin(tex, rx, ry, extra = {}) {
  const t = tex.clone()
  t.needsUpdate = true
  t.repeat.set(rx, ry)
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, ...extra })
}

/** Turquoise onion cap on a tower of radius r whose top is at y. */
function onionCap(k, x, y, z, r) {
  const profile = [
    [r * 1.02, 0],
    [r * 1.12, r * 0.45],
    [r * 1.0, r * 0.95],
    [r * 0.62, r * 1.45],
    [r * 0.18, r * 1.8],
    [0.01, r * 1.92],
  ].map(([a, b]) => new THREE.Vector2(a, b))
  k.mesh(new THREE.LatheGeometry(profile, 28), new THREE.MeshStandardMaterial({ color: '#1f9a86', roughness: 0.35, metalness: 0.08 }), x, y, z)
}

function kaltaMinorScene(k) {
  const T = kaltaTextures()
  const { m } = k
  const clay = (w, h) => kmSkin(T.clay, Math.max(1, w / 10), Math.max(1, h / 10))

  // Kalta minor: the cone, its plinth and the flat top.
  k.mesh(new THREE.CylinderGeometry(7.6, 7.8, 1.2, 48), clay(48, 1.2), -6, 0.6, -34)
  k.mesh(new THREE.CylinderGeometry(5.1, 7.2, 29, 48), kmSkin(T.minaret, 3, 1, { roughness: 0.35, metalness: 0.05 }), -6, 1.2 + 14.5, -34)
  k.mesh(new THREE.CylinderGeometry(5.2, 5.1, 0.6, 48), new THREE.MeshStandardMaterial({ color: '#e9f1ea', roughness: 0.5 }), -6, 30.5, -34)

  // The city wall on the right: rounded crest, slight batter.
  const wallLen = 46
  k.mesh(new THREE.BoxGeometry(wallLen, 10, 5), clay(wallLen, 10), 26, 5, -30)
  const crest = k.mesh(new THREE.CylinderGeometry(2.5, 2.5, wallLen, 20, 1, false, 0, Math.PI), clay(wallLen, 3), 26, 10, -30)
  crest.rotation.z = Math.PI / 2
  crest.rotation.y = 0
  // A tiled portal behind the wall.
  k.box(18, 16, 4, clay(18, 16), 18, 0, -40)
  k.box(14, 11, 0.4, kmSkin(T.net, 4, 3), 18, 3.5, -37.8)
  k.box(15, 1.6, 0.5, new THREE.MeshStandardMaterial({ color: '#1d4f9a' }), 18, 14, -37.7)

  // The gate: two round towers, a pointed arch between, tile-net tops under onion caps.
  for (const x of [32, 46]) {
    k.mesh(new THREE.CylinderGeometry(2.9, 3.3, 15, 32), clay(18, 15), x, 7.5, -22)
    for (const y of [4, 8, 12]) k.mesh(new THREE.CylinderGeometry(3.05, 3.1, 0.5, 32), m.brickD, x, y, -22)
    k.mesh(new THREE.CylinderGeometry(2.6, 2.7, 6, 32), kmSkin(T.net, 4, 2), x, 18, -22)
    onionCap(k, x, 21, -22, 2.6)
  }
  k.box(11, 13, 5, clay(11, 13), 39, 0, -24)
  k.arch(5.2, 9, m.door, 39, 0, -21.4, 0.3)
  k.arch(6.4, 10, m.brickL, 39, 0, -21.6, 0.2)
  // Small arched windows on the gate block.
  for (const x of [35.8, 42.2]) k.arch(0.9, 1.6, m.niche, x, 10, -21.4, 0.1)

  // On the left: a madrasa with an arcaded upper floor and a capped corner tower.
  k.box(26, 12, 12, clay(26, 12), -40, 0, -26)
  for (let i = 0; i < 6; i++) {
    k.arch(2.4, 3.6, m.tile, -50 + i * 4, 6.6, -19.9, 0.2)
    k.arch(1.9, 3.1, m.niche, -50 + i * 4, 6.8, -19.8, 0.15)
  }
  for (let i = 0; i < 3; i++) k.arch(1.8, 3, m.niche, -48 + i * 8, 0.6, -19.9, 0.15)
  k.mesh(new THREE.CylinderGeometry(1.7, 2, 15, 24), clay(10, 15), -26, 7.5, -21)
  k.mesh(new THREE.CylinderGeometry(1.6, 1.7, 3, 24), kmSkin(T.net, 3, 1), -26, 15.8, -21)
  onionCap(k, -26, 17.3, -21, 1.6)
  // Flat clay houses in front of it.
  k.box(16, 6, 10, clay(16, 6), -36, 0, -12)
  for (const x of [-41, -36, -31]) k.box(1.6, 2, 0.3, m.niche, x, 2, -6.9)
  k.box(16, 0.6, 10.6, m.brickL, -36, 6, -12)

  return { width: 110, height: 34 }
}

function jome(k) {
  const { m } = k
  k.dome(0, 15, -6, 9, 11)
  k.block(-36, 72, 15, 12, m.brick, 0)
  k.arcade(-36, 1.5, 22, 12, 4, 0.05)
  k.arcade(14, 1.5, 22, 12, 4, 0.05)
  k.portal(0, 22, 26, 5)
  k.minaret(-37, 1, 2.2, 30)
  k.minaret(37, 1, 2.2, 30)
  return { width: 84, height: 40 }
}

function mulloQirgiz(k) {
  const { m } = k
  k.dome(-20, 13, -5, 5, 6, { ribbed: true })
  k.dome(20, 13, -5, 5, 6, { ribbed: true })
  k.block(-34, 68, 13, 10, m.brick, 0)
  k.arcade(-34, 1.5, 22, 10, 4, 0.05)
  k.arcade(12, 1.5, 22, 10, 4, 0.05)
  k.portal(0, 20, 24, 5, { spandrel: m.green })
  k.minaret(-34, 1, 1.9, 19, { bands: 2 })
  k.minaret(34, 1, 1.9, 19, { bands: 2 })
  return { width: 80, height: 30 }
}

function xudoyorxon(k) {
  const { m } = k
  k.block(-56, 112, 12, 12, m.tile, 0)
  for (let i = 0; i < 8; i++) k.box(12, 7, 0.3, i % 2 ? m.green : m.turq, -49 + i * 14, 2.5, 0.1)
  k.box(112, 1.6, 0.5, m.lapis, 0, 12.4, 0.1)
  k.portal(0, 24, 25, 6, { spandrel: m.green })
  for (const x of [-56, -32, 32, 56]) k.minaret(x, 1, 1.6, 16, { bands: 2 })
  return { width: 120, height: 30 }
}

function rabotMalik(k) {
  const { m } = k
  k.wall(-34, 68, 9, -4)
  k.block(-15, 30, 24, 10, m.brick, 1)
  for (let i = 0; i < 10; i++) k.mesh(new THREE.CylinderGeometry(0.7, 0.7, 21, 12), i % 2 ? m.brickD : m.brickL, -13.5 + i * 3, 10.5, 1.2)
  k.arch(12, 19, m.niche, 0, 0, 1.6, 0.4)
  return { width: 70, height: 28 }
}

function oqsaroy(k) {
  const { m } = k
  for (const x of [-20, 20]) {
    k.box(16, 38, 12, m.brick, x, 0, -6)
    k.box(13, 30, 0.4, m.lapis, x, 4, 0.1)
    k.box(9, 25, 0.3, m.tile, x, 6.5, 0.35)
    k.box(5, 18, 0.3, m.turq, x, 10, 0.6)
  }
  k.box(4, 6, 10, m.brickD, -11, 38, -6).rotation.z = -0.5
  k.box(4, 6, 10, m.brickD, 11, 38, -6).rotation.z = 0.5
  return { width: 70, height: 46 }
}

function termiziy(k) {
  const { m } = k
  const sand = new THREE.MeshStandardMaterial({ color: '#d8c2a0', roughness: 0.8 })
  k.dome(-14, 10, -4, 8, 9, { mat: sand })
  k.dome(9, 10, -4, 6, 7, { mat: sand })
  k.dome(24, 9, -4, 4.5, 5, { mat: sand })
  k.block(-30, 62, 10, 10, m.brick, 0)
  k.arcade(-30, 1, 62, 7, 8, 0.05)
  k.portal(-15, 18, 20, 5, { spandrel: m.brickD, face: m.brickL, frame: m.brickD })
  return { width: 76, height: 32 }
}

function temurDarvozasi(k) {
  const { m } = k
  k.rock(-28, 14, -4, 18, 22, 14, m.rock, 0.3)
  k.rock(-38, 8, 4, 12, 12, 10, m.rockD, 1)
  k.rock(28, 15, -4, 18, 24, 14, m.rockD, -0.4)
  k.rock(38, 7, 5, 11, 11, 9, m.rock, 0.8)
  k.box(7, 4, 1.4, m.stone, 0, 0, 2)
  k.box(5.6, 1, 1, m.stoneD, 0, 4, 2)
  return { width: 96, height: 46 }
}

function sirdaryoBridge(k) {
  const { m } = k
  for (const [x, w, h] of [[-58, 14, 16], [-40, 10, 24], [-26, 16, 12], [30, 12, 20], [46, 14, 14]]) k.box(w, h, 10, m.white, x + w / 2, 0, -40)
  k.box(140, 0.4, 30, m.water, 0, -0.2, -6)
  // Deck with arched openings cut out of its side.
  const shape = new THREE.Shape()
  shape.moveTo(-62, 0)
  shape.lineTo(62, 0)
  shape.lineTo(62, 13)
  shape.lineTo(-62, 13)
  shape.closePath()
  for (let i = 0; i < 4; i++) {
    const hole = new THREE.Path()
    const cx = -45 + i * 30
    hole.moveTo(cx - 13, 0)
    hole.lineTo(cx - 13, 3)
    hole.quadraticCurveTo(cx - 13, 8.5, cx, 8.5)
    hole.quadraticCurveTo(cx + 13, 8.5, cx + 13, 3)
    hole.lineTo(cx + 13, 0)
    hole.closePath()
    shape.holes.push(hole)
  }
  k.mesh(new THREE.ExtrudeGeometry(shape, { depth: 9, bevelEnabled: false }), m.stone, 0, 0, -9)
  for (let x = -61; x <= 61; x += 3) k.box(0.4, 2.4, 0.4, m.steelD, x, 13, -0.2)
  k.box(124, 0.4, 0.5, m.steelD, 0, 15.4, -0.2)
  return { width: 128, height: 26 }
}

function savitskiy(k) {
  const { m } = k
  k.box(80, 18, 24, m.white, 0, 0, -12)
  k.box(76, 12, 0.4, m.glass, 0, 2.5, 0.1)
  for (let i = 0; i < 12; i++) k.box(1, 12, 0.6, m.white, -37.5 + i * 6.8, 2.5, 0.3)
  k.box(80, 2.4, 0.6, m.red, 0, 15.5, 0.3)
  k.box(16, 7, 0.6, m.door, 0, 0, 0.4)
  return { width: 90, height: 22 }
}

const BUILDERS = {
  samarqand: registon,
  toshkent: teleminora,
  buxoro: poiKalon,
  xiva: kaltaMinorScene,
  andijon: jome,
  namangan: mulloQirgiz,
  fargona: xudoyorxon,
  navoiy: rabotMalik,
  qarshi: oqsaroy,
  termiz: termiziy,
  jizzax: temurDarvozasi,
  guliston: sirdaryoBridge,
  nukus: savitskiy,
}

/** The landmark of `key` as a group facing +z, with its footprint and height in metres. */
export function buildLandmark(key) {
  const group = new THREE.Group()
  const size = (BUILDERS[key] ?? jome)(kit(group), group)
  mergeStatic(group)
  return { group, ...size }
}

/* A landmark is a few hundred parts, but many look exactly alike (same material settings, same
   texture at the same repeat): those are baked into one mesh each, so the whole building draws in
   a few dozen calls instead of a few hundred. What's drawn is the same triangles with the same
   shading. Left alone: transparent parts (they're depth-sorted one by one), mirrored ones (their
   faces would turn inside out) and anything that isn't a plain mesh. */
const ATTRS = ['position', 'normal', 'uv']
const texKey = (t) =>
  t ? `${t.source.uuid}/${t.repeat.x},${t.repeat.y}/${t.offset.x},${t.offset.y}/${t.rotation}/${t.center.x},${t.center.y}/${t.wrapS},${t.wrapT}/${t.colorSpace}/${t.flipY}/${t.anisotropy}` : '-'
const MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap', 'aoMap', 'bumpMap', 'lightMap', 'envMap', 'displacementMap']

function looksKey(mat) {
  if (!mat.isMeshStandardMaterial && !mat.isMeshBasicMaterial) return mat.uuid
  const c = (v) => (v?.isColor ? v.getHexString() : '-')
  return [
    mat.type,
    c(mat.color),
    c(mat.emissive),
    mat.emissiveIntensity,
    mat.roughness,
    mat.metalness,
    mat.opacity,
    mat.side,
    mat.flatShading,
    mat.alphaTest,
    mat.depthWrite,
    mat.depthTest,
    mat.toneMapped,
    mat.vertexColors,
    mat.wireframe,
    mat.fog,
    mat.polygonOffset,
    ...MAPS.map((k) => texKey(mat[k])),
  ].join('|')
}

function mergeStatic(group) {
  group.updateMatrixWorld(true)
  const sets = new Map()
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || o.material.transparent) return
    if (o.matrixWorld.determinant() <= 0 || !ATTRS.every((a) => o.geometry.attributes[a]) || o.geometry.morphAttributes.position) return
    const key = `${looksKey(o.material)}#${o.castShadow}${o.receiveShadow}${o.renderOrder}${o.visible}`
    if (!sets.has(key)) sets.set(key, [])
    sets.get(key).push(o)
  })
  for (const list of sets.values()) {
    if (list.length < 2) continue
    const parts = list.map((o) => {
      const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld)
      for (const name of Object.keys(g.attributes)) if (!ATTRS.includes(name)) g.deleteAttribute(name)
      g.clearGroups()
      return g
    })
    const geometry = mergeGeometries(parts)
    parts.forEach((g) => g.dispose())
    if (!geometry) continue
    const first = list[0]
    const merged = new THREE.Mesh(geometry, first.material)
    merged.castShadow = first.castShadow
    merged.receiveShadow = first.receiveShadow
    merged.renderOrder = first.renderOrder
    for (const o of list) {
      o.removeFromParent()
      o.geometry.dispose()
    }
    group.add(merged)
  }
}
