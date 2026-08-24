import {
  Fuel,
  Heart,
  Map,
  Package,
  Phone,
  ShowerHead,
  Siren,
  SquareParking,
  Utensils,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react'

const icons = {
  women: Heart,
  delivery: Package,
  roadside: Siren,
  map: Map,
  fuel: Fuel,
  service: Wrench,
  wash: ShowerHead,
  parking: SquareParking,
  ev: Zap,
  food: Utensils,
  wallet: Wallet,
  sos: Phone,
}

export function EcosystemIcon({ id, className = 'h-6 w-6' }) {
  const Icon = icons[id]
  if (!Icon) return null
  return <Icon className={className} strokeWidth={1.75} />
}
