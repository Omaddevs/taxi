import { useMemo, useState } from 'react'
import { Box, FileText, ShoppingBag, Smartphone, Utensils } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Input'
import { cargoTypes, cities } from '../data/mock'
import { formatSom } from '../lib/utils'

const icons = { file: FileText, shirt: ShoppingBag, utensils: Utensils, smartphone: Smartphone, box: Box }
const weights = ['1 kg', '5 kg', '10 kg', '20 kg+']

export default function Cargo() {
  const [type, setType] = useState('docs')
  const [weight, setWeight] = useState('5 kg')
  const [from, setFrom] = useState('Qarshi')
  const [to, setTo] = useState('Toshkent')
  const [ok, setOk] = useState(false)

  const price = useMemo(() => {
    const base = { '1 kg': 45000, '5 kg': 75000, '10 kg': 110000, '20 kg+': 180000 }[weight]
    return from === to ? base : base + 40000
  }, [weight, from, to])

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="Yuk jo‘natish" />
      <PageTitle title="Yuk jo‘natish" subtitle="Qabul qiluvchi ma’lumotlari va og‘irlikni kiriting" />

      <Card className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Qayerdan">
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Qayerga">
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">Yuk turi</p>
          <div className="grid grid-cols-5 gap-2">
            {cargoTypes.map((item) => {
              const Icon = icons[item.icon]
              const active = type === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id)}
                  className={`rounded-2xl border px-1 py-3 text-center text-[11px] font-semibold ${
                    active ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white'
                  }`}
                >
                  <Icon className="mx-auto mb-1 h-4 w-4" />
                  {item.title}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">Og‘irlik</p>
          <div className="grid grid-cols-4 gap-2">
            {weights.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWeight(w)}
                className={`rounded-xl py-2 text-sm font-semibold ${weight === w ? 'bg-brand text-white' : 'bg-canvas'}`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <Field label="Qabul qiluvchi ismi">
          <Input placeholder="Ism familiya" defaultValue="Dilnoza Karimova" />
        </Field>
        <Field label="Telefon">
          <Input placeholder="+998" defaultValue="+998 90 777 88 99" />
        </Field>
        <Field label="Izoh">
          <Input placeholder="Yuk haqida qisqacha" />
        </Field>
      </Card>

      <Card className="mt-4 flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted">Taxminiy narx</p>
          <p className="text-xl font-extrabold">{formatSom(price)}</p>
        </div>
        <Button
          onClick={() => {
            setOk(true)
            setTimeout(() => setOk(false), 2500)
          }}
        >
          Jo‘natishni tasdiqlash
        </Button>
      </Card>
      {ok ? <p className="mt-3 text-center text-sm font-semibold text-success">Buyurtma qabul qilindi</p> : null}
    </div>
  )
}
