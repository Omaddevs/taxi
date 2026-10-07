import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, Battery, Disc, Fuel, Key, TriangleAlert, Truck, Wrench } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { roadside } from '../data/ecosystem'
import { DriverHeader } from './driver/ui'
import { cn } from '../lib/utils'
import { SOS_ENABLED } from '../lib/features'

const ICONS = {
  usta: Wrench,
  tow: Truck,
  battery: Battery,
  tire: Disc,
  fuel: Fuel,
  key: Key,
  crash: TriangleAlert,
  diag: Wrench,
}

export default function Roadside() {
  const inDriver = useLocation().pathname.startsWith('/driver')
  const [picked, setPicked] = useState(null)
  const [sent, setSent] = useState(false)

  return (
    <div className={inDriver ? 'overflow-x-clip bg-canvas' : 'mx-auto max-w-3xl'}>
      {inDriver ? (
        <DriverHeader title="Yo‘lda yordam" />
      ) : (
        <ScreenHeader title="Yo‘lda yordam" subtitle="Usta, evakuator, shina, yoqilg‘i" />
      )}
      {inDriver ? null : <PageTitle title="Yo‘lda yordam" subtitle="Joylashuvingizga eng yaqin mutaxassis" />}

      <div className={inDriver ? 'px-5 pb-6 pt-4' : ''}>
        {inDriver ? (
          <p className="mb-4 text-sm leading-5 text-muted">Joylashuvingizga eng yaqin mutaxassis</p>
        ) : null}

        <Card className="mb-5 flex items-start gap-3 border-red-100 bg-red-50 px-4 py-3.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-red-600 shadow-sm">
            <AlertTriangle className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[15px] font-bold leading-snug text-red-600">
              {SOS_ENABLED ? 'Favqulodda holatda SOS ni bosing' : 'Favqulodda holatda 112 ga qo‘ng‘iroq qiling'}
            </p>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              {SOS_ENABLED
                ? 'YTH yoki xavf bo‘lsa joylashuv ishonchli kontaktlarga yuboriladi.'
                : 'YTH yoki xavf bo‘lsa darhol 112 yagona xizmatiga murojaat qiling. SOS tugmasi tez orada qo‘shiladi.'}
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2.5">
          {roadside.map((item) => {
            const Icon = ICONS[item.id] ?? Wrench
            const active = picked === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPicked(item.id)}
                className={cn(
                  'flex min-h-[112px] flex-col rounded-[20px] border p-3 text-left transition-all active:scale-[0.98]',
                  active
                    ? 'border-brand bg-brand-soft shadow-[0_8px_20px_rgba(0,199,212,0.14)]'
                    : 'border-line bg-white shadow-[0_6px_18px_rgba(28,28,40,0.04)]',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl',
                    active ? 'bg-white text-brand' : 'bg-brand-soft text-brand',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </span>
                <p className="mt-2.5 text-[13px] font-bold leading-tight text-ink">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">{item.desc}</p>
              </button>
            )
          })}
        </div>

        <Button
          size="lg"
          className="mt-6 w-full"
          disabled={!picked}
          onClick={() => {
            setSent(true)
            setTimeout(() => setSent(false), 2500)
          }}
        >
          Yordam chaqirish
        </Button>
        {sent ? (
          <p className="mt-3 text-center text-sm font-semibold text-success">Buyurtma yuborildi. 8–12 daqiqada bog‘lanamiz.</p>
        ) : null}
      </div>
    </div>
  )
}
