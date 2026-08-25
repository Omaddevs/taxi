import { useMemo, useState } from 'react'
import { ArrowDownUp, Box, FileText, Flag, MapPin, ShoppingBag, Smartphone, Utensils } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Input'
import { RegionPicker } from '../components/ui/SearchPickers'
import { cargoTypes } from '../data/mock'
import { formatSom } from '../lib/utils'

function formatAmount(n) {
  if (!n) return ''
  return new Intl.NumberFormat('uz-UZ').format(n).replace(/,/g, ' ')
}

function parseAmount(raw) {
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return 0
  return Number(digits.slice(0, 9))
}

const icons = { file: FileText, shirt: ShoppingBag, utensils: Utensils, smartphone: Smartphone, box: Box }
const weights = ['1 kg', '5 kg', '10 kg', '20 kg+']

export default function Cargo() {
  const [type, setType] = useState('docs')
  const [weight, setWeight] = useState('5 kg')
  const [route, setRoute] = useState({
    fromRegion: 'Qashqadaryo',
    fromPlace: 'Qarshi shahri',
    from: 'Qashqadaryo, Qarshi shahri',
    toRegion: 'Toshkent shahri',
    toPlace: 'Yunusobod',
    to: 'Toshkent shahri, Yunusobod',
  })
  const [open, setOpen] = useState(null)
  const [ok, setOk] = useState(false)
  const [amount, setAmount] = useState(115000)

  const suggested = useMemo(() => {
    const base = { '1 kg': 45000, '5 kg': 75000, '10 kg': 110000, '20 kg+': 180000 }[weight]
    return route.fromRegion === route.toRegion ? base : base + 40000
  }, [weight, route.fromRegion, route.toRegion])

  const quick = useMemo(() => {
    const round = Math.round(suggested / 5000) * 5000
    const opts = [round - 20000, round, round + 20000, round + 40000].filter((n) => n >= 20000)
    return [...new Set(opts)]
  }, [suggested])

  const toggle = (key) => setOpen((cur) => (cur === key ? null : key))
  const close = () => setOpen(null)
  const swap = () =>
    setRoute((r) => ({
      fromRegion: r.toRegion,
      fromPlace: r.toPlace,
      from: r.to,
      toRegion: r.fromRegion,
      toPlace: r.fromPlace,
      to: r.from,
    }))

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="Yuk jo‘natish" />
      <PageTitle title="Yuk jo‘natish" subtitle="Qabul qiluvchi ma’lumotlari va og‘irlikni kiriting" />

      <Card className="space-y-4 p-4">
        {/* Ikki qator teng balandlikda — almashtirish tugmasi ajratuvchi chiziq markazida turadi. */}
        <div className="relative rounded-2xl bg-canvas">
          <RegionPicker
            variant="row"
            icon={MapPin}
            label="Qayerdan"
            region={route.fromRegion}
            place={route.fromPlace}
            onChange={({ region, place, label }) =>
              setRoute((r) => ({ ...r, fromRegion: region, fromPlace: place, from: label }))
            }
            open={open === 'from'}
            onToggle={() => toggle('from')}
            onClose={close}
          />
          <div className="mx-3.5 h-px bg-line" />
          <RegionPicker
            variant="row"
            icon={Flag}
            label="Qayerga"
            region={route.toRegion}
            place={route.toPlace}
            onChange={({ region, place, label }) =>
              setRoute((r) => ({ ...r, toRegion: region, toPlace: place, to: label }))
            }
            open={open === 'to'}
            onToggle={() => toggle('to')}
            onClose={close}
          />
          <button
            type="button"
            onClick={swap}
            className="absolute left-1/2 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-canvas bg-brand text-white shadow-md"
            aria-label="Almashtirish"
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
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

      <Card className="mt-4 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Sizning narxingiz</p>
        <label className="mt-2 flex items-end gap-2 rounded-2xl bg-canvas px-4 py-3 ring-1 ring-transparent focus-within:bg-white focus-within:ring-brand/25">
          <input
            value={formatAmount(amount)}
            onChange={(e) => setAmount(parseAmount(e.target.value))}
            inputMode="numeric"
            placeholder="0"
            aria-label="Jo‘natish narxi"
            className="min-w-0 flex-1 bg-transparent text-[28px] font-extrabold leading-none tracking-tight text-ink outline-none placeholder:text-slate-300"
          />
          <span className="mb-0.5 shrink-0 text-sm font-bold text-muted">so‘m</span>
        </label>
        <p className="mt-2 text-[11px] text-muted">Istalgan summani yozing — haydovchi shu narxni ko‘radi.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAmount(suggested)}
            className={`rounded-2xl px-3 py-2 text-[12px] font-bold ${
              amount === suggested ? 'bg-brand text-white' : 'bg-brand-soft text-brand'
            }`}
          >
            Taklif {formatSom(suggested)}
          </button>
          {quick
            .filter((n) => n !== suggested)
            .map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setAmount(n)}
                className={`rounded-2xl px-3 py-2 text-[12px] font-bold ${
                  amount === n ? 'bg-brand text-white' : 'bg-canvas text-ink'
                }`}
              >
                {formatAmount(n)}
              </button>
            ))}
        </div>
        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={!amount}
          onClick={() => {
            if (!amount) return
            setOk(true)
            setTimeout(() => setOk(false), 2500)
          }}
        >
          {formatSom(amount || 0)} · tasdiqlash
        </Button>
      </Card>
      {ok ? (
        <p className="mt-3 text-center text-sm font-semibold text-success">
          Buyurtma qabul qilindi · {formatSom(amount)}
        </p>
      ) : null}
    </div>
  )
}
