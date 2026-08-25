export const UZ_BOUNDS = [
  [37.1, 55.9],
  [45.6, 73.2],
]

// Asosiy shahar va viloyat markazlari — marshrutni xaritada belgilash uchun.
export const UZ_CITIES = {
  toshkent: { name: 'Toshkent', lat: 41.2995, lng: 69.2401 },
  samarqand: { name: 'Samarqand', lat: 39.627, lng: 66.975 },
  buxoro: { name: 'Buxoro', lat: 39.7681, lng: 64.4556 },
  qarshi: { name: 'Qarshi', lat: 38.8606, lng: 65.7891 },
  andijon: { name: 'Andijon', lat: 40.7821, lng: 72.3442 },
  namangan: { name: 'Namangan', lat: 40.9983, lng: 71.6726 },
  fargona: { name: 'Farg‘ona', lat: 40.3864, lng: 71.7864 },
  qoqon: { name: 'Qo‘qon', lat: 40.5286, lng: 70.9425 },
  margilon: { name: 'Marg‘ilon', lat: 40.4712, lng: 71.7243 },
  navoiy: { name: 'Navoiy', lat: 40.0844, lng: 65.3792 },
  jizzax: { name: 'Jizzax', lat: 40.1158, lng: 67.842 },
  guliston: { name: 'Guliston', lat: 40.4897, lng: 68.7842 },
  sirdaryo: { name: 'Sirdaryo', lat: 40.8372, lng: 68.6608 },
  nukus: { name: 'Nukus', lat: 42.4531, lng: 59.6103 },
  urganch: { name: 'Urganch', lat: 41.5504, lng: 60.6317 },
  xiva: { name: 'Xiva', lat: 41.3783, lng: 60.3639 },
  xorazm: { name: 'Xorazm', lat: 41.5504, lng: 60.6317 },
  termiz: { name: 'Termiz', lat: 37.2242, lng: 67.2783 },
  denov: { name: 'Denov', lat: 38.2761, lng: 67.8931 },
  shahrisabz: { name: 'Shahrisabz', lat: 39.0578, lng: 66.8339 },
  chirchiq: { name: 'Chirchiq', lat: 41.4689, lng: 69.5822 },
  angren: { name: 'Angren', lat: 41.0167, lng: 70.1436 },
  olmaliq: { name: 'Olmaliq', lat: 40.8447, lng: 69.5983 },
  zarafshon: { name: 'Zarafshon', lat: 41.5775, lng: 64.2028 },
  nurota: { name: 'Nurota', lat: 40.5606, lng: 65.6875 },
  kattaqorgon: { name: 'Kattaqo‘rg‘on', lat: 39.8994, lng: 66.2589 },
  bekobod: { name: 'Bekobod', lat: 40.2206, lng: 69.2694 },
}

const ALIASES = {
  tashkent: 'toshkent',
  toshkentshahri: 'toshkent',
  samarkand: 'samarqand',
  bukhara: 'buxoro',
  karshi: 'qarshi',
  kashkadarya: 'qarshi',
  qashqadaryo: 'qarshi',
  andijan: 'andijon',
  ferghana: 'fargona',
  fergana: 'fargona',
  kokand: 'qoqon',
  margilan: 'margilon',
  navoi: 'navoiy',
  jizzakh: 'jizzax',
  gulistan: 'guliston',
  syrdarya: 'sirdaryo',
  khiva: 'xiva',
  urgench: 'urganch',
  khorezm: 'xorazm',
  termez: 'termiz',
  qoraqalpogiston: 'nukus',
  karakalpakstan: 'nukus',
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[‘’'`ʻ]/g, '')
    .replace(/[^a-zа-яё]/gi, '')
}

export function findCity(value) {
  const slug = slugify(value)
  if (!slug) return null
  const key = ALIASES[slug] || slug
  if (UZ_CITIES[key]) return UZ_CITIES[key]
  // "Toshkent shahri, Yunusobod" kabi qiymatlarda shahar nomini qidiramiz.
  const hit = Object.keys(UZ_CITIES).find((k) => slug.startsWith(k) || slug.includes(k))
  return hit ? UZ_CITIES[hit] : null
}
