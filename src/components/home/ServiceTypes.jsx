import { Bus, Car, Heart, Package, Sparkles, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { services } from '../../data/mock'
import { useApp } from '../../context/AppContext'
import { formatSom } from '../../lib/utils'
import { Card } from '../ui/Button'

const icons = {
  car: Car,
  heart: Heart,
  users: Users,
  bus: Bus,
  package: Package,
  sparkles: Sparkles,
}

export function ServiceTypes({ title = 'Xizmat turlari' }) {
  const navigate = useNavigate()
  const { setSearch } = useApp()

  const go = (service) => {
    setSearch((s) => ({ ...s, service: service.id }))
    if (service.id === 'women') navigate('/women')
    else if (service.id === 'cargo') navigate('/cargo')
    else if (service.id === 'standart' || service.id === 'family' || service.id === 'minivan' || service.id === 'premium')
      navigate('/cars')
    else navigate('/results')
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {services.map((service) => {
          const Icon = icons[service.icon] || Car
          return (
            <button key={service.id} type="button" onClick={() => go(service)} className="text-left">
              <Card className="h-full p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-bold">{service.title}</p>
                <p className="mt-1 text-xs text-muted">{service.desc}</p>
                <p className="mt-2 text-xs font-semibold text-brand">{formatSom(service.from)} dan</p>
              </Card>
            </button>
          )
        })}
      </div>
    </section>
  )
}
