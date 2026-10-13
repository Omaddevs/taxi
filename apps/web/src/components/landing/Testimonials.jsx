import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle, Star } from 'lucide-react'
import { t } from '../../i18n'

/* Foydalanuvchilar fikrlari. Ustunlar cheksiz yuqoriga/pastga suzib turadi (CSS animatsiya,
   ro‘yxat ikki nusxada — -50% ga yetganda boshiga sezilmasdan qaytadi). Sichqoncha ustiga
   kelganda to‘xtaydi; prefers-reduced-motion yoqilgan bo‘lsa harakat o‘chadi.
   DIQQAT: quyidagi sharhlar namuna — saytga chiqarishdan oldin haqiqiy foydalanuvchi fikrlari bilan almashtiring. */
const REVIEWS = [
  { name: 'Dilnoza', role: 'Yo‘lovchi', city: 'Toshkent', text: 'Toshkentdan Samarqandga ketish uchun 10 daqiqada haydovchi topdim. Narx oldindan ma’lum, hech qanday kutilmagan to‘lov yo‘q.', tone: 'brand' },
  { name: 'Jasur', role: 'Haydovchi', city: 'Farg‘ona', text: 'Yo‘nalishimni qo‘yib qo‘yaman — yo‘lovchilar o‘zi yozadi. Endi bekatda soatlab kutib turmayman.', tone: 'light' },
  { name: 'Malika', role: 'Yo‘lovchi', city: 'Buxoro', text: 'Ayollar uchun alohida joy tanlash mumkinligi juda yoqdi. Oilam bilan xotirjam yo‘lga chiqdim.', tone: 'dark' },
  { name: 'Sardor', role: 'Haydovchi', city: 'Andijon', text: 'Bo‘sh joyga posilka olib ketaman — har safarda qo‘shimcha daromad chiqadi.', tone: 'light' },
  { name: 'Nodira', role: 'Yo‘lovchi', city: 'Namangan', text: 'Haydovchining profili, mashinasi va reytingini oldindan ko‘raman. Kim bilan ketishimni bilaman.', tone: 'brand' },
  { name: 'Bekzod', role: 'Yo‘lovchi', city: 'Qarshi', text: 'Kechasi soat 2 da qo‘llab-quvvatlashga yozdim — darrov javob berishdi. Rahmat!', tone: 'light' },
  { name: 'Aziz', role: 'Haydovchi', city: 'Toshkent', text: 'Ro‘yxatdan o‘tish Telegram orqali bir daqiqa. Hujjatlarni tekshirishdi va ertasi kuni ishga chiqdim.', tone: 'dark' },
  { name: 'Gulnora', role: 'Yo‘lovchi', city: 'Xiva', text: 'Onamga Toshkentdan dori jo‘natdim, shu kuni kechqurun qo‘liga tegdi.', tone: 'brand' },
  { name: 'Otabek', role: 'Yo‘lovchi', city: 'Navoiy', text: 'Ilova juda tez ishlaydi. Manzilni yozaman — bir necha soniyada takliflar chiqadi.', tone: 'light' },
  { name: 'Rustam', role: 'Haydovchi', city: 'Samarqand', text: 'Qaytishda bo‘sh kelardim, endi ikki tomonga ham yo‘lovchi topaman.', tone: 'brand' },
  { name: 'Shahzoda', role: 'Yo‘lovchi', city: 'Jizzax', text: 'SOS tugmasi borligini bilib, kechki safarlarda ancha xotirjamman.', tone: 'dark' },
  { name: 'Ulug‘bek', role: 'Yo‘lovchi', city: 'Termiz', text: 'Haydovchi bilan ilova ichida yozishdim, raqamimni hech kimga berishim shart bo‘lmadi.', tone: 'light' },
]

const AVATAR_TONES = ['bg-[#ffd6a5] text-[#7a4a12]', 'bg-[#caffbf] text-[#2b6a1f]', 'bg-[#bde0fe] text-[#1d4e89]', 'bg-[#ffc6ff] text-[#7a2277]', 'bg-[#fdffb6] text-[#6b6a12]', 'bg-[#e0f9fb] text-[#00737b]']

const BUBBLE_TONES = {
  brand: 'bg-brand text-ink shadow-[0_18px_40px_-18px_rgba(0,199,212,0.75)]',
  light: 'bg-[#f3f4f6] text-ink shadow-[0_10px_30px_-18px_rgba(15,29,42,0.25)]',
  dark: 'bg-[#1d2229] text-white shadow-[0_18px_40px_-20px_rgba(15,29,42,0.7)]',
}

const TAIL_TONES = { brand: 'bg-brand', light: 'bg-[#f3f4f6]', dark: 'bg-[#1d2229]' }

function Bubble({ review, index }) {
  // Avatar navbat bilan chap va o‘ng tomonda — rasmdagidek "suhbat" ko‘rinishi.
  const right = index % 2 === 1
  return (
    <figure className={`flex items-end gap-3 pb-6 ${right ? 'flex-row-reverse pl-6' : 'pr-6'}`}>
      <div className="flex shrink-0 flex-col items-center gap-1">
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-extrabold ring-4 ring-white ${AVATAR_TONES[index % AVATAR_TONES.length]}`}
        >
          {t(review.name)[0]}
        </span>
      </div>
      <div className={`relative rounded-[22px] px-5 py-4 ${BUBBLE_TONES[review.tone]} ${right ? 'rounded-br-md' : 'rounded-bl-md'}`}>
        <span aria-hidden="true" className={`absolute bottom-0 h-3 w-3 ${TAIL_TONES[review.tone]} ${right ? '-right-1 [clip-path:polygon(0_0,0_100%,100%_100%)]' : '-left-1 [clip-path:polygon(100%_0,0_100%,100%_100%)]'}`} />
        <div className="flex gap-0.5" aria-label={t('5 yulduz')}>
          {[0, 1, 2, 3, 4].map((s) => (
            <Star key={s} className={`h-3.5 w-3.5 ${review.tone === 'brand' ? 'fill-white text-white' : 'fill-[#ffb703] text-[#ffb703]'}`} />
          ))}
        </div>
        <blockquote className="mt-2 text-[14px] leading-[1.5] 2xl:text-[15px]">{t(review.text)}</blockquote>
        <figcaption className={`mt-3 text-[12px] font-semibold ${review.tone === 'dark' ? 'text-white/60' : 'text-ink/60'}`}>
          <span className={review.tone === 'dark' ? 'text-white' : 'text-ink'}>{t(review.name)}</span> · {t(review.role)}, {t(review.city)}
        </figcaption>
      </div>
    </figure>
  )
}

function Column({ items, offset, reverse, duration, className = '' }) {
  return (
    <div className={`testimonial-col relative overflow-hidden ${className}`}>
      <div
        className="testimonial-track"
        style={{ animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {[...items, ...items].map((r, i) => (
          // Ikkinchi nusxa ekran o‘quvchilar uchun yashirin — sharh ikki marta o‘qilmasin.
          <div key={`${r.name}-${i}`} aria-hidden={i >= items.length ? 'true' : undefined}>
            <Bubble review={r} index={i + offset} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Testimonials() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  // Bo‘lim ko‘rinishga kirganda sarlavha va ustunlar yumshoq paydo bo‘ladi.
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const cols = [REVIEWS.filter((_, i) => i % 3 === 0), REVIEWS.filter((_, i) => i % 3 === 1), REVIEWS.filter((_, i) => i % 3 === 2)]
  const reveal = (delay) => ({
    className: `transition-all duration-1000 ease-[cubic-bezier(.22,.8,.3,1)] ${shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`,
    style: { transitionDelay: `${delay}ms` },
  })

  return (
    <section ref={ref} id="reviews" aria-label={t('Foydalanuvchilar fikrlari')} className="mx-auto max-w-site scroll-mt-24 px-3 pb-20 sm:px-6">
      <div className="relative overflow-hidden rounded-[32px] bg-white px-4 pb-14 pt-14 ring-1 ring-line sm:rounded-[44px] sm:px-10 sm:pt-20 lg:px-16">
        {/* Rasmdagidek nozik katakli fon — markazda ko‘rinadi, chetlarga qarab yo‘qoladi */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(#eceef2_1px,transparent_1px),linear-gradient(90deg,#eceef2_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60%] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />

        <div className="relative text-center" {...reveal(0)}>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-[12px] font-bold uppercase tracking-[0.06em] text-brand-dark">
            <MessageCircle className="h-4 w-4" />
            {t('Foydalanuvchilar fikrlari')}
          </span>
          <h2 className="mx-auto mt-5 max-w-[760px] text-[32px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[46px] 2xl:text-[56px]">
            {t('Yo‘lovchi va haydovchilar biz haqimizda')}
          </h2>
        </div>

        <div
          style={reveal(150).style}
          className={`testimonial-board relative mx-auto mt-10 grid h-[560px] max-w-[1200px] grid-cols-1 gap-6 [mask-image:linear-gradient(180deg,transparent,#000_14%,#000_86%,transparent)] sm:mt-14 sm:h-[620px] sm:grid-cols-2 lg:grid-cols-3 ${reveal(150).className}`}
        >
          <Column items={cols[0]} offset={0} duration={38} />
          <Column items={cols[1]} offset={1} duration={46} reverse className="hidden sm:block" />
          <Column items={cols[2]} offset={0} duration={42} className="hidden lg:block" />
        </div>

        <div className="relative mt-8 text-center" {...reveal(300)}>
          <h3 className="text-[28px] font-extrabold tracking-tight text-ink sm:text-[38px]">{t('Siz ham qo‘shiling')}</h3>
          <p className="mx-auto mt-2 max-w-[460px] text-[15px] text-muted">{t('Bir daqiqada ro‘yxatdan o‘ting va birinchi safaringizni bugunoq rejalashtiring.')}</p>
          <Link
            to="/register"
            className="group mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#1d2229] px-7 text-[13px] font-extrabold uppercase tracking-[0.04em] text-white transition hover:bg-black 2xl:h-14"
          >
            {t('Ro‘yxatdan o‘tish')}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
