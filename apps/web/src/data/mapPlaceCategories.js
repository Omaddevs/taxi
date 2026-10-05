// Same labels/colours as the admin panel's "Xarita joylari" (apps/admin/src/lib/mapPlaces.ts).
export const MAP_PLACE_CATEGORIES = [
  { id: 'FUEL', label: 'Yoqilg‘i', color: '#f97316' },
  { id: 'SERVICE', label: 'Avtoservis', color: '#16a34a' },
  { id: 'WASH', label: 'Moyka', color: '#0ea5e9' },
  { id: 'PARKING', label: 'Parking', color: '#14b8a6' },
  { id: 'EV', label: 'EV zaryad', color: '#7c3aed' },
  { id: 'FOOD', label: 'Oshxona', color: '#e11d48' },
  { id: 'HELP', label: 'Yordam', color: '#64748b' },
  { id: 'OTHER', label: 'Boshqa', color: '#2563eb' },
]

export const MAP_PLACE_CATEGORY = Object.fromEntries(MAP_PLACE_CATEGORIES.map((c) => [c.id, c]))
