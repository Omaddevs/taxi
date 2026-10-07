import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CalendarClock, Car, FileCheck2, Headphones, Loader2, Route, Send, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PlateInput, isValidPlateUz } from '../components/ui/PlateInput'
import { api, ApiError } from '../lib/api'
import { isCompletePhoneUz, maskLocalPhoneUz, maskPhoneUz, toE164Uz } from '../lib/utils'

// Landing sahifasidagi hero bilan bir xil vizual til: kulrang + brend panel, katta "T"/"7" shakllari
// va pastda qorong‘i "qanday ishlaydi" bloki.
const PERKS = [
  { icon: CalendarClock, text: 'Erkin ish jadvali' },
  { icon: Route, text: 'Shahar ichi va viloyatlararo buyurtmalar' },
  { icon: Headphones, text: '24/7 qo‘llab-quvvatlash' },
]

const STEPS = [
  { icon: Send, title: 'Ariza qoldiring', text: 'Ism, telefon va avtomobil ma’lumotlarini yuboring', tone: 'brand' },
  { icon: FileCheck2, title: 'Tekshiruvdan o‘ting', text: 'Operator siz bilan bog‘lanib, hujjatlarni tasdiqlaydi', tone: 'light' },
  { icon: Car, title: 'Buyurtma oling', text: 'Haydovchi ilovasida yo‘lovchi va yuk buyurtmalarini qabul qiling', tone: 'brand' },
]

const FIELD =
  'flex h-12 items-center gap-2.5 rounded-full bg-white px-5 text-[15px] ring-2 ring-transparent transition focus-within:ring-ink/20'
const INPUT =
  'min-w-0 flex-1 bg-transparent font-semibold text-ink outline-none placeholder:font-medium placeholder:text-slate-400'

function CarImage({ className = '' }) {
  return (
    <picture>
      <source type="image/webp" srcSet="/landing/taxi-car-sm.webp 520w, /landing/taxi-car.webp 1400w" sizes="(min-width: 1024px) 560px, 100vw" />
      <img
        src="/landing/taxi-car.png"
        alt="TaxiLine avtomobili"
        width={2017}
        height={694}
        className={`select-none ${className}`}
        draggable={false}
      />
    </picture>
  )
}

export default function BecomeDriver() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [form, setForm] = useState(() => ({
    fullName: user?.name || '',
    phone: maskPhoneUz(user?.phone || '+998'),
    // Women-only ("Ayollar uchun taxi") orders go to female drivers only.
    gender: user?.gender === 'FEMALE' || user?.gender === 'MALE' ? user.gender : '',
    carModel: '',
    plate: '',
  }))
  const [error, setError] = useState('')

  const submit = useMutation({
    mutationFn: () => api.post('/drivers/applications', { ...form, phone: toE164Uz(form.phone) }),
    onSuccess: () => navigate('/driver'),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Ariza yuborilmadi'),
  })

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const valid =
    form.fullName.trim().length > 1 &&
    Boolean(form.gender) &&
    isCompletePhoneUz(form.phone) &&
    form.carModel.trim() &&
    isValidPlateUz(form.plate)

  const onSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!valid || submit.isPending) return
    submit.mutate()
  }

  return (
    <div className="-mx-4 -mt-4 pb-6 lg:mx-0 lg:mt-0">
      <section className="relative overflow-hidden rounded-b-[28px] bg-[#f3f4f6] sm:rounded-[32px] lg:rounded-[40px]">
        <div className="relative grid lg:grid-cols-2">
          {/* ── Chap panel: sarlavha, afzalliklar va avtomobil ── */}
          <div className="relative px-5 pb-2 pt-8 sm:px-10 lg:px-12 lg:pb-[200px] lg:pt-12">
            <svg
              aria-hidden="true"
              viewBox="0 0 600 600"
              className="pointer-events-none absolute -left-10 top-0 w-[420px] sm:w-[560px] lg:-left-14 lg:w-[620px]"
            >
              <path d="M40 150 H 560 M300 150 V 700" fill="none" stroke="#e7e9ed" strokeWidth="110" strokeLinecap="butt" />
            </svg>

            <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.06em] text-brand-dark shadow-sm">
              <Car className="h-4 w-4" /> Haydovchilar uchun
            </span>

            <h1 className="relative mt-6 text-[36px] font-extrabold leading-[1.06] tracking-tight text-ink sm:text-[48px] lg:mt-10 lg:text-[50px] xl:text-[58px]">
              TaxiLine bilan
              <br />
              daromad qiling
            </h1>

            <ul className="relative mt-6 space-y-2.5">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[15px] font-semibold text-ink/85">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-dark shadow-sm">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <div className="relative z-20 -mx-3 -mb-14 mt-4 sm:mx-6 sm:-mb-20 lg:hidden">
              <CarImage className="h-auto w-full drop-shadow-[0_22px_18px_rgba(15,29,42,0.28)]" />
            </div>
          </div>

          {/* ── O‘ng panel: ariza formasi ── */}
          <div className="relative overflow-hidden bg-brand px-5 pb-14 pt-20 sm:px-10 sm:pt-28 lg:overflow-visible lg:px-12 lg:pb-[150px] lg:pt-12">
            <svg
              aria-hidden="true"
              viewBox="0 0 600 600"
              className="pointer-events-none absolute -right-16 top-6 w-[420px] sm:w-[540px] lg:-right-10 lg:w-[600px]"
            >
              <path d="M40 80 H 330 M185 80 V 600" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="92" />
              <path d="M330 80 H 600 L 420 600" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="92" strokeLinejoin="miter" />
            </svg>

            <h2 className="relative text-[30px] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[40px] lg:mt-6 lg:text-[36px] xl:text-[42px]">
              Ariza qoldiring
            </h2>
            <p className="relative mt-3 max-w-[420px] text-[15px] leading-[1.5] text-ink/85 sm:text-[17px]">
              Ma’lumotlaringizni yuboring — operator siz bilan bog‘lanadi.
            </p>

            <form onSubmit={onSubmit} className="relative mt-7 max-w-[440px] space-y-3">
              <label className={FIELD}>
                <UserRound className="h-[18px] w-[18px] shrink-0 text-muted" />
                <input
                  value={form.fullName}
                  onChange={update('fullName')}
                  placeholder="Ism familiya"
                  autoComplete="name"
                  aria-label="Ism familiya"
                  className={INPUT}
                />
              </label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jinsingiz">
                {[
                  { id: 'MALE', label: 'Erkak', icon: '👨' },
                  { id: 'FEMALE', label: 'Ayol', icon: '👩' },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    role="radio"
                    aria-checked={form.gender === g.id}
                    onClick={() => setForm((f) => ({ ...f, gender: g.id }))}
                    className={`flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-bold transition ${
                      form.gender === g.id ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-white/80'
                    }`}
                  >
                    <span aria-hidden>{g.icon}</span> {g.label}
                  </button>
                ))}
              </div>
              {form.gender === 'FEMALE' ? (
                <p className="rounded-2xl bg-white/80 px-4 py-2.5 text-[13px] font-semibold text-[#c2185b]">
                  🌸 «Ayollar uchun taxi» buyurtmalari avval ayol haydovchilarga keladi.
                </p>
              ) : null}
              <label className={FIELD}>
                <span className="font-semibold text-ink">+998</span>
                <input
                  value={maskLocalPhoneUz(form.phone)}
                  onChange={(e) => setForm((f) => ({ ...f, phone: maskPhoneUz(e.target.value) }))}
                  placeholder="Telefon raqam"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={12}
                  aria-label="Telefon raqam"
                  className={`${INPUT} tracking-wide placeholder:tracking-normal`}
                />
              </label>
              <label className={FIELD}>
                <Car className="h-[18px] w-[18px] shrink-0 text-muted" />
                <input
                  value={form.carModel}
                  onChange={update('carModel')}
                  placeholder="Avtomobil (masalan, Chevrolet Cobalt)"
                  aria-label="Avtomobil"
                  className={INPUT}
                />
              </label>
              <div className="pt-1">
                <p className="mb-2 pl-1 text-[13px] font-bold text-ink/80">Davlat raqami</p>
                <PlateInput value={form.plate} onChange={(plate) => setForm((f) => ({ ...f, plate }))} />
              </div>

              {error ? (
                <p role="alert" className="rounded-2xl bg-white/90 px-4 py-2.5 text-[13px] font-semibold text-danger">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!valid || submit.isPending}
                className="spin-border flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-8 text-[14px] font-bold uppercase tracking-[0.03em] text-white shadow-[0_10px_20px_rgba(15,29,42,0.25)] transition hover:bg-[#0f1d2a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submit.isPending ? 'Yuborilmoqda…' : 'Ariza qoldirish'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Pastki qorong‘i blok — "qanday ishlaydi" ── */}
        <div className="relative z-10 -mt-8 rounded-[28px] bg-[#1d2229] sm:-mt-10 sm:rounded-[32px] lg:rounded-[40px]">
          <div className="pointer-events-none absolute bottom-[calc(100%-28px)] left-[3%] z-20 hidden w-[44%] lg:block">
            <CarImage className="h-auto w-full drop-shadow-[0_26px_22px_rgba(0,0,0,0.35)]" />
          </div>

          <div className="px-5 pb-8 pt-12 sm:px-10 sm:pb-10 sm:pt-16 lg:px-12 lg:pb-14 lg:pt-24">
            <h2 className="text-[28px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[38px] xl:text-[44px]">
              Qanday ishlaydi
            </h2>
            <p className="mt-3 text-[15px] leading-[1.5] text-white/75 sm:text-[17px]">uch qadamda haydovchi bo‘ling</p>

            <ol className="mt-7 grid gap-3 sm:grid-cols-3 sm:gap-4">
              {STEPS.map(({ icon: Icon, title, text, tone }, i) => {
                const brand = tone === 'brand'
                return (
                  <li
                    key={title}
                    className={`flex min-h-[170px] flex-col rounded-[16px] p-5 text-ink ${brand ? 'bg-brand' : 'bg-white'}`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`h-8 w-8 ${brand ? 'text-ink' : 'text-brand'}`} strokeWidth={1.7} />
                      <span className={`text-[13px] font-extrabold ${brand ? 'text-ink/60' : 'text-muted'}`}>0{i + 1}</span>
                    </div>
                    <h3 className="mt-auto pt-6 text-[18px] font-extrabold leading-[1.15] tracking-tight">{title}</h3>
                    <p className={`mt-2 text-[12px] leading-[1.45] ${brand ? 'text-ink/85' : 'text-ink/70'}`}>{text}</p>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </section>
    </div>
  )
}
