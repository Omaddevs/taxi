// Turns fetch-osm.mjs output into public/places/<regionId>.json:
//   { "<tuman name from REGIONS>": [["<qishloq/mahalla>", lat, lng, "q" | "m" | "t"], …], … }
// q — qishloq, m — mahalla, t — shaharcha. RegionPicker loads one file when a viloyat is opened.
//
//   node scripts/places/build.mjs <cacheDir>
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { REGIONS } from '../../src/data/uzbekistan.js'

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/places')

const CYR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '’', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ғ: 'g‘', қ: 'q', ҳ: 'h', ў: 'o‘', ә: 'a', ө: 'o‘', ү: 'u', ң: 'ng', і: 'i',
}
// Qoraqalpoq lotin yozuvi → o‘zbek lotin.
const KAA = { ń: 'n', ı: 'i', ó: 'o‘', ú: 'u', á: 'a', ǵ: 'g‘', Ń: 'N', Ó: 'O‘', Ú: 'U', Á: 'A', Ǵ: 'G‘' }

function toLatin(value) {
  let out = ''
  for (const ch of value) {
    const lower = ch.toLowerCase()
    if (CYR[lower] !== undefined) {
      const lat = CYR[lower]
      out += ch === lower ? lat : lat.charAt(0).toUpperCase() + lat.slice(1)
    } else out += KAA[ch] ?? ch
  }
  return out
}

function tidy(value) {
  return toLatin(value)
    .replace(/([oOgG])[ʻʼ'`’‘´]/g, '$1‘')
    .replace(/[ʻʼ'`´]/g, '’')
    .replace(/\s+/g, ' ')
    .trim()
}

const isCyrillic = (s) => /[А-яЁёҒғҚқҲҳЎўӘәӨөҮүҢң]/.test(s)

function placeName(tags) {
  const candidates = [tags['name:uz'], tags['name:uz-Latn'], tags.name, tags['name:en'], tags['name:ru']]
  const latin = candidates.find((n) => n && !isCyrillic(n))
  return tidy(latin || candidates.find(Boolean))
}

const SUFFIX =
  /\b(tumani|tuman|rayoni|rayonı|rayon|shahri|shahar|shaxri|district|city|район|город|туман|тумани|шаҳри|шахри)\b/gi

function key(value) {
  return tidy(value)
    .toLowerCase()
    .replace(SUFFIX, ' ')
    .replace(/[‘’]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isCityName(value) {
  return /\b(shahri|shahar|shaxri|city)\b|город|шаҳри|шахри/i.test(value) && !/tuman|район/i.test(value)
}

function districtNames(tags) {
  return [tags['name:uz'], tags['name:uz-Latn'], tags.name, tags['name:en'], tags['name:ru']].filter(Boolean)
}

function lev(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

// OSMda yangi nom bilan turgan tumanlar: bizdagi nom → OSM kaliti.
const ALIASES = { 'Bo‘z': 'boston' }

// Matches an OSM tuman/shahar relation to one of our district names in the same viloyat.
function matchDistrict(tags, ours) {
  const names = districtNames(tags)
  const city = names.some(isCityName)
  const pool = ours.filter((d) => /shahri$/.test(d) === city)
  const keys = names.map(key).filter(Boolean)
  const exact = pool.find((d) => keys.includes(key(d)) || keys.includes(ALIASES[d]))
  if (exact) return exact
  let best = null
  let bestDist = 3
  for (const d of pool) {
    for (const k of keys) {
      const dist = lev(key(d), k)
      if (dist < bestDist) [best, bestDist] = [d, dist]
    }
  }
  return best
}

// Qaysi yozilish qoldiriladi: name:uz va o‘zbekcha harflar (o‘, g‘) afzal, ruscha transliteratsiya (kh, dj) emas.
function nameScore(tags, name) {
  return (tags['name:uz'] ? 2 : 0) + (/[‘’]/.test(name) ? 1 : 0) - (/kh|dj|ts/i.test(name) ? 1 : 0)
}

function looseKey(name) {
  // Undoshlar "skeleti": Dehqonobod, Dexkonobod → dxknbd.
  const skeleton = key(name)
    .replace(/ /g, '')
    .replace(/kh|h/g, 'x')
    .replace(/q/g, 'k')
    .replace(/dj/g, 'j')
    .replace(/[aeiouy]/g, '')
    .replace(/(.)\1+/g, '$1')
  return skeleton || key(name)
}

function km([, lat1, lng1], [, lat2, lng2]) {
  const dLat = (lat2 - lat1) * 111
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180)
  return Math.hypot(dLat, dLng)
}

const KIND = { neighbourhood: 'm', quarter: 'm', suburb: 'm', town: 't' }

const cacheDir = process.argv[2]
if (!cacheDir) throw new Error('usage: build.mjs <cacheDir>')
await mkdir(OUT_DIR, { recursive: true })

let total = 0
for (const region of REGIONS) {
  const file = path.join(cacheDir, `${region.id}.json`)
  if (!existsSync(file)) {
    console.log(`${region.id}: kesh yo‘q, o‘tkazib yuborildi`)
    continue
  }
  const raw = JSON.parse(await readFile(file, 'utf8'))
  const out = {}
  const unmatched = []
  let current = null
  for (const e of raw.elements) {
    if (e.type === 'relation' && e.tags?.admin_level === '6') {
      current = matchDistrict(e.tags, region.districts)
      if (!current) unmatched.push(districtNames(e.tags)[0])
      else out[current] ||= []
      continue
    }
    if (!current) continue
    const lat = e.lat ?? e.center?.lat
    const lng = e.lon ?? e.center?.lon
    if (lat == null || lng == null) continue
    const name = placeName(e.tags)
    if (!name || key(name) === key(current)) continue
    const kind = /\b(mfy|mahalla|mahallasi)\b/i.test(name) ? 'm' : KIND[e.tags.place] || 'q'
    const row = [name, Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5, kind]
    out[current].push({ row, score: nameScore(e.tags, name) })
  }
  for (const [district, list] of Object.entries(out)) {
    // Bitta qishloq OSMda bir necha marta, har xil transliteratsiyada uchraydi (Baxmal / Bahmal).
    const kept = []
    for (const { row } of list.sort((a, b) => b.score - a.score)) {
      const k = looseKey(row[0])
      if (kept.some((r) => looseKey(r[0]) === k && km(r, row) < 3)) continue
      kept.push(row)
    }
    out[district] = kept.sort((a, b) => a[0].localeCompare(b[0], 'uz'))
    if (!out[district].length) delete out[district]
  }
  const count = Object.values(out).reduce((n, l) => n + l.length, 0)
  total += count
  const missing = region.districts.filter((d) => !out[d])
  console.log(`${region.id}: ${count} joy, ${Object.keys(out).length}/${region.districts.length} tuman`)
  if (unmatched.length) console.log(`  OSM, mos kelmadi: ${unmatched.join('; ')}`)
  if (missing.length) console.log(`  bo‘sh: ${missing.join('; ')}`)
  await writeFile(path.join(OUT_DIR, `${region.id}.json`), JSON.stringify(out))
}
console.log(`jami: ${total}`)
