// Downloads every village, hamlet and mahalla in Uzbekistan from OpenStreetMap (Overpass API),
// grouped by viloyat → tuman. Raw responses go to the cache dir so build.mjs can be rerun offline.
//
//   node scripts/places/fetch-osm.mjs <cacheDir> [regionId…]   (ids berilsa — faqat shu viloyatlar)
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const MIRRORS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

// OSM admin_level=4 relations → REGIONS id in src/data/uzbekistan.js.
// Qoraqalpog‘iston has no admin_level=4 relation; its tumans are whatever is left over.
const REGION_RELATIONS = {
  andijon: 178016,
  namangan: 178017,
  fargona: 178018,
  xorazm: 196242,
  navoiy: 196246,
  surxondaryo: 196248,
  samarqand: 196249,
  'toshkent-vil': 196251,
  sirdaryo: 196253,
  jizzax: 196254,
  buxoro: 1670973,
  qashqadaryo: 1670974,
  'toshkent-sh': 2216724,
}

const PLACE_RE = '^(town|village|hamlet|isolated_dwelling|suburb|quarter|neighbourhood)$'

function districtsWithPlaces(selector) {
  return `[out:json][timeout:600];
${selector}
foreach->.d(
  .d out tags;
  .d map_to_area->.a;
  nwr(area.a)[place~"${PLACE_RE}"][name];
  out tags center;
);`
}

async function overpass(query) {
  for (let attempt = 0; attempt < 9; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length]
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'taxiline-places-build' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(660_000),
      })
      const text = await res.text()
      // Mirror hali hududlarni hisoblamagan bo‘lsa, bo‘sh javob qaytaradi — boshqasini sinaymiz.
      const data = res.ok && text.trimStart().startsWith('{') ? JSON.parse(text) : null
      if (data?.elements?.length) return data
      console.warn(`  ${url} → ${res.status}${data ? ' (bo‘sh)' : ''}`)
    } catch (err) {
      console.warn(`  ${url} → ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)))
  }
  throw new Error('Overpass: all mirrors failed')
}

async function cached(file, query) {
  if (existsSync(file)) return JSON.parse(await readFile(file, 'utf8'))
  const data = await overpass(query)
  await writeFile(file, JSON.stringify(data))
  return data
}

const cacheDir = process.argv[2]
if (!cacheDir) throw new Error('usage: fetch-osm.mjs <cacheDir>')
await mkdir(cacheDir, { recursive: true })

const only = process.argv.slice(3)
const wanted = (id) => !only.length || only.includes(id)

const seen = new Set()
for (const [id, rel] of Object.entries(REGION_RELATIONS)) {
  if (!wanted(id)) continue
  console.log(`${id}…`)
  const data = await cached(
    path.join(cacheDir, `${id}.json`),
    districtsWithPlaces(`rel(${rel});map_to_area->.r;rel(area.r)[boundary=administrative][admin_level=6];`),
  )
  for (const e of data.elements) if (e.type === 'relation' && e.tags?.admin_level === '6') seen.add(e.id)
}

if (wanted('qoraqalpoq')) {
  console.log('qoraqalpoq…')
  const all = await cached(
    path.join(cacheDir, '_districts.json'),
    `[out:json][timeout:300];rel(196240);map_to_area->.uz;rel(area.uz)[boundary=administrative][admin_level=6];out tags;`,
  )
  const rest = all.elements.filter((e) => !seen.has(e.id)).map((e) => e.id)
  await cached(path.join(cacheDir, 'qoraqalpoq.json'), districtsWithPlaces(`rel(id:${rest.join(',')});`))
}
console.log('done')
