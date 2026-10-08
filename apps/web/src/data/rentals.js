import { Bike, Motorbike, Scooter, Zap } from 'lucide-react'

// Same ids/labels as the admin panel's "Skuter ijara" (apps/admin/src/lib/rentals.ts).
export const VEHICLE_TYPES = [
  { id: 'SCOOTER', label: 'Skuter', icon: Motorbike },
  { id: 'E_SCOOTER', label: 'Elektr samokat', icon: Scooter },
  { id: 'BICYCLE', label: 'Velosiped', icon: Bike },
  { id: 'E_BIKE', label: 'Elektr velosiped', icon: Zap },
  { id: 'MOTORCYCLE', label: 'Mototsikl', icon: Motorbike },
]

export const VEHICLE_TYPE = Object.fromEntries(VEHICLE_TYPES.map((t) => [t.id, t]))

export const OWNER_LABEL = { COMPANY: 'Tashkilot', PERSON: 'Shaxsiy' }

export const RENT_SCOOTER_COLOR = '#00b5c2'
