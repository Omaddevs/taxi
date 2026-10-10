import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpDown,
  CalendarClock,
  Car,
  Flag,
  HandCoins,
  PersonStanding,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { cn, formatDateShortUz } from '../../lib/utils'
import { WomenOrderRibbon } from '../trip/OrderAudience'
import {
  CarPicker,
  DatePicker,
  GenderPicker,
  LuggagePicker,
  PassengerPicker,
  RegionPicker,
  SeatPicker,
  TimePicker,
} from '../ui/SearchPickers'
import { t } from '../../i18n'

// Laptop/desktop "Taxi chaqirish": the home page's visual language (white 32px cards, canvas
// fields, brand gradient art) instead of the old full-width teal form.

const BENEFITS = [
  [ShieldCheck, 'Tasdiqlangan haydovchilar', 'Hujjatlari tekshirilgan'],
  [HandCoins, 'Aniq narx', 'Narx oldindan ko‘rinadi'],
  [CalendarClock, 'Oldindan band qilish', 'Kun va vaqtni tanlang'],
]

export function RideDesktop() {
  const { search, setSearch } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(null)
  const women = search.service === 'women'

  const update = (patch) => setSearch((s) => ({ ...s, ...patch }))
  const toggle = (key) => setOpen((cur) => (cur === key ? null : key))
  const close = () => setOpen(null)
  const swap = () =>
    update({
      from: search.to,
      to: search.from,
      fromRegion: search.toRegion,
      toRegion: search.fromRegion,
      fromPlace: search.toPlace,
      toPlace: search.fromPlace,
    })

  const ready = Boolean(search.fromRegion && search.toRegion)
  const summary = [
    ready ? `${search.from} → ${search.to}` : null,
    [search.date ? formatDateShortUz(search.date) : null, search.time].filter(Boolean).join(', ') || null,
    `${search.passengers} kishi`,
  ]
    .filter(Boolean)
    .join(' · ')

  const find = () => {
    if (!search.fromRegion) return setOpen('from')
    if (!search.toRegion) return setOpen('to')
    navigate('/results')
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <section className="grid grid-cols-12 gap-5">
        {/* ── Forma ── */}
        <div className="col-span-12 rounded-[32px] bg-white p-7 shadow-[0_10px_40px_rgba(16,42,67,0.06)] xl:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[30px] font-black leading-tight tracking-tight text-ink">
                {women ? t('Ayollar uchun taxi') : t('Qayerga boramiz?')}
              </h2>
              <p className="mt-1 text-[14px] text-muted">{t('Shahar ichida va viloyatlararo — haydovchini o‘zingiz tanlaysiz')}</p>
            </div>
            <div className="flex rounded-full bg-canvas p-1" role="tablist" aria-label={t('Xizmat turi')}>
              {[
                ['passenger', 'Yo‘lovchi'],
                ['cargo', 'Yuk jo‘natish'],
              ].map(([id, label]) => {
                const active = id === 'passenger'
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => (id === 'cargo' ? navigate('/cargo') : null)}
                    className={cn(
                      'h-10 rounded-full px-5 text-[13px] font-bold transition',
                      active ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
                    )}
                  >
                    {t(label)}
                  </button>
                )
              })}
            </div>
          </div>

          {women ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <WomenOrderRibbon />
              <button
                type="button"
                onClick={() => update({ service: 'all' })}
                className="text-xs font-bold text-muted underline underline-offset-2 hover:text-ink"
              >
                {t('Oddiy taxiga o‘tish')}
              </button>
            </div>
          ) : null}

          {/* Yo‘nalish */}
          <div className="relative mt-6 rounded-[24px] bg-canvas">
            <span aria-hidden className="absolute bottom-[42px] left-[33px] top-[42px] border-l-2 border-dashed border-brand/40" />
            <RegionPicker
              variant="row"
              icon={PersonStanding}
              label={t('Qayerdan')}
              region={search.fromRegion}
              place={search.fromPlace}
              onChange={({ region, place, label }) => {
                update({ fromRegion: region, fromPlace: place, from: label })
                setOpen('to')
              }}
              open={open === 'from'}
              onToggle={() => toggle('from')}
              onClose={close}
            />
            <div className="ml-[68px] mr-20 h-px bg-line" />
            <RegionPicker
              variant="row"
              icon={Flag}
              label={t('Qayerga')}
              region={search.toRegion}
              place={search.toPlace}
              onChange={({ region, place, label }) => update({ toRegion: region, toPlace: place, to: label })}
              origin={{ region: search.fromRegion, place: search.fromPlace }}
              onEditOrigin={() => setOpen('from')}
              open={open === 'to'}
              onToggle={() => toggle('to')}
              onClose={close}
            />
            <button
              type="button"
              onClick={swap}
              aria-label={t('Manzillarni almashtirish')}
              className="absolute right-12 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-4 border-canvas bg-brand text-white shadow-md transition hover:rotate-180"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>

          {/* Tafsilotlar */}
          <p className="mb-2.5 mt-6 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('Safar tafsilotlari')}</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <DatePicker value={search.date} onChange={(date) => update({ date })} open={open === 'date'} onToggle={() => toggle('date')} onClose={close} />
            <TimePicker value={search.time} onChange={(time) => update({ time })} open={open === 'time'} onToggle={() => toggle('time')} onClose={close} />
            <PassengerPicker
              value={search.passengers}
              onChange={(passengers) =>
                update({ passengers, gender: passengers < 2 && search.gender === 'juft' ? '' : search.gender })
              }
              open={open === 'passengers'}
              onToggle={() => toggle('passengers')}
              onClose={close}
            />
            <LuggagePicker value={search.luggage} onChange={(luggage) => update({ luggage })} open={open === 'luggage'} onToggle={() => toggle('luggage')} onClose={close} />
            <GenderPicker
              value={search.gender}
              passengers={search.passengers}
              onChange={(gender) => update({ gender })}
              open={open === 'gender'}
              onToggle={() => toggle('gender')}
              onClose={close}
            />
            <SeatPicker value={search.seat} onChange={(seat) => update({ seat })} open={open === 'seat'} onToggle={() => toggle('seat')} onClose={close} />
            <div className="col-span-2 lg:col-span-3">
              <CarPicker value={search.car} onChange={(car) => update({ car })} open={open === 'car'} onToggle={() => toggle('car')} onClose={close} />
            </div>
          </div>

          {/* Yakun */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <p className="min-w-0 flex-1 truncate text-[14px] text-muted">
              {ready ? <span className="font-semibold text-ink">{t(summary)}</span> : t('Qayerdan va qayerga ketishingizni tanlang')}
            </p>
            <button
              type="button"
              onClick={find}
              className="inline-flex h-14 items-center gap-2 rounded-[18px] bg-brand px-8 text-[15px] font-extrabold text-white shadow-[0_10px_24px_rgba(0,199,212,0.35)] transition hover:bg-brand-dark"
            >
              {t('Safar topish')}{' '}<ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Yon ustun ── */}
        <aside className="col-span-12 grid gap-5 md:grid-cols-2 xl:col-span-4 xl:grid-cols-1 xl:content-start">
          <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(150deg,#00d2de_0%,#00b5c2_55%,#0098a6_100%)] p-6 text-white">
            <span aria-hidden className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
            <p className="relative text-[22px] font-black leading-tight tracking-tight">{t('Nega TaxiLine?')}</p>
            <ul className="relative mt-4 space-y-3">
              {BENEFITS.map(([Icon, title, hint]) => (
                <li key={title} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-[14px] font-bold">{t(title)}</span>
                    <span className="block text-[12px] text-white/80">{t(hint)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <img
              src="/landing/taxi-car-sm.webp"
              alt=""
              className="pointer-events-none relative -mb-8 -mr-20 mt-2 ml-auto w-[300px] max-w-none drop-shadow-xl"
            />
          </div>

          <button
            type="button"
            onClick={() => update({ service: women ? 'all' : 'women' })}
            className={cn(
              'relative flex min-h-[150px] flex-col justify-between overflow-hidden rounded-[32px] p-6 text-left transition hover:-translate-y-0.5',
              women ? 'bg-[#f5559a] text-white' : 'bg-gradient-to-br from-[#fff0f5] to-[#fde2ec] text-ink',
            )}
          >
            <span className="relative z-10">
              <span className="block text-[19px] font-extrabold tracking-tight">{t('Ayollar uchun taxi')}</span>
              <span className={cn('mt-1 block text-[13px]', women ? 'text-white/85' : 'text-muted')}>
                {women ? t('Yoqilgan — avval ayol haydovchilarga') : t('Avval ayol haydovchilarga yuboriladi')}
              </span>
            </span>
            <span
              className={cn(
                'relative z-10 inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold',
                women ? 'bg-white text-[#c2185b]' : 'bg-[#f5559a] text-white',
              )}
            >
              <Sparkles className="h-3.5 w-3.5" /> {women ? t('O‘chirish') : t('Yoqish')}
            </span>
            <img
              src="/landing/taxi-car-sm.webp"
              alt=""
              className="pointer-events-none absolute -bottom-2 -right-10 w-[210px] max-w-none drop-shadow-lg"
              style={{ filter: 'hue-rotate(150deg) saturate(1.2)' }}
            />
          </button>
        </aside>
      </section>
    </div>
  )
}

export function PopularTripsEmpty() {
  return (
    <div className="flex items-center gap-4 rounded-[28px] bg-white p-6 shadow-[0_8px_30px_rgba(16,42,67,0.05)]">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
        <Car className="h-6 w-6" />
      </span>
      <div>
        <p className="text-[15px] font-bold text-ink">{t('Hozircha e’lon qilingan reyslar yo‘q')}</p>
        <p className="text-[13px] text-muted">{t('Haydovchilar yo‘nalish e’lon qilishi bilan shu yerda chiqadi.')}</p>
      </div>
    </div>
  )
}
