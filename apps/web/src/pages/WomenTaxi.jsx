import { useRef, useState } from 'react'
import { ArrowRight, BadgeCheck, Headphones, MapPinned, ShieldCheck, Siren, UserRoundCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { isDriverUser } from '../lib/role'
import { t } from '../i18n'

// Landing sahifasidagi hero bilan bir xil vizual til, lekin pushti rangda (mashina ham hue-rotate bilan pushti): kulrang + pushti panel, katta "T" shakli,
// qorong‘i "nega biz" bloki va varaqlanadigan kartalar.
const FEATURES = [
  { icon: UserRoundCheck, title: 'Ayol haydovchilar', text: 'Buyurtmangiz avval hujjati tekshirilgan ayol haydovchilarga boradi', tone: 'brand' },
  { icon: MapPinned, title: 'Jonli GPS', text: 'Safaringizni yaqinlaringiz real vaqtda kuzatadi', tone: 'light' },
  { icon: Siren, title: 'SOS tugmasi', text: 'Bir bosishda ishonchli kontaktlar va yordam xizmati', tone: 'brand' },
  { icon: Headphones, title: '24/7 yordam', text: 'Qo‘llab-quvvatlash safar davomida aloqada', tone: 'light' },
]

const STEPS = [
  { title: 'Manzilni kiriting', text: 'Qayerdan va qayerga borishingizni tanlang' },
  { title: 'So‘rov yuboring', text: 'Avval ayol haydovchilar ko‘radi, 5 daqiqadan keyin — barcha haydovchilar' },
  { title: 'Xotirjam yetib boring', text: 'Safar GPS va SOS himoyasi ostida o‘tadi' },
]

function CarImage({ className = '' }) {
  return (
    <picture>
      <source type="image/webp" srcSet="/landing/taxi-car-sm.webp 520w, /landing/taxi-car.webp 1400w" sizes="(min-width: 1024px) 560px, 100vw" />
      <img
        src="/landing/taxi-car.png"
        alt={t('TaxiLine avtomobili')}
        width={2017}
        height={694}
        className={`select-none ${className}`}
        style={{ filter: 'hue-rotate(150deg) saturate(1.2)' }}
        draggable={false}
      />
    </picture>
  )
}

function FeatureCard({ icon: Icon, title, text, tone }) {
  const brand = tone === 'brand'
  return (
    <article
      className={`flex h-[200px] w-[158px] shrink-0 snap-start flex-col rounded-[16px] p-5 text-ink sm:h-[214px] sm:w-[168px] ${
        brand ? 'bg-[#f5559a]' : 'bg-white'
      }`}
    >
      <Icon className={`h-9 w-9 ${brand ? 'text-ink' : 'text-[#f5559a]'}`} strokeWidth={1.7} />
      <h3 className="mt-auto text-[18px] font-extrabold leading-[1.15] tracking-tight">{t(title)}</h3>
      <p className={`mt-2 text-[12px] leading-[1.4] ${brand ? 'text-ink/85' : 'text-ink/70'}`}>{t(text)}</p>
    </article>
  )
}

export default function WomenTaxi() {
  const navigate = useNavigate()
  const { setSearch } = useApp()
  const { authUser } = useAuth()
  const isDriver = isDriverUser(authUser)
  const scroller = useRef(null)
  const [page, setPage] = useState(0)
  const pages = 2

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setPage(max > 0 && el.scrollLeft > max / 2 ? 1 : 0)
  }

  const next = () => {
    const el = scroller.current
    if (!el) return
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + el.clientWidth, behavior: 'smooth' })
  }

  const start = () => {
    if (isDriver) {
      navigate(-1)
      return
    }
    setSearch((s) => ({ ...s, service: 'women' }))
    navigate('/women/taxi')
  }

  const dots = (
    <div className="flex gap-2" aria-hidden>
      {Array.from({ length: pages }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i === page ? 'w-6 bg-[#f5559a]' : 'w-1.5 bg-white/30'}`} />
      ))}
    </div>
  )

  return (
    <div className="-mx-4 -mt-4 pb-6 lg:mx-0 lg:mt-0">
      <section className="relative overflow-hidden rounded-b-[28px] bg-[#f3f4f6] sm:rounded-[32px] lg:rounded-[40px]">
        <div className="relative grid lg:grid-cols-2">
          {/* ── Chap panel: sarlavha va avtomobil ── */}
          <div className="relative px-5 pb-2 pt-8 sm:px-10 lg:px-12 lg:pb-[190px] lg:pt-12">
            <svg
              aria-hidden="true"
              viewBox="0 0 600 600"
              className="pointer-events-none absolute -left-10 top-0 w-[420px] sm:w-[560px] lg:-left-14 lg:w-[620px]"
            >
              <path d="M40 150 H 560 M300 150 V 700" fill="none" stroke="#e7e9ed" strokeWidth="110" strokeLinecap="butt" />
            </svg>

            <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#d6337f] shadow-sm">
              <ShieldCheck className="h-4 w-4" /> {t('TaxiLine Women')}
            </span>

            <h1 className="relative mt-6 text-[38px] font-extrabold leading-[1.06] tracking-tight text-ink sm:text-[50px] lg:mt-10 lg:text-[52px] xl:text-[60px]">
              {t('Ayollar uchun')}
              <br />
              {t('xavfsiz taxi')}
            </h1>

            <div className="relative z-20 -mx-3 -mb-14 mt-4 sm:mx-6 sm:-mb-20 lg:hidden">
              <CarImage className="h-auto w-full drop-shadow-[0_22px_18px_rgba(15,29,42,0.28)]" />
            </div>
          </div>

          {/* ── O‘ng panel: pushti rang, taklif va tugma ── */}
          <div className="relative overflow-hidden bg-[#f5559a] px-5 pb-14 pt-20 sm:px-10 sm:pt-28 lg:overflow-visible lg:px-12 lg:pb-[150px] lg:pt-12">
            <svg
              aria-hidden="true"
              viewBox="0 0 600 600"
              className="pointer-events-none absolute -right-16 top-6 w-[420px] sm:w-[540px] lg:-right-10 lg:w-[600px]"
            >
              <path d="M40 80 H 330 M185 80 V 600" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="92" />
              <path d="M330 80 H 600 L 420 600" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="92" strokeLinejoin="miter" />
            </svg>

            <h2 className="relative text-[30px] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[40px] lg:mt-[68px] lg:text-[36px] xl:text-[42px]">
              {t('Avval —')}
              <br />
              {t('ayol haydovchilar')}
            </h2>
            <p className="relative mt-4 max-w-[420px] text-[15px] leading-[1.5] text-ink/85 sm:text-[17px]">
              {t('Buyurtmangiz avval tasdiqlangan ayol haydovchilarga yuboriladi. 5 daqiqada hech kim olmasa, barcha haydovchilarga ochiladi — kutib qolmaysiz.')}
            </p>

            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={start}
                className="spin-border flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-ink px-8 text-[14px] font-bold uppercase tracking-[0.03em] text-white shadow-[0_10px_20px_rgba(15,29,42,0.25)] transition hover:bg-[#0f1d2a]"
              >
                {isDriver ? t('Tushunarli') : t('Taxi chaqirish')}
                {isDriver ? null : <ArrowRight className="h-4 w-4" />}
              </button>
              {isDriver ? null : (
                <Link
                  to="/become-driver"
                  className="flex h-12 items-center justify-center rounded-full bg-white/25 px-6 text-[14px] font-bold text-ink transition hover:bg-white/40"
                >
                  {t('Haydovchi bo‘lish')}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Pastki qorong‘i blok — "nega ayollar bizni tanlashadi" ── */}
        <div className="relative z-10 -mt-8 rounded-[28px] bg-[#1d2229] sm:-mt-10 sm:rounded-[32px] lg:rounded-[40px]">
          <div className="pointer-events-none absolute bottom-[calc(100%-28px)] left-[3%] z-20 hidden w-[44%] lg:block">
            <CarImage className="h-auto w-full drop-shadow-[0_26px_22px_rgba(0,0,0,0.35)]" />
          </div>

          <div className="grid gap-8 px-5 pb-8 pt-12 sm:px-10 sm:pb-10 sm:pt-16 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 lg:px-12 lg:pb-14 lg:pt-20">
            <div className="min-w-0">
              <h2 className="text-[28px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[38px] xl:text-[44px]">
                {t('Nega ayollar')}
                <br />
                {t('bizni tanlashadi')}
              </h2>
              <p className="mt-4 text-[15px] leading-[1.5] text-white/75 sm:text-[17px]">
                {t('xavfsizlik uchun nimalar qilinganini')}
                <br className="hidden sm:block" /> {t('kartalarga jamladik')}
              </p>
              <div className="mt-10 hidden lg:block">{dots}</div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-3 lg:gap-5">
                <div
                  ref={scroller}
                  onScroll={onScroll}
                  className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto sm:gap-4 lg:w-[352px] lg:flex-none"
                >
                  {FEATURES.map((f) => (
                    <FeatureCard key={f.title} {...f} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={next}
                  aria-label={t('Keyingi')}
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10 sm:flex"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-6 lg:hidden">{dots}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Qanday ishlaydi ── */}
      <section className="mt-6 px-4 lg:mt-8 lg:px-0">
        <h2 className="text-[24px] font-extrabold tracking-tight text-ink sm:text-[30px]">{t('Qanday ishlaydi')}</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-[20px] bg-white p-5 sm:flex-col sm:gap-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f5559a] text-[17px] font-extrabold text-ink">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[17px] font-extrabold leading-tight tracking-tight text-ink">{t(step.title)}</span>
                <span className="mt-1 block text-[13px] leading-[1.45] text-muted">{t(step.text)}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-3 flex items-center gap-3 rounded-[20px] bg-white p-4 text-[13px] text-muted">
          <BadgeCheck className="h-5 w-5 shrink-0 text-[#f5559a]" />
          {t('Har bir ayol haydovchi hujjat va shaxsini tasdiqlash bosqichidan o‘tadi.')}
        </div>
      </section>
    </div>
  )
}
