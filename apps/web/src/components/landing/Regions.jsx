import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, MapPin, Smile, Star, Users } from 'lucide-react'
import { TourStage } from './tour/TourStage'
import { api } from '../../lib/api'
import { t } from '../../i18n'

// Landing: "go anywhere" header, the full-width tour stage (Uzbekistan in 3D; each leg dives
// into a 3D city drive to the region's landmark — tour/TourStage), then the platform's numbers.
const REGION_COUNT = 14

function useInView(threshold = 0.3) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, inView]
}

function CountUp({ value, run, suffix = '' }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!run || value == null) return undefined
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(value)
      return undefined
    }
    let frame
    const start = performance.now()
    const dur = 1600
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / dur)
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, run])
  return (
    <>
      {value == null ? '—' : shown.toLocaleString('uz-UZ').replace(/,/g, ' ')}
      {t(suffix)}
    </>
  )
}

/* ── Yo‘nalishlar bo‘ylab yuradigan taksilar ────────────────────────────────────────────────
   Silliqlik uchun: har bir yo‘l oldindan 240 nuqtaga bo‘linadi (jadval), kadrlar orasida
   chiziqli interpolyatsiya qilinadi; faqat GPU'dagi `transform` o‘zgaradi (layout yo‘q);
   konteyner o‘lchami ResizeObserver orqali keshlanadi; burilish burchagi yumshatiladi.
   Taksi yo‘l bo‘ylab bir tomonga bir xil tezlikda yuradi, oxirida asta yo‘qolib, boshida
   qayta paydo bo‘ladi — keskin orqaga burilish yo‘q. */
export function Regions() {
  const [stats, setStats] = useState(null)
  const [ref, inView] = useInView(0.2)

  useEffect(() => {
    api
      .get('/stats')
      .then(setStats)
      .catch(() => setStats({ regions: REGION_COUNT, users: null, drivers: null, happyClients: null, avgRating: null }))
  }, [])

  const cards = [
    { icon: MapPin, value: stats?.regions ?? REGION_COUNT, label: 'hudud', hint: t('Qoraqalpog‘istondan Andijongacha') },
    { icon: Users, value: stats?.users, label: 'foydalanuvchi', hint: t('TaxiLine’da ro‘yxatdan o‘tgan') },
    { icon: Car, value: stats?.drivers, label: t('tasdiqlangan haydovchi'), hint: t('Hujjatlari tekshirilgan') },
    {
      icon: Smile,
      value: stats?.happyClients,
      label: t('mamnun mijoz'),
      hint: stats?.avgRating ? t('O‘rtacha baho {0} ★', stats.avgRating) : t('Haydovchini 4–5 yulduzga baholagan'),
    },
  ]

  return (
    <section ref={ref} id="regions" className="relative scroll-mt-24 overflow-hidden pb-20 pt-4">
      <div className="mx-auto max-w-site px-5 text-center sm:px-6">
        <h2 className="mx-auto max-w-[760px] text-[36px] font-semibold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[52px] 2xl:max-w-[980px] 2xl:text-[66px]">
          {t('Istalgan manzilga,')}
          <br />
          {t('o‘zingiz xohlagandek yeting')}
        </h2>
        <p className="mx-auto mt-5 max-w-[520px] text-[15px] leading-[1.6] text-ink/60 sm:text-[17px] 2xl:max-w-[640px] 2xl:text-[20px]">
          {t('Bir necha daqiqada taksi chaqiring, o‘tiring va manzilingizga TaxiLine bilan xavfsiz hamda arzon yetib boring.')}
        </p>
        <Link
          to="/taxi"
          className="mt-8 inline-flex h-12 items-center rounded-full bg-[#1d2229] px-7 text-[15px] font-semibold text-white shadow-[0_14px_28px_-10px_rgba(15,29,42,0.55)] transition hover:-translate-y-0.5 hover:bg-black 2xl:h-14 2xl:px-9 2xl:text-[17px]"
        >
          {t('Taxi chaqirish')}
        </Link>
      </div>

      <div className="mt-10 sm:mt-12">
        <TourStage />
      </div>

      {/* Statistika */}
      <div className="mx-auto mt-10 grid max-w-site grid-cols-2 gap-3 px-3 sm:mt-14 sm:gap-4 sm:px-6 lg:grid-cols-4">
        {cards.map(({ icon: Icon, value, label, hint }, i) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-[24px] p-5 sm:rounded-[28px] sm:p-7 2xl:p-8 ${i === 0 ? 'bg-[#1d2229] text-white' : 'bg-[#f3f4f6] text-ink'}`}
          >
            {i === 0 ? <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 -right-10 h-36 w-36 rounded-full bg-brand" /> : null}
            <span
              className={`relative flex h-10 w-10 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${i === 0 ? 'bg-white/10 text-brand' : 'bg-white text-brand-dark'}`}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <p className="relative mt-5 text-[34px] font-extrabold leading-none tracking-tight sm:text-[46px] 2xl:text-[56px]">
              <CountUp value={value} run={inView} />
            </p>
            <p className={`relative mt-2 text-[14px] font-bold sm:text-[16px] 2xl:text-[18px] ${i === 0 ? 'text-white' : 'text-ink'}`}>{t(label)}</p>
            <p className={`relative mt-1 text-[12px] leading-snug sm:text-[13px] 2xl:text-[15px] ${i === 0 ? 'text-white/60' : 'text-ink/55'}`}>
              {t(hint)}
            </p>
          </div>
        ))}
      </div>

      {stats?.avgRating ? (
        <p className="mt-6 flex items-center justify-center gap-1.5 text-[14px] font-semibold text-ink/60">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {t('Mijozlarimizning o‘rtacha bahosi:')}{' '}{stats.avgRating} / 5
        </p>
      ) : null}
    </section>
  )
}
