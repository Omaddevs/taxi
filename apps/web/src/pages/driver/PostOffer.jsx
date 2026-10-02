import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { DriverHeader } from './ui'
import { CarSeatMap } from '../../components/trip/CarSeatMap'
import { RegionPicker, DatePicker, TimePicker } from '../../components/ui/SearchPickers'
import { Field, Input } from '../../components/ui/Input'
import { Badge, Button, Card } from '../../components/ui/Button'
import { searchUzPlaces } from '../../data/uzbekistan'
import { api } from '../../lib/api'
import { useApp } from '../../context/AppContext'
import { formatPhoneUz, formatSom, maskPhoneUz } from '../../lib/utils'

const SEAT_LAYOUT = ['FRONT', 'REAR_LEFT', 'REAR_MIDDLE', 'REAR_RIGHT']

function emptySeats() {
  return SEAT_LAYOUT.map((position) => ({ position, status: 'AVAILABLE', gender: null }))
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function departLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('uz-UZ', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

// Only ever rendered for a driver's ACTIVE (not-yet-full) offer — a FULL/CLOSED/CANCELLED one
// no longer blocks posting, so the parent falls back to the create form for those.
function ActiveOfferView({ offer, onClosed }) {
  const queryClient = useQueryClient()
  const closeOffer = useMutation({
    mutationFn: () => api.patch(`/drivers/me/offers/${offer.id}`, { status: 'CLOSED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-offers'] })
      onClosed?.()
    },
  })

  return (
    <div className="mx-auto max-w-lg pb-8">
      <DriverHeader title="Safar" />
      <div className="space-y-4 px-4 pt-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold">{offer.fromLabel} → {offer.toLabel}</p>
            <Badge>Faol</Badge>
          </div>
          <p className="mt-1 text-xs text-muted">{departLabel(offer.departAt)}</p>
          <p className="mt-2 text-lg font-extrabold">{formatSom(offer.pricePerSeat)}<span className="text-xs font-semibold text-muted"> / joy</span></p>
        </Card>

        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
          Yangi elon joylash uchun avval shu safaringizni to‘ldiring (barcha o‘rindiqlar band bo‘lishi) yoki quyidan yoping.
        </p>

        <div>
          <p className="mb-2 text-sm font-extrabold">O‘rindiqlar holati</p>
          <CarSeatMap mode="book" seats={offer.seats || []} readOnly />
        </div>

        <Button variant="outline" className="w-full" disabled={closeOffer.isPending} onClick={() => closeOffer.mutate()}>
          {closeOffer.isPending ? 'Yopilmoqda…' : 'Safarni yopish'}
        </Button>
      </div>
    </div>
  )
}

export default function PostOffer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useApp()
  const [open, setOpen] = useState(null)
  const toggle = (key) => setOpen((cur) => (cur === key ? null : key))
  const close = () => setOpen(null)

  const { data: myOffers, isLoading: offersLoading } = useQuery({
    queryKey: ['driver-offers'],
    queryFn: () => api.get('/drivers/me/offers'),
    // Polls so a driver sees an admin-side cancel/delete/unpublish of their own active offer
    // without needing to reload — matches DriverHome.jsx's polling convention.
    refetchInterval: 5_000,
  })
  const activeOffer = myOffers?.find((o) => o.status === 'ACTIVE')

  const [from, setFrom] = useState({ region: '', place: '', label: '' })
  const [to, setTo] = useState({ region: '', place: '', label: '' })
  const [extraDistricts, setExtraDistricts] = useState([])
  const [districtQuery, setDistrictQuery] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [time, setTime] = useState('09:00')
  const [pricePerSeat, setPricePerSeat] = useState('')
  const [luggageCapacity, setLuggageCapacity] = useState('0')
  const [notes, setNotes] = useState('')
  const [extraPhones, setExtraPhones] = useState([])
  const [seats, setSeats] = useState(emptySeats)
  const [error, setError] = useState('')

  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => api.get('/services') })

  const districtHits = districtQuery.trim().length
    ? searchUzPlaces(districtQuery).filter((h) => h.place)
    : []

  const createOffer = useMutation({
    mutationFn: (body) => api.post('/drivers/me/offers', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-offers'] })
      navigate('/driver/orders')
    },
    onError: (err) => setError(err.message || 'Xatolik yuz berdi'),
  })

  function submit() {
    setError('')
    if (!from.label || !to.label) return setError('Qayerdan va qayerga manzillarini tanlang')
    if (!serviceId) return setError('Avtomobil turini tanlang')
    if (!pricePerSeat || Number(pricePerSeat) < 1000) return setError('Narxni to‘g‘ri kiriting')

    const preOccupiedSeats = seats
      .filter((s) => s.status !== 'AVAILABLE')
      .map((s) => ({ position: s.position, gender: s.gender }))

    createOffer.mutate({
      serviceId,
      fromLabel: from.label,
      fromRegion: from.region,
      toLabel: to.label,
      toRegion: to.region,
      fromAddress: [from.label, ...extraDistricts].join(' · '),
      toAddress: to.label,
      departAt: new Date(`${date}T${time}:00`).toISOString(),
      luggageCapacity: Number(luggageCapacity) || 0,
      pricePerSeat: Number(pricePerSeat),
      notes: notes.trim() || undefined,
      contactPhones: extraPhones.filter((p) => p.trim()),
      preOccupiedSeats,
    })
  }

  if (offersLoading) {
    return <p className="p-6 text-center text-sm text-muted">Yuklanmoqda…</p>
  }

  if (activeOffer) {
    return <ActiveOfferView offer={activeOffer} />
  }

  return (
    <div className="mx-auto max-w-lg pb-8">
      <DriverHeader title="Yangi elon joylash" />

      <div className="space-y-4 px-4 pt-3">
        <div className="rounded-2xl border border-line bg-white">
          <RegionPicker
            label="Qayerdan"
            region={from.region}
            place={from.place}
            onChange={({ region, place, label }) => {
              setFrom({ region, place, label })
              setOpen('to')
            }}
            open={open === 'from'}
            onToggle={() => toggle('from')}
            onClose={close}
            variant="row"
            forceSheet
          />
          <div className="mx-3.5 h-px bg-line" />
          <RegionPicker
            label="Qayerga"
            region={to.region}
            place={to.place}
            onChange={({ region, place, label }) => setTo({ region, place, label })}
            origin={from}
            onEditOrigin={() => setOpen('from')}
            open={open === 'to'}
            onToggle={() => toggle('to')}
            onClose={close}
            variant="row"
            forceSheet
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Qo‘shimcha tumanlar (ixtiyoriy)</p>
          <div className="relative">
            <Input
              value={districtQuery}
              onChange={(e) => setDistrictQuery(e.target.value)}
              placeholder="Tuman qidirish"
            />
            {districtHits.length > 0 ? (
              <div className="absolute inset-x-0 top-12 z-20 max-h-56 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-lg">
                {districtHits.map((hit) => (
                  <button
                    key={`${hit.region}-${hit.place}`}
                    type="button"
                    onClick={() => {
                      const label = `${hit.place}, ${hit.region}`
                      if (!extraDistricts.includes(label)) setExtraDistricts((prev) => [...prev, label])
                      setDistrictQuery('')
                    }}
                    className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-canvas"
                  >
                    <span className="text-sm font-semibold">{hit.place}</span>
                    <span className="text-xs text-muted">{hit.region}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {extraDistricts.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {extraDistricts.map((d) => (
                <span key={d} className="flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                  {d}
                  <button type="button" onClick={() => setExtraDistricts((prev) => prev.filter((x) => x !== d))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Avtomobil turi</p>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                className={`rounded-full border px-3.5 py-2 text-sm font-bold ${
                  serviceId === s.id ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-ink'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-white px-1">
          <DatePicker
            value={date}
            onChange={setDate}
            open={open === 'date'}
            onToggle={() => toggle('date')}
            onClose={close}
            triggerVariant="row"
            forceSheet
          />
          <TimePicker
            value={time}
            onChange={setTime}
            open={open === 'time'}
            onToggle={() => toggle('time')}
            onClose={close}
            triggerVariant="row"
            forceSheet
          />
        </div>

        <Field label="O‘rindiq narxi (so‘m)">
          <Input type="number" inputMode="numeric" value={pricePerSeat} onChange={(e) => setPricePerSeat(e.target.value)} placeholder="50000" />
        </Field>

        <Field label="Yuk sig‘imi (ixtiyoriy)">
          <Input type="number" inputMode="numeric" value={luggageCapacity} onChange={(e) => setLuggageCapacity(e.target.value)} />
        </Field>

        <Field label="Izoh va qulayliklar (ixtiyoriy)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Konditsioner, muzika, chekilmaydi..."
            rows={3}
            className="w-full rounded-2xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </Field>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Aloqa raqami</p>
          <div className="flex h-11 items-center rounded-2xl border border-line bg-canvas px-3 text-sm font-semibold text-muted">
            {formatPhoneUz(user?.phone)}
          </div>
          {extraPhones.map((phone, i) => (
            <div key={i} className="mt-2 flex items-center gap-2">
              <Input
                value={phone}
                onChange={(e) => {
                  const masked = maskPhoneUz(e.target.value)
                  setExtraPhones((prev) => prev.map((p, idx) => (idx === i ? masked : p)))
                }}
                placeholder="+998 90 123 45 67"
              />
              <button
                type="button"
                onClick={() => setExtraPhones((prev) => prev.filter((_, idx) => idx !== i))}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-canvas text-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {extraPhones.length < 2 ? (
            <button
              type="button"
              onClick={() => setExtraPhones((prev) => [...prev, '+998'])}
              className="mt-2 flex items-center gap-1.5 text-sm font-bold text-brand"
            >
              <Plus className="h-4 w-4" /> Raqam qo‘shish
            </button>
          ) : null}
        </div>

        <div>
          <p className="mb-1 text-sm font-extrabold">Band o‘rindiqlar (bo‘lsa)</p>
          <p className="mb-2 text-xs text-muted">Agar mashinada allaqachon yo‘lovchi bo‘lsa, o‘rindiqni bosib jinsini belgilang.</p>
          <CarSeatMap mode="manage" seats={seats} onChange={setSeats} />
        </div>

        {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}

        <Button size="lg" className="w-full" disabled={createOffer.isPending} onClick={submit}>
          {createOffer.isPending ? 'Joylanmoqda…' : 'Elonni joylash'}
        </Button>
      </div>
    </div>
  )
}
