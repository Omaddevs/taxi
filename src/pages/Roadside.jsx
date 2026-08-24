import { useState } from 'react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { roadside } from '../data/ecosystem'

export default function Roadside() {
  const [picked, setPicked] = useState(null)
  const [sent, setSent] = useState(false)

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader title="Yo‘lda yordam" subtitle="Usta, evakuator, shina, yoqilg‘i" />
      <PageTitle title="Yo‘lda yordam" subtitle="Joylashuvingizga eng yaqin mutaxassis" />

      <Card className="mb-4 bg-red-50 p-4">
        <p className="font-bold text-red-600">🚨 Favqulodda holatda SOS ni bosing</p>
        <p className="mt-1 text-sm text-muted">YTH yoki xavf bo‘lsa joylashuv ishonchli kontaktlarga yuboriladi.</p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {roadside.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPicked(item.id)}
            className={`rounded-2xl border p-4 text-left ${picked === item.id ? 'border-brand bg-brand-soft' : 'border-line bg-white'}`}
          >
            <span className="text-2xl">{item.emoji}</span>
            <p className="mt-2 text-sm font-bold">{item.title}</p>
            <p className="text-xs text-muted">{item.desc}</p>
          </button>
        ))}
      </div>

      <Button
        className="mt-5 w-full"
        disabled={!picked}
        onClick={() => {
          setSent(true)
          setTimeout(() => setSent(false), 2500)
        }}
      >
        Yordam chaqirish
      </Button>
      {sent ? <p className="mt-3 text-center text-sm font-semibold text-success">Buyurtma yuborildi. 8–12 daqiqada bog‘lanamiz.</p> : null}
    </div>
  )
}
