import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { payments } from '../data/mock'
import { formatSom } from '../lib/utils'
import { useApp } from '../context/AppContext'

export default function Payment() {
  const { paymentMethod, setPaymentMethod, booked, search } = useApp()
  const navigate = useNavigate()
  const price = booked?.price || 350000

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title="To‘lov" />
      <PageTitle title="To‘lov" subtitle="Qulay usulni tanlang va tasdiqlang" />

      <Card className="divide-y divide-line">
        {payments.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPaymentMethod(item.id)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-extrabold ${paymentMethod === item.id ? 'bg-brand text-white' : 'bg-canvas text-brand'}`}>
              {item.title.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">{item.title}</span>
              <span className="text-xs text-muted">{item.subtitle}</span>
            </span>
            {paymentMethod === item.id ? <Check className="h-5 w-5 text-brand" /> : null}
          </button>
        ))}
      </Card>

      <Card className="mt-4 p-4">
        <p className="text-sm font-semibold">
          {booked ? `${booked.from} → ${booked.to}` : `${search.from} → ${search.to}`}
        </p>
        <p className="mt-2 text-2xl font-extrabold">{formatSom(price)}</p>
      </Card>

      <Button
        size="lg"
        className="mt-4 w-full"
        onClick={() => navigate(booked ? `/trip/${booked.id}` : '/history')}
      >
        To‘lovni tasdiqlash
      </Button>
    </div>
  )
}
