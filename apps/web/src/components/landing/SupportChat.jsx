import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, MessageCircle, Send, X } from 'lucide-react'
import { faqs } from '../../data/mock'
import { t } from '../../i18n'
import { SUPPORT_CHAT_OPEN_EVENT } from './supportChatBus'

/* Yordamchi chat bot — "tepaga" tugmasi ustidagi dumaloq tugma, bosilganda popup ochiladi.
   Javoblar saytdagi tayyor ma'lumotlardan (FAQ + bo‘limlar) kalit so‘zlar bo‘yicha topiladi;
   topilmasa — operatorga (Telegram bot) yo‘naltiradi. Server yoki AI ishlatilmaydi.
   Boshqa joydan ochish: openSupportChat() — ./supportChatBus.js. */
const SUPPORT_BOT_URL = 'https://t.me/taxilines_bot'
const STORE_KEY = 'taxiline-support-chat'
const HELLO = { from: 'bot', kind: 'hello' }

// Joylashuv: landing — "tepaga" tugmasi ustida; app — profil sahifasi (pastki panel yo‘q);
// driver — haydovchi profili (pastda doimiy navigatsiya paneli bor, uning ustida turadi).
const PLACEMENT = {
  landing: {
    button: 'bottom-[calc(max(20px,env(safe-area-inset-bottom))+68px)] right-4 sm:bottom-[92px] sm:right-6 2xl:bottom-[100px]',
    panel: 'bottom-[calc(max(20px,env(safe-area-inset-bottom))+136px)] right-4 sm:bottom-[164px] sm:right-6 2xl:bottom-[180px]',
  },
  app: {
    button: 'bottom-[max(20px,env(safe-area-inset-bottom))] right-4 sm:bottom-6 sm:right-6',
    panel: 'bottom-[calc(max(20px,env(safe-area-inset-bottom))+68px)] right-4 sm:bottom-[92px] sm:right-6 2xl:bottom-[100px]',
  },
  driver: {
    button: 'bottom-[calc(max(10px,env(safe-area-inset-bottom))+80px)] right-4 sm:right-6',
    panel: 'bottom-[calc(max(10px,env(safe-area-inset-bottom))+148px)] right-4 sm:right-6',
  },
}

// Kalit so‘zlar — o‘zbekcha (lotin/kirill ildizlari), ruscha va inglizcha; matn kichik harf va
// apostroflarsiz solishtiriladi. Javob matnlari t() orqali tarjima qilinadi.
const FAQ_KEYS = [
  ['bekor', 'otmen', 'cancel', 'бекор', 'отмен'],
  ['tolov', 'tola', 'pul', 'karta', 'click', 'payme', 'uzum', 'humo', 'uzcard', 'naqd', 'оплат', 'плат', 'pay'],
  ['ayol', 'женск', 'women', 'аёл'],
  ['yuk', 'pochta', 'posilka', 'jonat', 'груз', 'посыл', 'почт', 'cargo', 'parcel'],
  ['haydovchi bol', 'haydovchi bo', 'haydovchilik', 'ishga', 'водител', 'driver', 'ҳайдовчи'],
]

const TOPICS = [
  ...faqs.map((f, i) => ({ id: `faq-${i}`, q: f.q, a: f.a, keys: FAQ_KEYS[i] ?? [] })),
  {
    id: 'register',
    q: 'Qanday ro‘yxatdan o‘taman?',
    a: 'Kirish uchun telefon raqamingizning o‘zi yetarli: raqamni kiriting va Telegram orqali tasdiqlang.',
    keys: ['royxat', 'kirish', 'login', 'akkaunt', 'регистр', 'войти', 'вход', 'sign', 'register'],
    link: { to: '/register', label: 'Ro‘yxatdan o‘tish', landingOnly: true },
  },
  {
    id: 'price',
    q: 'Safar narxi qancha?',
    a: 'Narx yo‘nalish va tanlangan o‘rinlarga qarab buyurtma berishdan oldin ko‘rsatiladi — kutilmagan to‘lovlar yo‘q.',
    keys: ['narx', 'qancha', 'baho', 'tarif', 'цен', 'стоим', 'сколько', 'price', 'cost', 'нарх'],
  },
  {
    id: 'random',
    q: 'Random mijoz o‘yini nima?',
    a: 'Tasodifiy tanlangan mijozlarimizning borish yoki qaytish yo‘l haqini TaxiLine to‘lab beradi! Ishtirok etish uchun ism, familiya va raqamingizni qoldiring hamda Telegram kanal va guruhimizga qo‘shiling.',
    keys: ['random', 'oyin', 'sovga', 'golib', 'yutuq', 'розыгр', 'подар', 'giveaway', 'prize'],
    link: { to: '/#random', label: 'Ishtirok etish', landingOnly: true },
  },
  {
    id: 'groups',
    q: 'Telegram guruhlaringiz bormi?',
    a: 'Ha. Yo‘nalishingiz bo‘yicha guruhlarda haydovchi va yo‘lovchilar bir-birini tez topadi, rasmiy kanalda esa yangiliklar va aksiyalar e’lon qilinadi.',
    keys: ['guruh', 'kanal', 'telegram', 'групп', 'канал', 'group', 'channel'],
    link: { to: '/#telegram', label: 'Guruhlarni ko‘rish', landingOnly: true },
  },
  {
    id: 'contact',
    q: 'Operator bilan qanday bog‘lanaman?',
    a: 'Operatorimiz Telegram botda kecha-kunduz javob beradi. Aloqa sahifasida boshqa usullar ham bor.',
    keys: ['operator', 'aloqa', 'boglan', 'telefon', 'raqam', 'odam', 'yordam', 'оператор', 'связ', 'контакт', 'помощ', 'contact', 'support', 'help'],
    link: { to: '/aloqa', label: 'Aloqa' },
    bot: true,
  },
]

const QUICK = ['faq-0', 'faq-1', 'price', 'register', 'random', 'contact']
// Kirgan foydalanuvchiga ro‘yxatdan o‘tish savoli kerak emas.
const QUICK_IN_APP = ['faq-0', 'faq-1', 'price', 'faq-3', 'random', 'contact']

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[‘’ʻʼ`'´]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findTopic(text) {
  const q = normalize(text)
  if (!q) return null
  let best = null
  let bestScore = 0
  for (const topic of TOPICS) {
    // Savolning o‘zini (joriy tilda) ham hisobga olamiz — tugmadagi matnni yozib yuborsa ham topiladi.
    const own = normalize(t(topic.q))
    let score = own === q ? 10 : 0
    for (const k of topic.keys) if (q.includes(normalize(k))) score += 1
    if (score > bestScore) {
      best = topic
      bestScore = score
    }
  }
  return best
}

function readHistory() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    const list = raw ? JSON.parse(raw) : null
    return Array.isArray(list) ? list.slice(-40) : []
  } catch {
    return []
  }
}

function writeHistory(list) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(list.slice(-40)))
  } catch {
    /* saqlash ixtiyoriy */
  }
}

function BotLinks({ topic, inApp }) {
  // Landingdagi bo‘limlar (/#random…) va ro‘yxatdan o‘tish ilova ichida ma'nosiz — ko‘rsatmaymiz.
  const link = topic?.link && !(inApp && topic.link.landingOnly) ? topic.link : null
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {link ? (
        <Link
          to={link.to}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[12.5px] font-bold text-ink ring-1 ring-line transition hover:bg-ink hover:text-white"
        >
          {t(link.label)} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
      {!topic || topic.bot ? (
        <a
          href={SUPPORT_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#2AABEE] px-3 text-[12.5px] font-bold text-white transition hover:bg-[#1e96d1]"
        >
          <Send className="h-3.5 w-3.5" /> {t('Operatorga yozish')}
        </a>
      ) : null}
    </div>
  )
}

function Message({ msg, inApp }) {
  const topic = msg.topic ? TOPICS.find((x) => x.id === msg.topic) : null
  if (msg.from === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[82%] rounded-[18px] rounded-br-md bg-[#1d2229] px-3.5 py-2.5 text-[14px] leading-[1.45] text-white">{msg.text}</p>
      </div>
    )
  }
  const text = msg.kind === 'unknown' ? t('Bu savolga hozircha javob topolmadim. Operatorimiz Telegram botda kecha-kunduz javob beradi.') : msg.kind === 'hello' ? t('Assalomu alaykum! Men TaxiLine yordamchisiman. Savolingizni yozing yoki quyidagilardan birini tanlang.') : t(topic?.a)
  return (
    <div className="flex items-end gap-2">
      <span aria-hidden="true" className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[#1a2b3c]">
        <Bot className="h-4 w-4" />
      </span>
      <div className="max-w-[82%] rounded-[18px] rounded-bl-md bg-[#f3f4f6] px-3.5 py-2.5 text-[14px] leading-[1.45] text-ink">
        {text}
        {msg.kind === 'unknown' || (topic?.link && !(inApp && topic.link.landingOnly)) || topic?.bot ? <BotLinks topic={msg.kind === 'unknown' ? null : topic} inApp={inApp} /> : null}
      </div>
    </div>
  )
}

export function SupportChat({ placement = 'landing' }) {
  const pos = PLACEMENT[placement] ?? PLACEMENT.landing
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(readHistory)
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const timer = useRef(0)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(SUPPORT_CHAT_OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener(SUPPORT_CHAT_OPEN_EVENT, onOpen)
      clearTimeout(timer.current)
    }
  }, [])

  useEffect(() => writeHistory(messages), [messages])

  // Ochilganda: maydonga fokus, Esc bilan yopish.
  useEffect(() => {
    if (!open) return undefined
    const focus = setTimeout(() => inputRef.current?.focus(), 150)
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(focus)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing, open])

  function ask(text, topicId) {
    const clean = text.trim()
    if (!clean || typing) return
    const topic = topicId ? TOPICS.find((x) => x.id === topicId) : findTopic(clean)
    setMessages((list) => [...list, { from: 'user', text: clean }])
    setDraft('')
    setTyping(true)
    // Qisqa "yozmoqda…" pauza — javob tabiiyroq ko‘rinadi.
    timer.current = setTimeout(() => {
      setTyping(false)
      setMessages((list) => [...list, topic ? { from: 'bot', topic: topic.id } : { from: 'bot', kind: 'unknown' }])
    }, 650)
  }

  const asked = new Set(messages.filter((m) => m.topic).map((m) => m.topic))
  const chips = (placement === 'landing' ? QUICK : QUICK_IN_APP).filter((id) => !asked.has(id)).slice(0, 4)

  return (
    <>
      <div
        role="dialog"
        aria-modal="false"
        aria-label={t('TaxiLine yordamchisi')}
        className={`fixed ${pos.panel} z-50 flex max-h-[min(560px,calc(100svh-200px))] w-[calc(100vw-32px)] max-w-[380px] origin-bottom-right flex-col overflow-hidden rounded-[24px] bg-white text-ink shadow-[0_30px_70px_-20px_rgba(15,29,42,0.45)] ring-1 ring-line transition-all duration-300 ease-[cubic-bezier(.22,.8,.3,1)] ${
          open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible translate-y-3 scale-95 opacity-0'
        }`}
      >
        <header className="flex items-center gap-3 bg-[#1d2229] px-4 py-3.5 text-white">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand text-[#1a2b3c]">
            <Bot className="h-5 w-5" />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-[#1d2229]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-extrabold">{t('TaxiLine yordamchisi')}</span>
            <span className="block text-[12px] text-white/60">{t('24/7 onlayn')}</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('Yopish')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div ref={listRef} aria-live="polite" className="min-h-[200px] flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
          {/* Salomlashish har doim birinchi turadi (tarixda saqlanmaydi) */}
          {[HELLO, ...messages].map((m, i) => (
            <Message key={i} msg={m} inApp={placement !== 'landing'} />
          ))}
          {typing ? (
            <div className="flex items-end gap-2" aria-label={t('Yozmoqda…')}>
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[#1a2b3c]">
                <Bot className="h-4 w-4" />
              </span>
              <span className="flex gap-1 rounded-[18px] rounded-bl-md bg-[#f3f4f6] px-4 py-3.5">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            </div>
          ) : null}
          {chips.length && !typing ? (
            <div className="flex flex-wrap gap-2 pl-9">
              {chips.map((id) => {
                const topic = TOPICS.find((x) => x.id === id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => ask(t(topic.q), id)}
                    className="rounded-full border border-brand/40 bg-brand-soft px-3 py-1.5 text-left text-[12.5px] font-semibold text-brand-dark transition hover:border-brand hover:bg-brand hover:text-ink"
                  >
                    {t(topic.q)}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(draft)
          }}
          className="flex items-center gap-2 border-t border-line px-3 py-3"
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={300}
            placeholder={t('Savolingizni yozing…')}
            aria-label={t('Savolingizni yozing…')}
            className="h-11 min-w-0 flex-1 rounded-full bg-[#f3f4f6] px-4 text-[14px] outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-brand/50"
          />
          <button
            type="submit"
            disabled={!draft.trim() || typing}
            aria-label={t('Yuborish')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-[#1a2b3c] transition hover:bg-[#5ee3eb] disabled:opacity-40"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>

      {/* Ochish tugmasi — "tepaga" tugmasining ustida */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t('Chatni yopish') : t('Yordamchi chat')}
        title={t('Yordamchi chat')}
        className={`group fixed ${pos.button} z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-[#1a2b3c] shadow-[0_14px_30px_-8px_rgba(0,163,174,0.6)] transition duration-300 hover:bg-[#5ee3eb] 2xl:h-16 2xl:w-16`}
      >
        {!open && !messages.length ? <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-brand/40 [animation-duration:2.4s]" /> : null}
        <span className={`absolute transition-all duration-300 ${open ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>
          <MessageCircle className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <span className={`absolute transition-all duration-300 ${open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'}`}>
          <X className="h-6 w-6" strokeWidth={2.4} />
        </span>
      </button>
    </>
  )
}
