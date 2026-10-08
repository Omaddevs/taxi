import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { ArrowLeft, Camera, CheckCircle2, LoaderCircle, LocateFixed, Store, UserRound, X } from 'lucide-react'
import { api } from '../../lib/api'
import { fileToImageDataUrl } from '../../lib/image'
import { useAuth } from '../../context/AuthContext'
import { BaseTiles } from '../map/BaseTiles'
import { pinIcon } from '../places/PlacesMap'
import { RENT_SCOOTER_COLOR, VEHICLE_TYPES } from '../../data/rentals'
import { cn } from '../../lib/utils'
import { useMyRentals, useOrigin } from './rentData'
import 'leaflet/dist/leaflet.css'

const MAX_PHOTOS = 6
const INPUT =
  'h-12 w-full rounded-[16px] border border-line bg-white px-3.5 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15'

const text = (v) => v ?? ''
const num = (v) => (v == null ? '' : String(v))

/** "150 000" → 150000; "" → null; garbage → NaN so the form can say so. */
function parseNum(value) {
  const clean = String(value).replace(/\s/g, '')
  if (!clean) return null
  const n = Number(clean)
  return Number.isInteger(n) && n >= 0 ? n : Number.NaN
}

/** Create (no editId) or edit one of the user's own listings. */
export function RentForm({ editId, onBack, onDone }) {
  const { data: mine, isLoading } = useMyRentals()
  const editing = editId ? mine?.find((l) => l.id === editId) : null

  if (editId && isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-muted">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Yuklanmoqda…
      </div>
    )
  }
  if (editId && !editing) {
    return (
      <div className="p-6 text-center">
        <p className="mt-10 font-semibold text-muted">E’lon topilmadi</p>
        <button type="button" onClick={onBack} className="mt-4 h-11 rounded-full bg-ink px-6 text-sm font-bold text-white">
          Orqaga
        </button>
      </div>
    )
  }
  return <FormBody key={editing?.id ?? 'new'} editing={editing} onBack={onBack} onDone={onDone} />
}

function FormBody({ editing, onBack, onDone }) {
  const { authUser } = useAuth()
  const origin = useOrigin()
  const queryClient = useQueryClient()

  const [vehicleType, setVehicleType] = useState(editing?.vehicleType ?? 'SCOOTER')
  const [ownerType, setOwnerType] = useState(editing?.ownerType ?? 'PERSON')
  const [companyName, setCompanyName] = useState(text(editing?.companyName))
  const [contactName, setContactName] = useState(text(editing?.contactName ?? authUser?.name))
  const [phone, setPhone] = useState(text(editing?.phone ?? authUser?.phone))
  const [telegram, setTelegram] = useState(text(editing?.telegram ?? authUser?.telegramUsername))
  const [title, setTitle] = useState(text(editing?.title))
  const [brand, setBrand] = useState(text(editing?.brand))
  const [model, setModel] = useState(text(editing?.model))
  const [description, setDescription] = useState(text(editing?.description))
  const [hour, setHour] = useState(num(editing?.pricePerHour))
  const [day, setDay] = useState(num(editing?.pricePerDay))
  const [week, setWeek] = useState(num(editing?.pricePerWeek))
  const [deposit, setDeposit] = useState(num(editing?.deposit))
  const [maxSpeed, setMaxSpeed] = useState(num(editing?.maxSpeed))
  const [rangeKm, setRangeKm] = useState(num(editing?.rangeKm))
  const [licenseRequired, setLicenseRequired] = useState(editing?.licenseRequired ?? false)
  const [address, setAddress] = useState(text(editing?.address))
  const [point, setPoint] = useState(editing?.lat != null ? [editing.lat, editing.lng] : null)
  const [photos, setPhotos] = useState(Array.isArray(editing?.photos) ? editing.photos : [])
  const [imageBusy, setImageBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function onFiles(e) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length)
    e.target.value = ''
    if (!files.length) return
    setImageBusy(true)
    setError('')
    try {
      const urls = await Promise.all(files.map((f) => fileToImageDataUrl(f)))
      setPhotos((list) => [...list, ...urls].slice(0, MAX_PHOTOS))
    } catch (err) {
      setError(err?.message || 'Rasmni yuklab bo‘lmadi, boshqa rasm tanlang')
    } finally {
      setImageBusy(false)
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setPoint([origin.lat, origin.lng])
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint([pos.coords.latitude, pos.coords.longitude])
        setLocating(false)
      },
      () => {
        setPoint([origin.lat, origin.lng])
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  const mutation = useMutation({
    mutationFn: (payload) => (editing ? api.patch(`/rentals/${editing.id}`, payload) : api.post('/rentals', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals-mine'] })
      queryClient.invalidateQueries({ queryKey: ['rentals'] })
      setSent(true)
    },
    onError: (err) => setError(err?.message || 'Xatolik yuz berdi'),
  })

  function submit(e) {
    e.preventDefault()
    setError('')
    if (title.trim().length < 3) return setError('E’lon sarlavhasini yozing')
    if (ownerType === 'COMPANY' && !companyName.trim()) return setError('Tashkilot nomini kiriting')
    if (phone.replace(/\D/g, '').length < 9) return setError('Telefon raqamini to‘liq kiriting')
    const nums = {
      pricePerHour: parseNum(hour),
      pricePerDay: parseNum(day),
      pricePerWeek: parseNum(week),
      deposit: parseNum(deposit),
      maxSpeed: parseNum(maxSpeed),
      rangeKm: parseNum(rangeKm),
    }
    if (Object.values(nums).some((n) => Number.isNaN(n))) return setError('Narx va ko‘rsatkichlarni faqat raqamda yozing')
    if (!nums.pricePerHour && !nums.pricePerDay && !nums.pricePerWeek) {
      return setError('Kamida bitta narx kiriting: soatiga, kuniga yoki haftasiga')
    }
    mutation.mutate({
      vehicleType,
      ownerType,
      companyName: ownerType === 'COMPANY' ? companyName.trim() : '',
      contactName: contactName.trim(),
      phone: phone.trim(),
      telegram: telegram.trim(),
      title: title.trim(),
      brand: brand.trim(),
      model: model.trim(),
      description: description.trim(),
      ...nums,
      licenseRequired,
      address: address.trim(),
      lat: point?.[0] ?? null,
      lng: point?.[1] ?? null,
      photos,
    })
  }

  if (sent) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <CheckCircle2 className="h-10 w-10" />
        </span>
        <p className="mt-4 text-[22px] font-extrabold tracking-tight text-ink">E’lon moderatsiyaga yuborildi</p>
        <p className="mt-2 text-[14px] text-muted">
          Operatorlarimiz tez orada tekshiradi. Tasdiqlangach, e’loningiz Skuter ijara bo‘limida chiqadi va sizga bildirishnoma keladi.
        </p>
        <button type="button" onClick={onDone} className="mt-6 h-12 w-full max-w-[280px] rounded-full bg-ink text-[15px] font-bold text-white">
          Mening e’lonlarim
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="relative flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 pb-3 pt-4">
        <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas" aria-label="Orqaga">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[18px] font-extrabold tracking-tight text-ink">{editing ? 'E’lonni tahrirlash' : 'Ijaraga berish'}</p>
          <p className="truncate text-[12px] text-muted">Bepul · moderatsiyadan so‘ng chiqadi</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-canvas px-4 pb-32 pt-4">
        {editing?.status === 'REJECTED' && editing.rejectionReason ? (
          <p className="rounded-[18px] bg-red-50 px-3.5 py-3 text-[13px] font-semibold text-red-600">
            Rad etilish sababi: {editing.rejectionReason}
          </p>
        ) : null}

        <Card title="Rasmlar" hint={`${photos.length}/${MAX_PHOTOS} · birinchisi muqova bo‘ladi`}>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="aspect-square w-full rounded-[16px] object-cover" />
                {i === 0 ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/75 px-2 py-0.5 text-[10px] font-bold text-white">Muqova</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPhotos((list) => [list[i], ...list.filter((_, j) => j !== i)])}
                    className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-ink"
                  >
                    Muqova qilish
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPhotos((list) => list.filter((_, j) => j !== i))}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white"
                  aria-label="Rasmni olib tashlash"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[16px] border-2 border-dashed border-brand/40 bg-brand-soft/50 text-[12px] font-bold text-brand-dark">
                {imageBusy ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                {imageBusy ? 'Yuklanmoqda' : 'Rasm qo‘shish'}
                <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} disabled={imageBusy} />
              </label>
            ) : null}
          </div>
        </Card>

        <Card title="Transport">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {VEHICLE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setVehicleType(t.id)}
                className={cn(
                  'flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition',
                  vehicleType === t.id ? 'bg-ink text-white' : 'bg-canvas text-ink',
                )}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
          <Label text="Sarlavha">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} maxLength={100} placeholder="Masalan, Yadea G5 elektr skuter" />
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Label text="Brend">
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className={INPUT} placeholder="Yadea" />
            </Label>
            <Label text="Model">
              <input value={model} onChange={(e) => setModel(e.target.value)} className={INPUT} placeholder="G5" />
            </Label>
            <Label text="Maks. tezlik, km/soat">
              <input value={maxSpeed} onChange={(e) => setMaxSpeed(e.target.value)} className={INPUT} inputMode="numeric" placeholder="45" />
            </Label>
            <Label text="Bir zaryadda, km">
              <input value={rangeKm} onChange={(e) => setRangeKm(e.target.value)} className={INPUT} inputMode="numeric" placeholder="60" />
            </Label>
          </div>
          <Toggle checked={licenseRequired} onChange={setLicenseRequired} label="Haydovchilik guvohnomasi kerak" />
        </Card>

        <Card title="Narxlar" hint="so‘mda · kamida bittasini kiriting">
          <div className="grid grid-cols-3 gap-2">
            <Label text="Soatiga">
              <input value={hour} onChange={(e) => setHour(e.target.value)} className={INPUT} inputMode="numeric" placeholder="25 000" />
            </Label>
            <Label text="Kuniga">
              <input value={day} onChange={(e) => setDay(e.target.value)} className={INPUT} inputMode="numeric" placeholder="150 000" />
            </Label>
            <Label text="Haftasiga">
              <input value={week} onChange={(e) => setWeek(e.target.value)} className={INPUT} inputMode="numeric" placeholder="800 000" />
            </Label>
          </div>
          <Label text="Zalog (qaytariladigan depozit)">
            <input value={deposit} onChange={(e) => setDeposit(e.target.value)} className={INPUT} inputMode="numeric" placeholder="500 000" />
          </Label>
        </Card>

        <Card title="Tavsif">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full rounded-[16px] border border-line bg-white px-3.5 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
            placeholder="Holati, ijara shartlari, shlem/qulf bormi, yetkazib berasizmi…"
          />
        </Card>

        <Card title="Joylashuv" hint="Xaritani bosing — e’lon Smart xaritada ham chiqadi">
          <Label text="Manzil">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={INPUT} placeholder="Chilonzor, 9-kvartal" />
          </Label>
          <div className="isolate h-[200px] overflow-hidden rounded-[18px] border border-line">
            <MapContainer
              center={point ?? [origin.lat, origin.lng]}
              zoom={point ? 16 : 13}
              className="h-full w-full"
              zoomControl={false}
              attributionControl={false}
            >
              <BaseTiles />
              <PickPoint onPick={(lat, lng) => setPoint([lat, lng])} />
              <FlyTo point={point} />
              {point ? <Marker position={point} icon={pinIcon(RENT_SCOOTER_COLOR, 'Shu yerda', true)} /> : null}
            </MapContainer>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={locateMe}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-brand-soft text-[13px] font-bold text-brand-dark"
            >
              {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              Mening joylashuvim
            </button>
            {point ? (
              <button type="button" onClick={() => setPoint(null)} className="h-11 rounded-[14px] bg-canvas px-4 text-[13px] font-bold text-muted">
                Olib tashlash
              </button>
            ) : null}
          </div>
        </Card>

        <Card title="E’lon beruvchi">
          <div className="grid grid-cols-2 gap-2 rounded-[16px] bg-canvas p-1">
            {[
              { id: 'PERSON', label: 'Shaxsiy', icon: UserRound },
              { id: 'COMPANY', label: 'Tashkilot', icon: Store },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOwnerType(o.id)}
                className={cn(
                  'flex h-10 items-center justify-center gap-1.5 rounded-[12px] text-[14px] font-bold transition',
                  ownerType === o.id ? 'bg-white text-ink shadow-sm' : 'text-muted',
                )}
              >
                <o.icon className="h-4 w-4" /> {o.label}
              </button>
            ))}
          </div>
          {ownerType === 'COMPANY' ? (
            <Label text="Tashkilot nomi">
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={INPUT} placeholder="Masalan, ScootUz" />
            </Label>
          ) : null}
          <Label text="Ism">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={INPUT} placeholder="Ismingiz" />
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Label text="Telefon">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT} inputMode="tel" placeholder="+998 90 123 45 67" />
            </Label>
            <Label text="Telegram">
              <input value={telegram} onChange={(e) => setTelegram(e.target.value)} className={INPUT} placeholder="@username" />
            </Label>
          </div>
        </Card>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-line bg-white px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
        {error ? <p className="mb-2 text-center text-[13px] font-semibold text-red-500">{error}</p> : null}
        <button
          type="submit"
          disabled={mutation.isPending || imageBusy}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-[18px] bg-brand text-[16px] font-extrabold text-white shadow-[0_8px_20px_rgba(0,199,212,0.35)] disabled:opacity-60"
        >
          {mutation.isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
          {editing ? 'Saqlash va qayta yuborish' : 'Moderatsiyaga yuborish'}
        </button>
      </div>
    </form>
  )
}

function PickPoint({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function FlyTo({ point }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150)
    return () => clearTimeout(t)
  }, [map])
  useEffect(() => {
    if (point) map.flyTo(point, Math.max(map.getZoom(), 16), { duration: 0.5 })
  }, [point, map])
  return null
}

function Card({ title, hint, children }) {
  return (
    <section className="space-y-3 rounded-[24px] bg-white p-4">
      <div>
        <h3 className="text-[16px] font-extrabold text-ink">{title}</h3>
        {hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Label({ text: label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[12px] font-semibold text-muted">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 py-1 text-left">
      <span className="text-[14px] font-semibold text-ink">{label}</span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-slate-300')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  )
}
