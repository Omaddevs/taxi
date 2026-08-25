import { NEAR_KM, around, googleMapsUrl, yandexMapsUrl } from '../lib/geo'

export { NEAR_KM, googleMapsUrl, yandexMapsUrl }

export const FUEL_TYPES = [
  { id: 'all', label: 'Barchasi' },
  { id: 'benzin', label: 'Benzin' },
  { id: 'metan', label: 'Metan' },
  { id: 'propan', label: 'Propan' },
  { id: 'dizel', label: 'Dizel' },
  { id: 'salarka', label: 'Salarka' },
  { id: 'ev', label: 'Elektr' },
]

export const PRICE_LABELS = {
  'AI-80': 'AI-80',
  'AI-92': 'AI-92',
  'AI-95': 'AI-95',
  metan: 'Metan',
  propan: 'Propan',
  dizel: 'Dizel',
  salarka: 'Salarka',
  kwh: 'kWh',
}

export const FUEL_TYPE_LABEL = {
  benzin: 'Benzin',
  metan: 'Metan gaz',
  propan: 'Propan',
  dizel: 'Dizel',
  salarka: 'Salarka',
  ev: 'EV',
}

const STATIONS = [
  {
    id: 'f1',
    name: 'TaxiLine Oil · Nasaf',
    address: 'Nasaf ko‘chasi, 45',
    hours: '24/7',
    phone: '+998 75 221 45 01',
    open: true,
    dLat: 0.006,
    dLng: 0.004,
    types: ['benzin', 'dizel', 'salarka'],
    prices: { 'AI-80': 10800, 'AI-92': 12500, 'AI-95': 13900, dizel: 11900, salarka: 10400 },
  },
  {
    id: 'f2',
    name: 'Humo Metan',
    address: 'Mustaqillik shohko‘chasi, 12',
    hours: '06:00–23:00',
    phone: '+998 75 221 45 02',
    open: true,
    dLat: -0.004,
    dLng: 0.007,
    types: ['metan'],
    prices: { metan: 3850 },
  },
  {
    id: 'f3',
    name: 'Propan 24',
    address: 'Ibn Sino ko‘chasi, 8',
    hours: '24/7',
    phone: '+998 75 221 45 03',
    open: true,
    dLat: 0.01,
    dLng: -0.006,
    types: ['propan'],
    prices: { propan: 6200 },
  },
  {
    id: 'f4',
    name: 'EV Fast Charge',
    address: 'Amir Temur bog‘i yonida',
    hours: '24/7',
    phone: '+998 75 221 45 04',
    open: true,
    dLat: -0.007,
    dLng: -0.003,
    types: ['ev'],
    prices: { kwh: 1800 },
  },
  {
    id: 'f5',
    name: 'Uzbekneftegaz Qarshi',
    address: 'Shahrisabz yo‘li, 2-km',
    hours: '24/7',
    phone: '+998 75 221 45 05',
    open: true,
    dLat: 0.018,
    dLng: 0.012,
    types: ['benzin', 'dizel', 'metan'],
    prices: { 'AI-92': 12300, 'AI-95': 13700, dizel: 11750, metan: 3900 },
  },
  {
    id: 'f6',
    name: 'Salarka Hub',
    address: 'Sanoat zonasi, 7-yo‘lak',
    hours: '05:00–22:00',
    phone: '+998 75 221 45 06',
    open: true,
    dLat: 0.022,
    dLng: -0.015,
    types: ['salarka', 'dizel'],
    prices: { salarka: 9900, dizel: 11600 },
  },
  {
    id: 'f7',
    name: 'ChargePoint · Mall',
    address: 'Qarshi Mega, 1-qavat parking',
    hours: '08:00–23:00',
    phone: '+998 75 221 45 07',
    open: true,
    dLat: -0.012,
    dLng: 0.016,
    types: ['ev'],
    prices: { kwh: 1650 },
  },
  {
    id: 'f8',
    name: 'Lukoil Benzin',
    address: 'Buxoro yo‘li, 18',
    hours: '24/7',
    phone: '+998 75 221 45 08',
    open: true,
    dLat: 0.028,
    dLng: 0.021,
    types: ['benzin'],
    prices: { 'AI-80': 10950, 'AI-92': 12650, 'AI-95': 14100 },
  },
  {
    id: 'f9',
    name: 'CNG + LPG Park',
    address: 'Koson yo‘nalishi, 4-km',
    hours: '24/7',
    phone: '+998 75 221 45 09',
    open: false,
    dLat: -0.026,
    dLng: 0.024,
    types: ['metan', 'propan'],
    prices: { metan: 3750, propan: 6100 },
  },
  {
    id: 'f10',
    name: 'Dizel Express',
    address: 'Yuk terminali oldi',
    hours: '24/7',
    phone: '+998 75 221 45 10',
    open: true,
    dLat: 0.032,
    dLng: -0.02,
    types: ['dizel', 'salarka'],
    prices: { dizel: 11500, salarka: 9800 },
  },
  {
    id: 'f11',
    name: 'TaxiLine Energy',
    address: 'Ring yo‘l, 9-chiqish',
    hours: '24/7',
    phone: '+998 75 221 45 11',
    open: true,
    dLat: -0.03,
    dLng: -0.018,
    types: ['benzin', 'dizel', 'metan', 'ev'],
    prices: { 'AI-92': 12400, 'AI-95': 13850, dizel: 11800, metan: 3800, kwh: 1700 },
  },
  {
    id: 'f12',
    name: 'Qarluqbog‘ot Metan',
    address: 'Elbek ko‘chasi, 3',
    hours: '06:00–00:00',
    phone: '+998 75 221 45 12',
    open: true,
    dLat: 0.003,
    dLng: -0.011,
    types: ['metan', 'propan'],
    prices: { metan: 3700, propan: 6050 },
  },
]

export function stationsAround(origin) {
  return around(origin, STATIONS).map((s) => ({
    ...s,
    group: 'fuel',
    mapLabel: FUEL_TYPE_LABEL[s.types[0]] || 'Yoqilg‘i',
  }))
}

export function shareText(station) {
  const prices = Object.entries(station.prices)
    .map(([k, v]) => `${PRICE_LABELS[k] || k}: ${v.toLocaleString('uz-UZ')} so‘m`)
    .join('\n')
  return `${station.name}\n${station.address}\n${prices}\n${googleMapsUrl(station.lat, station.lng)}`
}
