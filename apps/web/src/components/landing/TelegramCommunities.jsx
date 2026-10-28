import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Megaphone, Send, Users } from 'lucide-react'
import { t } from '../../i18n'

/* Telegram guruh va kanallarimiz — har bir karta yo‘nalishning ikki shahridagi mashhur joy
   rasmi bilan (yuqorida — qayerdan, pastda — qayerga). Har bir kartada Toshkent boshqa joy bilan.
   Kartalar to‘xtovsiz suzuvchi lenta: ro‘yxat ikki nusxada, siljish rAF orqali transform bilan
   (subpiksel — silliq), bir nusxa o‘tganda boshiga sezilmasdan qaytadi. Sichqoncha ustiga kelsa
   asta to‘xtaydi; barmoq/sichqoncha bilan surish va ← → tugmalari ishlaydi.
   Rasmlar: Wikimedia Commons (CC0 / CC BY / CC BY-SA) — mualliflar bo‘lim ostida ko‘rsatiladi. */
const PLACES = {
  tv: { src: '/routes/toshkent-teleminora.webp', label: 'Toshkent teleminorasi', credit: 'Nikol Khagay (CC BY-SA 4.0)' },
  nest: { src: '/routes/toshkent-nest-one.webp', label: 'Nest One, Toshkent Siti', credit: 'ShNajimova (CC BY 4.0)' },
  imom: { src: '/routes/toshkent-hazrati-imom.webp', label: 'Hazrati Imom majmuasi', credit: 'Bgag (CC0)' },
  minor: { src: '/routes/toshkent-minor.webp', label: 'Minor masjidi', credit: 'Yuriy Pavlovich (CC0)' },
  chorsu: { src: '/routes/toshkent-chorsu.webp', label: 'Chorsu bozori', credit: 'Adam Harangozó (CC BY-SA 4.0)' },
  citypark: { src: '/routes/toshkent-siti-bogi.webp', label: 'Toshkent Siti bog‘i', credit: 'Mysportedit (CC BY-SA 4.0)' },
  registon: { src: '/routes/samarqand-registon.webp', label: 'Registon maydoni', credit: 'Gustavo Jeronimo (CC BY 2.0)' },
  poikalon: { src: '/routes/buxoro-poi-kalon.webp', label: 'Poi Kalon, Buxoro', credit: 'Fulvio Spada (CC BY-SA 2.0)' },
  namangan: { src: '/routes/namangan-mulla-qirgiz.webp', label: 'Mulla Qirg‘iz madrasasi', credit: 'Ziqo (CC BY-SA 4.0)' },
  andijon: { src: '/routes/andijon-jome.webp', label: 'Devonaboy jome masjidi', credit: 'Petar Milošević (CC BY-SA 4.0)' },
  bobur: { src: '/routes/andijon-bobur-bogi.webp', label: 'Bobur bog‘i, Andijon', credit: 'Arina Pan (CC BY-SA 4.0)' },
  fargona: { src: '/routes/fargona-xudoyorxon.webp', label: 'Xudoyorxon o‘rdasi, Qo‘qon', credit: 'Bobyrr (CC BY-SA 4.0)' },
}

const COMMUNITIES = [
  { kind: 'channel', handle: 'taxiline_uzbekistan', title: 'TaxiLine rasmiy kanali', top: 'poikalon', bottom: 'citypark' },
  { kind: 'group', handle: 'namangan_toshkent_taxiline', from: 'Namangan', to: 'Toshkent', top: 'namangan', bottom: 'tv' },
  { kind: 'group', handle: 'samarqand_toshkent_taxiline', from: 'Samarqand', to: 'Toshkent', top: 'registon', bottom: 'nest' },
  { kind: 'group', handle: 'andijon_toshkent_taxiline', from: 'Andijon', to: 'Toshkent', top: 'andijon', bottom: 'imom' },
  { kind: 'group', handle: 'toshkent_andijon_taxiline', from: 'Toshkent', to: 'Andijon', top: 'chorsu', bottom: 'bobur' },
  { kind: 'group', handle: 'fargona_toshkent_taxiline', from: 'Farg‘ona', to: 'Toshkent', top: 'fargona', bottom: 'minor' },
]

// Rasmdagidek "suyuq" shakllar: yuqori rasmning o‘ng-pastki burchagi, pastki rasmning
// chap-yuqori burchagi yumshoq egri bilan kesilgan — ikkalasi bir-biriga oqib o‘tadi.
const CLIP_TOP = 'tl-clip-top'
const CLIP_BOTTOM = 'tl-clip-bottom'

function ClipDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        <clipPath id={CLIP_TOP} clipPathUnits="objectBoundingBox">
          <path d="M0.07,0 H0.93 Q1,0 1,0.06 V0.5 C1,0.68 0.9,0.74 0.74,0.78 C0.56,0.82 0.5,1 0.3,1 H0.07 Q0,1 0,0.94 V0.06 Q0,0 0.07,0 Z" />
        </clipPath>
        <clipPath id={CLIP_BOTTOM} clipPathUnits="objectBoundingBox">
          <path d="M0.93,1 H0.07 Q0,1 0,0.94 V0.5 C0,0.32 0.1,0.26 0.26,0.22 C0.44,0.18 0.5,0 0.7,0 H0.93 Q1,0 1,0.06 V0.94 Q1,1 0.93,1 Z" />
        </clipPath>
      </defs>
    </svg>
  )
}

function Card({ item, index, clone }) {
  const top = PLACES[item.top]
  const bottom = PLACES[item.bottom]
  const official = item.kind === 'channel'
  const title = official ? t(item.title) : `${t(item.from)} — ${t(item.to)}`
  const Icon = official ? Megaphone : Users

  return (
    <a
      href={`https://t.me/${item.handle}`}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      // Lentaning ikkinchi nusxasi faqat bezak: ekran o‘quvchi va Tab uni o‘tkazib yuboradi.
      aria-hidden={clone ? 'true' : undefined}
      tabIndex={clone ? -1 : undefined}
      aria-label={`${title} — ${official ? t('Telegram kanal') : t('Telegram guruh')}`}
      className={`group relative block aspect-[4/5] w-[78vw] max-w-[340px] shrink-0 select-none overflow-hidden rounded-[28px] outline-none transition-transform duration-500 ease-[cubic-bezier(.22,.8,.3,1)] hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brand sm:w-[320px] 2xl:w-[380px] 2xl:max-w-[380px] bg-white shadow-[0_14px_34px_-18px_rgba(15,29,42,0.28)] ring-1 ring-line`}
    >
      {/* Yuqori rasm — qayerdan */}
      <div className="absolute inset-x-2.5 top-2.5 h-[60%] overflow-hidden" style={{ clipPath: `url(#${CLIP_TOP})` }}>
        <img
          src={top.src}
          alt={t(top.label)}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,20,28,0.25)_0%,transparent_30%,transparent_45%,rgba(15,20,28,0.7)_100%)]" />
      </div>

      {/* Pastki rasm — qayerga */}
      <div className="absolute bottom-2.5 right-2.5 h-[46%] w-[74%] overflow-hidden" style={{ clipPath: `url(#${CLIP_BOTTOM})` }}>
        <img
          src={bottom.src}
          alt={t(bottom.label)}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
      </div>

      {/* Yuqori qator: joy nomi + strelka */}
      <span className="absolute left-5 top-5 max-w-[70%] truncate rounded-full bg-white/90 px-3 py-1.5 text-[11.5px] font-semibold text-ink backdrop-blur 2xl:text-[13px]">
        {t(top.label)}
      </span>
      <span className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink transition-colors duration-300 group-hover:bg-brand 2xl:h-10 2xl:w-10">
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>

      {/* Sarlavha — yuqori rasmning pastki chap qismida */}
      <div className="absolute left-5 right-[38%] top-[34%] text-white">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-white/80">
          <Icon className="h-3.5 w-3.5" />
          {String(index + 1).padStart(2, '0')}/ {official ? t('Rasmiy kanal') : t('Guruh')}
        </span>
        <h3 className="mt-1 text-[22px] font-extrabold leading-[1.1] tracking-tight [text-shadow:0_2px_14px_rgba(0,0,0,0.35)] 2xl:text-[27px]">{title}</h3>
      </div>

      {/* Pastki chap: qo‘shilish tugmasi */}
      <span
        className={`absolute bottom-[19%] left-5 inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-bold shadow-[0_10px_24px_-12px_rgba(15,29,42,0.45)] transition-colors duration-300 2xl:h-11 2xl:text-[14px] bg-white text-ink group-hover:bg-ink group-hover:text-white`}
      >
        <Send className="h-4 w-4" />
        {official ? t('Obuna bo‘lish') : t('Qo‘shilish')}
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
      </span>

      {/* Pastki rasm yorlig‘i */}
      <span className="absolute bottom-5 right-5 max-w-[60%] truncate rounded-full bg-white/90 px-3 py-1.5 text-[11.5px] font-semibold text-ink backdrop-blur 2xl:text-[13px]">
        {t(bottom.label)}
      </span>
    </a>
  )
}

const SPEED = 38 // px/soniya
const STEP_MS = 650

export function TelegramCommunities() {
  const sectionRef = useRef(null)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const visibleRef = useRef(false)
  // Animatsiya holati React'dan tashqarida — har kadrda qayta chizish bo‘lmasin.
  const motion = useRef({ offset: 0, speed: 0, hover: false, drag: null, tween: null, moved: false })
  const [shown, setShown] = useState(false)

  // Ko‘rinishga kirganda yumshoq paydo bo‘ladi; ekrandan chiqsa lenta to‘xtaydi.
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(
      ([e]) => {
        visibleRef.current = e.isIntersecting
        if (e.isIntersecting) setShown(true)
      },
      { threshold: 0.1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const m = motion.current
    let raf = 0
    let last = performance.now()

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(now - last, 64) / 1000
      last = now
      const track = trackRef.current
      if (!track || !visibleRef.current) return
      // Bir nusxaning uzunligi: ikkinchi nusxaning birinchi kartasigacha bo‘lgan masofa.
      const period = track.children[COMMUNITIES.length].offsetLeft - track.children[0].offsetLeft
      if (period <= 0) return

      // Tezlik keskin emas, asta o‘zgaradi — to‘xtash va qayta yurish ham silliq.
      const target = reduce || m.hover || m.drag || document.hidden ? 0 : SPEED
      m.speed += (target - m.speed) * Math.min(1, dt * 3)

      if (m.tween) {
        const p = Math.min(1, (now - m.tween.start) / STEP_MS)
        m.offset = m.tween.from + (m.tween.to - m.tween.from) * (1 - (1 - p) ** 3)
        if (p >= 1) m.tween = null
      } else if (!m.drag) {
        m.offset += m.speed * dt
      }

      // Cheksiz aylanish: [0, period) oralig‘ida ushlaymiz, surish/tugma holatini ham birga siljitamiz.
      const wrapped = ((m.offset % period) + period) % period
      const shift = wrapped - m.offset
      if (shift) {
        m.offset = wrapped
        if (m.tween) {
          m.tween.from += shift
          m.tween.to += shift
        }
        if (m.drag) m.drag.offset += shift
      }
      track.style.transform = `translate3d(${-m.offset}px,0,0)`
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ← → : bir karta qadamida yumshoq suriladi (ketma-ket bosilsa qadamlar qo‘shiladi).
  function step(dir) {
    const track = trackRef.current
    if (!track) return
    const m = motion.current
    const width = track.children[1].offsetLeft - track.children[0].offsetLeft
    const base = m.tween ? m.tween.to : m.offset
    m.tween = { from: m.offset, to: base + dir * width, start: performance.now() }
  }

  // Sichqoncha yoki barmoq bilan surish. 6px dan ko‘p surilsa — bu bosish emas, havola ochilmaydi.
  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const m = motion.current
    m.tween = null
    m.moved = false
    m.drag = { x: e.clientX, offset: m.offset, id: e.pointerId }
  }
  function onPointerMove(e) {
    const m = motion.current
    if (!m.drag || m.drag.id !== e.pointerId) return
    const dx = e.clientX - m.drag.x
    if (!m.moved && Math.abs(dx) > 6) {
      m.moved = true
      viewportRef.current?.setPointerCapture(e.pointerId)
    }
    if (m.moved) m.offset = m.drag.offset - dx
  }
  function onPointerUp(e) {
    const m = motion.current
    if (m.drag?.id === e.pointerId) m.drag = null
  }
  function onClickCapture(e) {
    if (!motion.current.moved) return
    e.preventDefault()
    e.stopPropagation()
    motion.current.moved = false
  }

  return (
    <section ref={sectionRef} id="telegram" aria-label={t('Telegram guruh va kanallarimiz')} className="mx-auto max-w-site scroll-mt-24 px-3 pb-20 sm:px-6">
      <ClipDefs />
      <div
        className={`relative overflow-hidden rounded-[32px] bg-white px-4 py-10 ring-1 ring-line transition-all duration-1000 ease-[cubic-bezier(.22,.8,.3,1)] sm:rounded-[40px] sm:px-10 sm:py-14 lg:px-14 2xl:px-20 2xl:py-20 ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Katta ekranda ikki qator: "… va" / "rasmiy kanalimiz — yo‘nalishingiz bo‘yicha" */}
        <h2 className="text-[28px] font-extrabold leading-[1.3] tracking-tight text-ink sm:text-[40px] 2xl:text-[52px]">
          <span className="whitespace-nowrap rounded-full border-2 border-brand/40 px-3 py-0.5">{t('Telegram guruhlarimiz')}</span> {t('va')}
          <br className="hidden xl:block" />{' '}
          <span className="xl:whitespace-nowrap">
            <span className="whitespace-nowrap rounded-full border-2 border-brand/40 bg-brand-soft px-3 py-0.5 text-brand-dark">{t('rasmiy kanalimiz')}</span>{' '}
            {/* Tire keyingi so‘zdan ajralmasin */}
            {t('— yo‘nalishingiz bo‘yicha').replace('— ', '— ')}
          </span>
        </h2>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <p className="max-w-[560px] text-[15px] leading-[1.55] text-muted sm:text-[16px] 2xl:text-[18px]">
            {t('Guruhlarda haydovchi va yo‘lovchilar bir-birini tez topadi, kanalda esa yangiliklar, aksiyalar va sovg‘ali o‘yinlar e’lon qilinadi.')}
          </p>

          <div className="flex gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label={t('Oldingi')}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink/10 text-ink transition hover:border-ink hover:bg-ink hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label={t('Keyingi')}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink/10 text-ink transition hover:border-ink hover:bg-ink hover:text-white"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') motion.current.hover = true
          }}
          onPointerLeave={() => {
            motion.current.hover = false
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
          onFocus={(e) => {
            // Tab bilan kelingan karta: brauzer o‘zi aylantirgan scroll'ni bekor qilib,
            // kartani lentaning o‘z siljishi bilan ko‘rinishga olib kelamiz.
            const m = motion.current
            m.hover = true
            const card = e.target.closest('a')
            const track = trackRef.current
            if (viewportRef.current) viewportRef.current.scrollLeft = 0
            if (card && track) m.tween = { from: m.offset, to: card.offsetLeft - track.children[0].offsetLeft, start: performance.now() }
          }}
          onBlur={() => {
            motion.current.hover = false
          }}
          className="-mx-4 mt-2 cursor-grab touch-pan-y overflow-hidden py-6 active:cursor-grabbing sm:-mx-10 sm:mt-4 lg:-mx-14 2xl:-mx-20"
        >
          <div ref={trackRef} className="flex w-max gap-4 px-4 will-change-transform sm:gap-5 sm:px-10 lg:px-14 2xl:px-20">
            {[...COMMUNITIES, ...COMMUNITIES].map((item, i) => (
              <Card key={`${item.handle}-${i}`} item={item} index={i % COMMUNITIES.length} clone={i >= COMMUNITIES.length} />
            ))}
          </div>
        </div>

        <p className="mt-6 text-[11.5px] leading-[1.5] text-ink/40">
          {t('Rasmlar: Wikimedia Commons')} — {Object.values(PLACES).map((p) => p.credit).join(', ')}
        </p>
      </div>
    </section>
  )
}
