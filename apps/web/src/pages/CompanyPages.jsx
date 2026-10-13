import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ArrowUpRight, Bot, Briefcase, Car, Check, CircleHelp, Code2, Handshake, Headset, MapPin, Phone, RefreshCw, Send, ShieldCheck, Star, UserPlus, Users } from 'lucide-react'
import { api } from '../lib/api'
import { PublicPage } from './PublicPages'
import { TEAM_MEMBERS } from '../data/team'
import { isCompletePhoneUz, maskLocalPhoneUz, maskPhoneUz, toE164Uz } from '../lib/utils'
import { t } from '../i18n'

// "Kompaniya" menyusidagi sahifalar: Bizning jamoa (/jamoa) va Aloqa (/aloqa).

const section = 'mx-auto max-w-site px-3 sm:px-6'
const number = (value) => new Intl.NumberFormat('ru-RU').format(value)

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

// What the team is made of — the same lines of work the product itself is run by.
const DIRECTIONS = [
  {
    icon: Headset,
    title: 'Yordam xizmati',
    text: 'Yo‘lovchi va haydovchilarning savollariga telefon hamda Telegram orqali javob beradi, muammolarni oxirigacha hal qiladi.',
  },
  {
    icon: ShieldCheck,
    title: 'Haydovchilar bilan ishlash',
    text: 'Arizalarni ko‘rib chiqadi, hujjat va avtomobilni tekshiradi — platformaga faqat tasdiqlangan haydovchilar qo‘shiladi.',
  },
  {
    icon: Handshake,
    title: 'Hamkorlik va biznes',
    text: 'Kompaniyalar va hamkorlar bilan ishlaydi, yangi yo‘nalish va hududlarni ishga tushiradi.',
  },
  {
    icon: Code2,
    title: 'Mahsulot va texnologiya',
    text: 'Sayt, ilova va Telegram botlarni yaratadi hamda har kuni qulayroq qilib boradi.',
  },
]

// What we hold ourselves to — each one is something the product already does.
const PRINCIPLES = [
  {
    title: 'Qulaylik',
    text: 'Buyurtma bir necha bosishda beriladi: manzil, vaqt, o‘rindiq va narxni o‘zingiz tanlaysiz — haydovchini topishni platforma o‘z zimmasiga oladi.',
  },
  {
    title: 'Xavfsizlik',
    text: 'Har bir haydovchi hujjatlari va avtomobili tekshirilgandan keyingina platformaga qo‘shiladi. Ayollar uchun alohida taksi xizmati ishlaydi.',
  },
  {
    title: 'Halollik',
    text: 'Narx safardan oldin ma’lum bo‘ladi: uni o‘zingiz taklif qilasiz yoki haydovchi bilan kelishasiz. Yashirin to‘lovlar yo‘q.',
  },
]

const content = 'mx-auto max-w-[1320px]'
const teamCard = 'relative flex min-h-[380px] flex-col overflow-hidden rounded-[28px] bg-[#f1f3f6] p-6 sm:min-h-[430px] sm:p-7'

/** The page's big picture: the TaxiLine car on the brand colour, with live numbers pinned on it. */
function MissionVisual() {
  // Landing'dagi "Butun O‘zbekiston bo‘ylab" bo‘limi bilan bir xil ochiq statistika (GET /stats).
  const { data } = useQuery({ queryKey: ['public-stats'], queryFn: () => api.get('/stats'), staleTime: 60_000 })
  const chips = [
    { icon: MapPin, value: data?.regions, label: 'hudud' },
    { icon: Car, value: data?.drivers, label: 'tasdiqlangan haydovchi' },
    { icon: Users, value: data?.users, label: 'foydalanuvchi' },
    { icon: Star, value: data?.avgRating, label: 'o‘rtacha baho' },
  ].filter((chip) => chip.value)

  return (
    <div className="relative h-[clamp(280px,44vw,620px)] overflow-hidden rounded-[32px] bg-[linear-gradient(160deg,#00727c_0%,#00a9b5_46%,#3ddbe6_100%)] sm:rounded-[40px]">
      {/* Fondagi katta "T" — landing hero'sidagi bilan bir xil shakl. */}
      <svg aria-hidden="true" viewBox="0 0 600 600" className="pointer-events-none absolute -right-[6%] -top-[12%] h-[130%] opacity-[0.13]">
        <path d="M40 150 H 560 M300 150 V 700" fill="none" stroke="#fff" strokeWidth="110" />
      </svg>
      <span aria-hidden="true" className="pointer-events-none absolute -left-[8%] -top-[30%] aspect-square w-[46%] rounded-full bg-white/10" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] bottom-[9%] h-[7%] rounded-[50%] bg-black/25 blur-2xl" />
      <picture>
        <source type="image/webp" srcSet="/landing/taxi-car-sm.webp 520w, /landing/taxi-car.webp 1400w" sizes="(min-width: 1024px) 1000px, 92vw" />
        <img
          src="/landing/taxi-car.png"
          alt={t('TaxiLine avtomobili')}
          width={2017}
          height={694}
          draggable={false}
          className="absolute bottom-[8%] left-1/2 w-[86%] max-w-[1040px] -translate-x-1/2 select-none drop-shadow-[0_26px_22px_rgba(0,60,66,0.35)]"
        />
      </picture>

      {chips.length ? (
        <ul className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2 sm:left-7 sm:top-7">
          {chips.map(({ icon: Icon, value, label }) => (
            <li key={label} className="flex items-center gap-2 rounded-full bg-white/95 py-1.5 pl-1.5 pr-3.5 shadow-[0_8px_20px_rgba(0,60,66,0.18)] backdrop-blur">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
                <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              <span className="text-[13px] font-extrabold text-ink sm:text-[14px]">
                {number(value)} <span className="font-medium text-muted">{t(label)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function TelegramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.4 4.3 18.3 19c-.2 1-.9 1.3-1.8.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.7-7.9c.4-.3-.1-.5-.6-.2L6.2 12.9l-4.6-1.4c-1-.3-1-1 .2-1.5L20 3c.9-.3 1.6.2 1.4 1.3Z" />
    </svg>
  )
}

/** A person: name, role in handwriting, portrait rising from the bottom, their links on top of it. */
function MemberCard({ member }) {
  const links = [
    member.telegram ? { href: member.telegram, label: 'Telegram', icon: TelegramIcon } : null,
    member.instagram ? { href: member.instagram, label: 'Instagram', icon: InstagramIcon } : null,
  ].filter(Boolean)
  return (
    <li className={teamCard}>
      <h3 className="relative z-10 max-w-[11ch] text-[26px] font-bold leading-[1.12] tracking-tight text-ink sm:text-[30px]">{member.name}</h3>
      <p className="relative z-10 mt-2 font-hand text-[23px] leading-none text-muted">{t(member.role)}</p>
      {member.photo ? (
        <img
          src={member.photo}
          alt={member.name}
          loading="lazy"
          className="pointer-events-none absolute bottom-0 right-0 h-[72%] w-auto max-w-[86%] select-none object-contain object-bottom"
        />
      ) : null}
      {links.length ? (
        <ul className="absolute bottom-4 right-4 z-10 flex gap-2">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} — ${label}`}
                className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-ink text-white shadow-[0_6px_14px_rgba(15,29,42,0.3)] transition hover:-translate-y-0.5 hover:bg-black"
              >
                <Icon className="h-[18px] w-[18px]" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

/** A line of work, drawn like a person's card: where the portrait would be, its glossy badge. */
function DirectionCard({ direction, index }) {
  const Icon = direction.icon
  return (
    <li className={teamCard}>
      <h3 className="relative z-10 max-w-[12ch] text-[26px] font-bold leading-[1.12] tracking-tight text-ink sm:text-[30px]">{t(direction.title)}</h3>
      <p className="relative z-10 mt-2 font-hand text-[23px] leading-none text-muted">{t('{0}-yo‘nalish', index + 1)}</p>
      <p className="relative z-10 mt-4 max-w-[30ch] text-[14.5px] leading-[1.55] text-muted">{t(direction.text)}</p>
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 -left-6 select-none text-[190px] font-extrabold leading-none text-white">
        {index + 1}
      </span>
      <span className="absolute bottom-6 right-6 flex h-[92px] w-[92px] rotate-[8deg] items-center justify-center rounded-[28px] bg-[linear-gradient(145deg,#4be4ee_0%,#00b9c6_55%,#008d98_100%)] text-white shadow-[0_20px_30px_-10px_rgba(0,140,152,0.6),inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-8px_14px_rgba(0,70,77,0.22)]">
        <Icon className="h-10 w-10 drop-shadow-[0_3px_4px_rgba(0,70,77,0.35)]" strokeWidth={2} />
      </span>
    </li>
  )
}

export function TeamPage() {
  const hasMembers = TEAM_MEMBERS.length > 0
  return (
    <PublicPage path="/jamoa">
      {/* Missiya */}
      <section className={`${section} pt-12 sm:pt-20`}>
        <div className={`${content} grid gap-5 px-2 sm:px-4 lg:grid-cols-2 lg:items-end lg:gap-16`}>
          <div>
            <p className="font-hand text-[26px] leading-none text-muted">{t('Bizning maqsad')}</p>
            <h2 className="mt-2 text-[38px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[52px] 2xl:text-[60px]">
              {t('Nega TaxiLine’ni yaratdik')}
            </h2>
          </div>
          <p className="text-[16px] leading-[1.6] text-muted sm:text-[18px]">
            {t('Shaharlararo yo‘lga chiqish oson bo‘lishi kerak: mashina izlab guruhma-guruh yurmasdan, narxni oldindan bilib va ishonchli haydovchi bilan. TaxiLine’ni shuning uchun qurdik — yo‘lovchi xotirjam yetsin, haydovchi esa halol daromad topsin.')}
          </p>
        </div>
        <div className={`${content} mt-10 sm:mt-14`}>
          <MissionVisual />
        </div>
      </section>

      {/* Tamoyillar */}
      <section className={`${section} pt-10 sm:pt-16`}>
        <dl className={`${content} divide-y divide-line px-2 sm:px-4`}>
          {PRINCIPLES.map(({ title, text }) => (
            <div key={title} className="grid gap-2 py-8 sm:py-10 lg:grid-cols-2 lg:gap-16">
              <dt className="text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-[34px]">{t(title)}</dt>
              <dd className="text-[16px] leading-[1.6] text-muted sm:text-[18px]">{t(text)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Jamoa */}
      <section className={`${section} pt-14 sm:pt-24`}>
        <div className="mx-auto max-w-[1100px] px-2 text-center">
          <p className="font-hand text-[26px] leading-none text-muted">{t('Jamoa bilan tanishing')}</p>
          <h2 className="mt-2 text-[34px] font-bold leading-[1.08] tracking-tight text-ink sm:text-[48px] 2xl:text-[56px]">
            {t('Yordamchilar. Tekshiruvchilar. Quruvchilar.')}
          </h2>
          <p className="mx-auto mt-4 max-w-[680px] text-[16px] leading-[1.6] text-muted sm:text-[18px]">
            {t('TaxiLine ortida turli kasb egalaridan iborat jamoa turadi. Har biri o‘z ishiga javob beradi, lekin maqsad bitta — safar qulay va xavfsiz bo‘lsin.')}
          </p>
        </div>
        <ul className={`${content} mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 xl:grid-cols-4`}>
          {hasMembers
            ? TEAM_MEMBERS.map((member) => <MemberCard key={member.name} member={member} />)
            : DIRECTIONS.map((direction, i) => <DirectionCard key={direction.title} direction={direction} index={i} />)}
        </ul>
      </section>

      <section className={`${section} pb-4 pt-16 sm:pt-24`}>
        <div className={`${content} relative overflow-hidden rounded-[32px] bg-[#1d2229] px-6 py-12 text-white sm:rounded-[40px] sm:px-12 sm:py-16 lg:px-14`}>
          <span aria-hidden="true" className="pointer-events-none absolute -right-36 -top-40 h-[260px] w-[260px] rounded-full bg-brand/90 sm:-right-24 sm:-top-28 sm:h-[360px] sm:w-[360px]" />
          <div className="relative max-w-[640px]">
            <p className="font-hand text-[26px] leading-none text-brand">{t('Biz bilan birga')}</p>
            <h2 className="mt-2 text-[30px] font-extrabold leading-[1.1] tracking-tight sm:text-[42px]">{t('Jamoamizga qo‘shiling')}</h2>
            <p className="mt-3 text-[16px] leading-[1.6] text-white/70 sm:text-[18px]">
              {t('Haydovchi sifatida bugunoq boshlang. Hamkorlik yoki ish bo‘yicha taklifingiz bo‘lsa — bizga yozing.')}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/haydovchi-bolish"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-[14px] font-extrabold text-ink transition hover:bg-white"
              >
                <UserPlus className="h-4 w-4" /> {t('Haydovchi bo‘lish')}
              </Link>
              <Link
                to="/aloqa"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-6 text-[14px] font-extrabold text-white ring-1 ring-white/15 transition hover:bg-white/20"
              >
                {t('Aloqa')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  )
}

const CHANNELS = [
  { icon: Phone, title: 'Telefon', value: '+998 87 735 36 36', hint: 'Yordam xizmati', href: 'tel:+998877353636', action: 'Qo‘ng‘iroq qilish' },
  { icon: Bot, title: 'Telegram bot', value: '@taxilines_bot', hint: 'Buyurtma va savollar uchun', href: 'https://t.me/taxilines_bot', action: 'Botga yozish' },
  { icon: Send, title: 'Telegram kanal', value: '@taxiline_uzbekistan', hint: 'Yangiliklar va e’lonlar', href: 'https://t.me/taxiline_uzbekistan', action: 'Kanalga o‘tish' },
  { icon: InstagramIcon, title: 'Instagram', value: '@taxiline_uz', hint: 'Reels va lavhalar', href: 'https://www.instagram.com/taxiline_uz', action: 'Sahifani ochish' },
]

const SHORTCUTS = [
  { icon: UserPlus, title: 'Haydovchi bo‘lmoqchimisiz?', text: 'Ariza qoldiring — jamoamiz o‘zi bog‘lanadi.', to: '/haydovchi-bolish' },
  { icon: Briefcase, title: 'Biznes uchun', text: 'Kompaniyalar uchun tarif va shartlar.', to: '/biznes' },
  { icon: CircleHelp, title: 'Savol-javob', text: 'Ko‘p so‘raladigan savollarga tayyor javoblar.', to: '/savollar' },
]

const contactField =
  'w-full rounded-2xl bg-white px-5 py-3.5 text-[15px] font-medium text-ink outline-none ring-1 ring-line transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand focus-within:ring-2 focus-within:ring-brand'

// Murojaat admin paneldagi "Lidlar" bo‘limiga tushadi (manba: Sayt: Aloqa sahifasi).
function ContactForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState(maskPhoneUz('+998'))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (name.trim().length < 2) {
      setError('Ism va familiyangizni kiriting')
      return
    }
    if (!isCompletePhoneUz(phone)) {
      setError('Telefon raqamini to‘liq kiriting')
      return
    }
    if (!message.trim()) {
      setError('Izoh yozing')
      return
    }
    setError('')
    setSending(true)
    try {
      await api.post('/leads/contact', { name: name.trim(), phone: toE164Uz(phone), message: message.trim() })
      setSent(true)
      setName('')
      setPhone(maskPhoneUz('+998'))
      setMessage('')
    } catch (err) {
      setError(err.message || t('Xabarni yuborib bo‘lmadi. Qayta urinib ko‘ring.'))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[28px] bg-[#f1f3f6] p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_22px_-8px_rgba(0,163,174,0.7)]">
          <Check className="h-8 w-8" strokeWidth={3} />
        </span>
        <h3 className="mt-6 text-[24px] font-extrabold tracking-tight text-ink">{t('Xabaringiz qabul qilindi!')}</h3>
        <p className="mt-2 max-w-[360px] text-[15px] leading-[1.55] text-muted">{t('Rahmat! Jamoamiz tez orada siz bilan bog‘lanadi.')}</p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 text-[14px] font-bold text-ink/70 underline-offset-4 hover:text-ink hover:underline"
        >
          {t('Yana xabar yuborish')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[28px] bg-[#f1f3f6] p-5 sm:p-7">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('Ism familiya')}
          aria-label={t('Ism familiya')}
          autoComplete="name"
          maxLength={120}
          className={contactField}
        />
        <label className={`${contactField} flex items-center gap-1.5`}>
          <span className={phone.length > 5 ? 'text-ink' : 'text-slate-400'}>+998</span>
          <input
            value={maskLocalPhoneUz(phone)}
            onChange={(e) => setPhone(maskPhoneUz(e.target.value))}
            placeholder={t('Telefon raqam')}
            aria-label={t('Telefon raqam')}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={12}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
          />
        </label>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t('Izoh: savol, taklif yoki murojaatingiz')}
        aria-label={t('Izoh')}
        rows={5}
        maxLength={2000}
        className={`${contactField} mt-3 block resize-y`}
      />

      {error ? (
        <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-[13px] font-bold text-red-600">
          {t(error)}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-7 text-[14px] font-extrabold text-white transition hover:bg-black disabled:opacity-70 sm:w-auto"
      >
        {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {sending ? t('Yuborilmoqda…') : t('Yuborish')}
      </button>
    </form>
  )
}

export function ContactPage() {
  return (
    <PublicPage path="/aloqa">
      <section className={`${section} pt-10 sm:pt-16`}>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CHANNELS.map(({ icon: Icon, title, value, hint, href, action }) => {
            const outside = href.startsWith('http')
            return (
              <li key={title}>
                <a
                  href={href}
                  {...(outside ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="group flex h-full flex-col rounded-[28px] bg-[#f1f3f6] p-6 transition hover:bg-brand-soft sm:p-7"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_10px_22px_-8px_rgba(0,163,174,0.7)]">
                    <Icon className="h-6 w-6" strokeWidth={2.1} />
                  </span>
                  <span className="mt-5 block text-[14px] font-semibold text-muted">{t(title)}</span>
                  <span className="mt-1 block break-words text-[22px] font-extrabold leading-tight tracking-tight text-ink">{value}</span>
                  <span className="mt-1.5 block text-[14px] text-muted">{t(hint)}</span>
                  <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[13px] font-extrabold text-white transition group-hover:bg-black">
                    {t(action)} {outside ? <ArrowUpRight className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={`${section} pt-16 sm:pt-24`}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
          <div className="px-2 sm:px-4 lg:px-8">
            <p className="font-hand text-[26px] leading-none text-brand-dark">{t('Bizga yozing')}</p>
            <h2 className="mt-2 text-[32px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[44px]">{t('Xabar qoldiring')}</h2>
            <p className="mt-4 max-w-[440px] text-[16px] leading-[1.6] text-muted sm:text-[18px]">
              {t('Ism familiyangiz, telefon raqamingiz va izohingizni qoldiring — jamoamiz o‘zi siz bilan bog‘lanadi.')}
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      <section className={`${section} pb-4 pt-16 sm:pt-24`}>
        <div className="px-2 sm:px-4 lg:px-8">
          <p className="font-hand text-[26px] leading-none text-brand-dark">{t('Tezroq yo‘l')}</p>
          <h2 className="mt-2 text-[32px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[44px]">{t('Balki javob shu yerdadir')}</h2>
        </div>
        <ul className="mt-8 grid gap-3 lg:grid-cols-3">
          {SHORTCUTS.map(({ icon: Icon, title, text, to }) => (
            <li key={to}>
              <Link to={to} className="group flex h-full items-center gap-4 rounded-[28px] border border-line bg-white p-5 transition hover:border-brand/50 sm:p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
                  <Icon className="h-6 w-6" strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-extrabold leading-tight text-ink">{t(title)}</span>
                  <span className="mt-1 block text-[14px] leading-snug text-muted">{t(text)}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PublicPage>
  )
}
