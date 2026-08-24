import { useState } from 'react'
import { ArrowLeft, Navigation } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/ui/Button'
import { RouteMap } from '../components/trip/RouteMap'
import { formatSom } from '../lib/utils'
import { trips } from '../data/mock'

export default function DriverApp() {
  const navigate = useNavigate()
  const [online, setOnline] = useState(true)
  const [order, setOrder] = useState(trips[0])
  const [accepted, setAccepted] = useState(false)

  return (
    <div className="min-h-svh bg-canvas">
      <header className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={() => navigate('/')} className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-bold">Haydovchi ilovasi</p>
        <button
          type="button"
          onClick={() => setOnline((v) => !v)}
          className={`rounded-full px-3 py-1 text-xs font-bold ${online ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-ink'}`}
        >
          {online ? 'Online' : 'Offline'}
        </button>
      </header>

      <div className="px-4">
        <Card className="bg-ink p-4 text-white">
          <p className="text-xs text-white/70">Bugungi daromad</p>
          <p className="mt-1 text-2xl font-extrabold">{formatSom(420000)}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white/10 py-2">
              <p className="font-bold">6</p>
              <p className="text-white/60">Safar</p>
            </div>
            <div className="rounded-xl bg-white/10 py-2">
              <p className="font-bold">4.9</p>
              <p className="text-white/60">Reyting</p>
            </div>
            <div className="rounded-xl bg-white/10 py-2">
              <p className="font-bold">7.2s</p>
              <p className="text-white/60">Onlayn</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 px-4">
        <RouteMap className="h-56" from={order.from} to={order.to} />
      </div>

      {online && order ? (
        <div className="fixed inset-x-0 bottom-0 p-4">
          <Card className="p-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-brand">{accepted ? 'Faol buyurtma' : 'Yangi buyurtma'}</p>
                <p className="mt-1 text-lg font-extrabold">
                  {order.from} → {order.to}
                </p>
                <p className="text-sm text-muted">
                  {order.time} · {order.seats} yo‘lovchi · {order.car}
                </p>
              </div>
              <p className="text-lg font-extrabold text-brand">{formatSom(order.price)}</p>
            </div>
            {accepted ? (
              <Button className="mt-4 w-full">
                <Navigation className="h-4 w-4" /> Navigatsiyani ochish
              </Button>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="soft" className="text-red-500" onClick={() => setOrder(null)}>
                  Rad etish
                </Button>
                <Button onClick={() => setAccepted(true)}>Qabul qilish</Button>
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  )
}
