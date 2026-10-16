// Car models a passenger can ask for. `tier` is the class shown above the model name.
export const CARS = [
  { id: 'spark', title: 'Chevrolet Spark', tier: 'Ekonom', photo: '/cars/models/spark.png?v=2' },
  { id: 'nexia', title: 'Daewoo Nexia', tier: 'Ekonom', photo: '/cars/models/nexia.png?v=2' },
  { id: 'nexia-r3', title: 'Nexia R3', tier: 'Ekonom', photo: '/cars/models/nexia-r3.png?v=2' },
  { id: 'cobalt', title: 'Chevrolet Cobalt', tier: 'Komfort', photo: '/cars/models/cobalt.png?v=2' },
  { id: 'gentra', title: 'Chevrolet Gentra', tier: 'Komfort', photo: '/cars/models/gentra.png?v=2' },
  { id: 'lacetti', title: 'Chevrolet Lacetti', tier: 'Komfort', photo: '/cars/models/lacetti.png?v=2' },
  { id: 'malibu-xl', title: 'Chevrolet Malibu XL', tier: 'Biznes', photo: '/cars/models/malibu-xl.png?v=2' },
  { id: 'captiva', title: 'Chevrolet Captiva', tier: 'Biznes', photo: '/cars/models/captiva.png?v=2' },
]

// "Farqi yo‘q" (any car) — the TaxiLine car.
export const ANY_CAR_PHOTO = '/landing/taxi-car-sm.webp'

// How a model is written in the wild — the picker's titles, and drivers' own "Nexia 3", "Kobalt"…
// The more specific names come first (Nexia R3 before Nexia).
const MODEL_PATTERNS = [
  ['nexia-r3', /nexia\s*-?\s*(r\s*3|3)\b/],
  ['malibu-xl', /malibu/],
  ['spark', /spark/],
  ['nexia', /nexia/],
  ['cobalt', /[ck]obalt/],
  ['gentra', /gentra/],
  ['lacetti', /lacetti|lasetti/],
  ['captiva', /captiva|kaptiva/],
]

/** The catalogue car a free-text model name means, or null ("Farqi yo‘q", unknown models). */
export function carForModel(name) {
  const key = String(name || '').toLowerCase()
  if (!key) return null
  const hit = MODEL_PATTERNS.find(([, re]) => re.test(key))
  return hit ? CARS.find((c) => c.id === hit[0]) : null
}

/** The picture for a model name: its catalogue photo, else the TaxiLine car. */
export const carPhotoFor = (name) => carForModel(name)?.photo || ANY_CAR_PHOTO
