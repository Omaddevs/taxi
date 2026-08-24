import { ChevronRight, MapPin, Menu, ScanLine, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ecosystem } from '../../data/ecosystem'
import { EcosystemIcon } from '../icons/EcosystemIcon'

const featured = [
  {
    to: '/ride',
    title: 'Taxi',
    hint: 'Tajribali va ishonchli taxilar',
    bg: 'bg-[#f4f5f7]',
    art: 'taxi',
  },
  {
    to: '/cargo',
    title: 'Yetkazish',
    hint: 'Hujjat, posilka, gul',
    bg: 'bg-[#fff6e8]',
    art: 'delivery',
  },
  {
    to: '/roadside',
    title: 'Yo‘lda yordam',
    hint: 'Usta · evakuator',
    bg: 'bg-[#ffecec]',
    art: 'tow',
    badge: 'SOS',
  },
  {
    to: '/fuel',
    title: 'Yoqilg‘i',
    hint: 'Yoqilg‘i shahobchasi',
    bg: 'bg-[#eef8f0]',
    art: 'fuel',
    badge: '-3%',
  },
]

const destinations = [
  { title: 'Toshkent, Amir Temur 45', sub: 'Qarshi → Toshkent', min: '5 soat' },
  { title: 'Qarshi avtovokzal', sub: 'Nasaf tumani, Qarshi', min: '12 daq' },
  { title: 'Samarqand, Registon', sub: 'Samarqand viloyati', min: '4 soat' },
]

function Art({ type }) {
  if (type === 'taxi') {
    return (
      <img
        src="/cars/cobalt.png"
        alt=""
        className="pointer-events-none absolute bottom-2 right-2 h-[72px] w-auto max-w-[75%] object-contain"
      />
    )
  }
  if (type === 'delivery') {
    return (
      <img
        src="/cars/delivery.png"
        alt=""
        className="pointer-events-none absolute bottom-0 right-0 h-[88px] w-auto max-w-[92%] object-contain"
      />
    )
  }
  if (type === 'tow') {
    return (
      <img
        src="/cars/tow.png"
        alt=""
        className="pointer-events-none absolute bottom-0 right-0 h-[88px] w-auto max-w-[92%] object-contain"
      />
    )
  }
  if (type === 'fuel') {
    return (
      <img
        src="/cars/fuel.png"
        alt=""
        className="pointer-events-none absolute bottom-0 right-0 h-[92px] w-auto max-w-[90%] object-contain"
      />
    )
  }
  return null
}

export function MobileHome() {
  const { setDrawerOpen, location, openLocationPicker, plusPlan, requestUserLocation } = useApp()
  const navigate = useNavigate()

  return (
    <div className="bg-white pb-4">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-white px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="relative flex h-10 w-10 items-center justify-center"
        >
          <Menu className="h-6 w-6" />
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            3
          </span>
        </button>
        <button
          type="button"
          onClick={openLocationPicker}
          className="min-w-0 flex-1 text-center"
          aria-label="Manzilni o‘zgartirish"
        >
          <p className="text-[17px] font-extrabold tracking-tight">TaxiLine</p>
          <p className="flex items-center justify-center gap-0.5 text-xs text-muted">
            <span className="max-w-[180px] truncate">{location.label}</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </p>
        </button>
        <Link
          to="/plus"
          className="flex h-8 items-center gap-1 rounded-full bg-gradient-to-r from-brand to-[#ff6b9d] px-3 text-xs font-extrabold text-white shadow-sm shadow-brand/30"
        >
          {plusPlan && plusPlan !== 'start' ? 'Plus' : '+ Plus'}
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4">
        {featured.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            onClick={() => {
              if (card.to === '/fuel') requestUserLocation()
            }}
            className={`relative min-h-[148px] overflow-hidden rounded-[22px] ${card.bg} px-4 pb-3 pt-4`}
          >
            {card.badge ? (
              <span className="absolute right-3 top-3 z-10 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {card.badge}
              </span>
            ) : null}
            <p className="relative z-10 text-[17px] font-extrabold">{card.title}</p>
            <p className="relative z-10 mt-0.5 max-w-[72%] text-xs leading-snug text-muted">{card.hint}</p>
            {['taxi', 'delivery', 'tow', 'fuel'].includes(card.art) ? (
              <Art type={card.art} />
            ) : (
              <div className="mt-3 flex justify-end">
                <Art type={card.art} />
              </div>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-4 px-4">
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
          {ecosystem
            .filter((s) => !['taxi', 'delivery', 'roadside', 'fuel'].includes(s.id))
            .map((item) => (
              <Link key={item.id} to={item.to} className="flex w-[72px] shrink-0 flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f5f7] text-slate-700">
                  <EcosystemIcon id={item.id} className={`h-6 w-6 ${item.id === 'sos' ? 'text-red-500' : ''}`} />
                </span>
                <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight">{item.title}</span>
              </Link>
            ))}
        </div>
        <div className="mt-2 flex justify-center gap-1">
          <span className="h-1.5 w-4 rounded-full bg-ink" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        </div>
      </div>

      <div className="mt-4 px-4">
        <Link
          to="/ride"
          className="flex h-12 items-center gap-3 rounded-2xl bg-[#f4f5f7] px-4 text-sm text-muted"
        >
          <Search className="h-5 w-5 text-ink" />
          <span className="flex-1 text-left font-medium">Qayerga ketamiz?</span>
          <ScanLine className="h-5 w-5" />
        </Link>

        <div className="mt-1 divide-y divide-line">
          {destinations.map((d) => (
            <button
              key={d.title}
              type="button"
              onClick={() => navigate('/ride')}
              className="flex w-full items-center gap-3 py-3.5 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f5f7]">
                <MapPin className="h-4 w-4 text-slate-500" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{d.title}</span>
                <span className="block truncate text-xs text-muted">{d.sub}</span>
              </span>
              <span className="text-xs text-muted">{d.min}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar mt-2 flex gap-3 overflow-x-auto px-4 pb-2">
        <Link
          to="/women"
          className="min-w-[220px] overflow-hidden rounded-[22px] bg-gradient-to-br from-brand to-brand-dark p-4 text-white"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">Xavfsizlik</p>
          <p className="mt-1 text-lg font-extrabold leading-tight">Ayollar uchun taxi</p>
          <p className="mt-1 text-xs text-white/80">Ayol haydovchi · SOS · GPS</p>
        </Link>
        <Link to="/ai" className="min-w-[220px] overflow-hidden rounded-[22px] bg-[#111827] p-4 text-white">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">TaxiLine AI</p>
          <p className="mt-1 text-lg font-extrabold leading-tight">Mashina nima bo‘ldi?</p>
          <p className="mt-1 text-xs text-white/80">Taxminiy yo‘nalish, aniq tashxis emas</p>
        </Link>
      </div>
    </div>
  )
}
