import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const AUTOPLAY_MS = 4200
const RESUME_MS = 6000

const slides = [
  {
    id: 'wash',
    to: '/hub/wash',
    badge: '-30%',
    title: 'Yozgi chegirmalar!',
    text: 'Moyka va detailing xizmatlariga 30% gacha chegirma',
    cta: 'Batafsil',
    theme: 'from-brand via-[#e5195f] to-[#b3124b] text-white',
    art: '/cars/cobalt.png',
    artClass: 'bottom-0 right-0 h-[104px]',
  },
  {
    id: 'parts',
    to: '/hub/auto-service',
    title: 'Ehtiyot qismlar',
    text: 'Original va sifatli mahsulotlar',
    cta: 'Mahsulotlar',
    theme: 'from-[#1f2937] via-[#111827] to-[#0b1120] text-white',
    photo: '/cars/banner-parts.jpg',
  },
  {
    id: 'fuel',
    to: '/fuel',
    badge: '-3%',
    title: 'Yoqilg‘i keshbek',
    text: 'Har quyishda keshbek qaytadi',
    cta: 'Shahobchalar',
    theme: 'from-[#0f766e] via-[#0d9488] to-[#065f52] text-white',
    art: '/cars/fuel.png',
    artClass: 'bottom-0 right-0 h-[96px]',
  },
  {
    id: 'plus',
    to: '/plus',
    title: 'TaxiLine Plus',
    text: 'Arzon safar va maxsus takliflar',
    cta: 'Plus olish',
    theme: 'from-[#4c1d95] via-[#6d28d9] to-[#3b0f7a] text-white',
    photo: '/cars/banner-plus.jpg',
  },
]

export function PromoCarousel() {
  const trackRef = useRef(null)
  const pauseRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const [index, setIndex] = useState(0)

  const goTo = useCallback((i) => {
    const el = trackRef.current
    const card = el?.children?.[i]
    if (!el || !card) return
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: 'smooth' })
  }, [])

  // Touch/hover pauses autoplay, then it restarts on its own.
  const holdAutoplay = useCallback(() => {
    setPaused(true)
    clearTimeout(pauseRef.current)
    pauseRef.current = setTimeout(() => setPaused(false), RESUME_MS)
  }, [])

  useEffect(() => () => clearTimeout(pauseRef.current), [])

  useEffect(() => {
    if (paused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setTimeout(() => goTo((index + 1) % slides.length), AUTOPLAY_MS)
    return () => clearTimeout(id)
  }, [index, paused, goTo])

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    let nearest = 0
    let best = Infinity
    Array.from(el.children).forEach((card, i) => {
      const gap = Math.abs(card.offsetLeft - el.offsetLeft - el.scrollLeft)
      if (gap < best) {
        best = gap
        nearest = i
      }
    })
    setIndex(nearest)
  }

  return (
    <div className="mt-4">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          onPointerDown={holdAutoplay}
          onMouseEnter={holdAutoplay}
          onTouchStart={holdAutoplay}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1"
        >
          {slides.map((slide) => (
            <Link
              key={slide.id}
              to={slide.to}
              className={`relative h-[118px] w-[86%] shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br px-4 py-3.5 sm:w-[70%] lg:w-[46%] ${slide.theme}`}
            >
              {slide.photo ? (
                // Chapdan o‘ngga mask rasmni karta foniga qo‘shib yuboradi.
                <img
                  src={slide.photo}
                  alt=""
                  loading="lazy"
                  className="pointer-events-none absolute inset-y-0 right-0 h-full w-[58%] object-cover [-webkit-mask-image:linear-gradient(to_right,transparent,#000_45%)] [mask-image:linear-gradient(to_right,transparent,#000_45%)]"
                />
              ) : null}
              {slide.art ? (
                <img
                  src={slide.art}
                  alt=""
                  loading="lazy"
                  className={`pointer-events-none absolute max-w-[52%] object-contain ${slide.artClass}`}
                />
              ) : null}
              {slide.badge ? (
                <span className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-brand shadow-md">
                  {slide.badge}
                </span>
              ) : null}
              <p className="relative z-10 max-w-[62%] text-[17px] font-extrabold leading-tight">{slide.title}</p>
              <p className="relative z-10 mt-1 max-w-[56%] text-[11px] leading-snug text-white/80">{slide.text}</p>
              <span className="absolute bottom-3.5 left-4 z-10 inline-flex h-7 items-center gap-1 rounded-full bg-white/95 px-3 text-[11px] font-extrabold text-ink">
                {slide.cta}
                <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            holdAutoplay()
            goTo((index + 1) % slides.length)
          }}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-md"
          aria-label="Keyingi reklama"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex justify-center">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => {
              holdAutoplay()
              goTo(i)
            }}
            aria-label={`${i + 1}-reklama`}
            aria-current={index === i ? 'true' : undefined}
            className="flex h-6 items-center px-1"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                index === i ? 'w-4 bg-brand' : 'w-1.5 bg-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
