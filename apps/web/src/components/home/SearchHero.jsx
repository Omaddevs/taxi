import { useEffect, useState } from 'react'
import { ArrowDownUp, Flag, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Button } from '../ui/Button'
import { CarArt } from '../trip/RouteMap'
import {
  DatePicker,
  GenderPicker,
  LuggagePicker,
  PassengerPicker,
  RegionPicker,
  SeatPicker,
  CarPicker,
  TimePicker,
} from '../ui/SearchPickers'

// Bir vaqtda faqat bitta variant render bo‘lishi kerak, aks holda ikkita picker oynasi ochiladi.
function useMobileLayout() {
  const [mobile, setMobile] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(max-width: 767px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

export function SearchHero() {
  const { search, setSearch } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(null)
  const mobile = useMobileLayout()

  const update = (patch) => setSearch((s) => ({ ...s, ...patch }))
  const swap = () =>
    update({
      from: search.to,
      to: search.from,
      fromRegion: search.toRegion,
      toRegion: search.fromRegion,
      fromPlace: search.toPlace,
      toPlace: search.fromPlace,
    })
  const toggle = (key) => setOpen((cur) => (cur === key ? null : key))
  const close = () => setOpen(null)

  return (
    <section className="relative overflow-visible rounded-2xl bg-gradient-to-br from-[#16b8a5] via-brand to-brand-dark p-4 text-white shadow-xl shadow-brand/25 lg:p-6">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {[
          { id: 'passenger', label: 'Yo‘lovchi' },
          { id: 'cargo', label: 'Yuk jo‘natish' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              update({ mode: tab.id })
              if (tab.id === 'cargo') navigate('/cargo')
            }}
            className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ${
              search.mode === tab.id ? 'bg-white text-brand' : 'bg-white/15 text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 items-end gap-0 lg:mt-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-4">
        {mobile ? (
          // Ikki qator teng balandlikda — shuning uchun tugma ajratuvchi chiziqning aynan markazida turadi.
          <div className="relative rounded-2xl bg-white">
            <RegionPicker
              variant="row"
              icon={MapPin}
              label="Qayerdan"
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
            <div className="mx-3.5 h-px bg-line" />
            <RegionPicker
              variant="row"
              icon={Flag}
              label="Qayerga"
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
              className="absolute left-1/2 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-brand text-white shadow-md"
              aria-label="Almashtirish"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] md:items-end">
            <RegionPicker
              label="Qayerdan"
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
            <div className="flex h-12 items-center justify-center">
              <button
                type="button"
                onClick={swap}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand shadow-md"
                aria-label="Almashtirish"
              >
                <ArrowDownUp className="h-4 w-4 rotate-90" />
              </button>
            </div>
            <RegionPicker
              label="Qayerga"
              region={search.toRegion}
              place={search.toPlace}
              onChange={({ region, place, label }) => update({ toRegion: region, toPlace: place, to: label })}
              origin={{ region: search.fromRegion, place: search.fromPlace }}
              onEditOrigin={() => setOpen('from')}
              open={open === 'to'}
              onToggle={() => toggle('to')}
              onClose={close}
            />
          </div>
        )}
        <div className="hidden 2xl:block">
          <CarArt />
        </div>
      </div>

      <div className="relative mt-4 rounded-2xl bg-white px-3.5 py-1 text-ink lg:mt-5 lg:px-4 lg:py-2">
        <div className="divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-x-3 lg:divide-y-0">
          <DatePicker
            value={search.date}
            onChange={(date) => update({ date })}
            open={open === 'date'}
            onToggle={() => toggle('date')}
            onClose={close}
            triggerVariant="row"
          />
          <TimePicker
            value={search.time}
            onChange={(time) => update({ time })}
            open={open === 'time'}
            onToggle={() => toggle('time')}
            onClose={close}
            triggerVariant="row"
          />
          <PassengerPicker
            value={search.passengers}
            onChange={(passengers) =>
              update({
                passengers,
                gender: passengers < 2 && search.gender === 'juft' ? '' : search.gender,
              })
            }
            open={open === 'passengers'}
            onToggle={() => toggle('passengers')}
            onClose={close}
            triggerVariant="row"
          />
          <LuggagePicker
            value={search.luggage}
            onChange={(luggage) => update({ luggage })}
            open={open === 'luggage'}
            onToggle={() => toggle('luggage')}
            onClose={close}
            triggerVariant="row"
          />
          <GenderPicker
            value={search.gender}
            passengers={search.passengers}
            onChange={(gender) => update({ gender })}
            open={open === 'gender'}
            onToggle={() => toggle('gender')}
            onClose={close}
            triggerVariant="row"
          />
          <SeatPicker
            value={search.seat}
            onChange={(seat) => update({ seat })}
            open={open === 'seat'}
            onToggle={() => toggle('seat')}
            onClose={close}
            triggerVariant="row"
          />
          <CarPicker
            value={search.car}
            onChange={(car) => update({ car })}
            open={open === 'car'}
            onToggle={() => toggle('car')}
            onClose={close}
            triggerVariant="row"
          />
        </div>
        <Button className="mb-2.5 mt-1 h-12 w-full rounded-2xl text-[15px] font-extrabold" onClick={() => navigate('/results')}>
          Safar topish
        </Button>
      </div>
    </section>
  )
}
