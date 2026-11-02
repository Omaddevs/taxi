import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Bot, Check, Headphones, Megaphone, Phone, Route, Share2, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { Logo, Wordmark } from '../components/ui/Logo'
import { useSeo } from '../seo/useSeo'
import { t } from '../i18n'

// Instagram profilidagi havola uchun sahifa (link-in-bio): sayt, bot, kanal va yo‘nalish guruhlari.
// Telefon ekraniga moslangan — kompyuterda ham o‘rtada tor ustun bo‘lib turadi.

const SITE = { href: 'https://taxiline.uz', label: 'taxiline.uz' }
const BOT = { href: 'https://t.me/taxiline_rasmiy_bot', handle: '@taxiline_rasmiy_bot' }
const CHANNEL = { href: 'https://t.me/taxiline_uzbekistan', handle: '@taxiline_uzbekistan' }

const GROUPS = [
  { handle: 'samarqand_toshkent_taxiline', from: 'Samarqand', to: 'Toshkent' },
  { handle: 'andijon_toshkent_taxiline', from: 'Andijon', to: 'Toshkent' },
  { handle: 'fargona_toshkent_taxiline', from: 'Farg‘ona', to: 'Toshkent' },
  { handle: 'toshkent_andijon_taxiline', from: 'Toshkent', to: 'Andijon' },
  { handle: 'namangan_toshkent_taxiline', from: 'Namangan', to: 'Toshkent' },
  { handle: 'toshkent_andijon_dostlik_taxilin', from: 'Toshkent', to: 'Andijon', note: 'Do‘stlik' },
]

const FACTS = [
  { icon: Headphones, value: '24/7', label: 'Yordam xizmati' },
  { icon: Route, value: String(GROUPS.length), label: 'Yo‘nalish guruhi' },
  { icon: ShieldCheck, value: '100%', label: 'Tasdiqlangan haydovchilar' },
]

function TelegramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.4 4.3 18.3 19c-.2 1-.9 1.3-1.8.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.7-7.9c.4-.3-.1-.5-.6-.2L6.2 12.9l-4.6-1.4c-1-.3-1-1 .2-1.5L20 3c.9-.3 1.6.2 1.4 1.3Z" />
    </svg>
  )
}

// Har bir blok sahifa ochilganda navbat bilan pastdan ko‘tariladi.
const RISE = 'links-rise motion-safe-anim'
const delay = (i) => ({ animationDelay: `${80 + i * 70}ms` })

const external = { target: '_blank', rel: 'noopener noreferrer' }

function ShareButton() {
  const [copied, setCopied] = useState(false)
  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: 'TaxiLine', url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* foydalanuvchi bekor qildi */
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      aria-label={t('Ulashish')}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-[0_8px_22px_-12px_rgba(15,29,42,0.4)] ring-1 ring-line transition active:scale-95"
    >
      {copied ? <Check className="h-[18px] w-[18px] text-success" /> : <Share2 className="h-[18px] w-[18px]" />}
    </button>
  )
}

function Tile({ href, icon: Icon, title, text, tone, index }) {
  const dark = tone === 'dark'
  return (
    <a
      href={href}
      {...external}
      className={`${RISE} group relative flex min-h-[148px] flex-col overflow-hidden rounded-[26px] p-4 transition active:scale-[0.98] ${
        dark ? 'bg-[#1d2229] text-white' : 'bg-brand text-ink'
      }`}
      style={delay(index)}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-14 -right-12 h-32 w-32 rounded-full ${dark ? 'bg-brand/25' : 'bg-white/30'}`}
      />
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${dark ? 'bg-[#2AABEE] text-white' : 'bg-[#1d2229] text-brand'}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="relative mt-3 text-[16px] font-extrabold leading-tight">{t(title)}</span>
      <span className={`relative mt-1 text-[12px] [overflow-wrap:anywhere] font-medium leading-snug ${dark ? 'text-white/60' : 'text-ink/70'}`}>{text}</span>
      <span
        className={`absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:-translate-y-0.5 ${
          dark ? 'bg-white text-ink' : 'bg-[#1d2229] text-white'
        }`}
      >
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </a>
  )
}

export default function InstagramLinks() {
  useSeo('/instagram-links')

  return (
    <div className="relative min-h-svh overflow-hidden bg-canvas text-ink">
      {/* Fon: yumshoq brand dog‘lari */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-40 h-[380px] w-[380px] rounded-full bg-brand/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-[420px] h-[320px] w-[320px] rounded-full bg-brand/15 blur-3xl" />

      <main className="relative mx-auto flex w-full max-w-[460px] flex-col px-4 pb-10 pt-[max(16px,env(safe-area-inset-top))]">
        {/* Yuqori qator */}
        <div className="flex items-center justify-between">
          <a
            href="tel:+998877353636"
            aria-label={t('Qo‘ng‘iroq qilish')}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-[0_8px_22px_-12px_rgba(15,29,42,0.4)] ring-1 ring-line transition active:scale-95"
          >
            <Phone className="h-[18px] w-[18px]" />
          </a>
          <ShareButton />
        </div>

        {/* Logo va shior */}
        <header className="relative mt-2 flex flex-col items-center text-center">
          <div className="relative">
            <span aria-hidden="true" className="absolute inset-0 -z-10 scale-125 rounded-full bg-brand/25 blur-2xl" />
            <Logo size={96} tone="light" className="links-float motion-safe-anim drop-shadow-[0_14px_24px_rgba(15,29,42,0.25)]" />
            <span
              aria-hidden="true"
              className="links-float-alt motion-safe-anim absolute -left-14 top-6 flex h-10 w-10 -rotate-12 items-center justify-center rounded-2xl bg-[#1d2229] text-brand shadow-lg"
            >
              <Route className="h-5 w-5" />
            </span>
            <span
              aria-hidden="true"
              className="links-float motion-safe-anim absolute -right-14 top-1 flex h-10 w-10 rotate-12 items-center justify-center rounded-2xl bg-brand text-ink shadow-lg"
            >
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </div>
          <h1 className="sr-only">TaxiLine</h1>
          <Wordmark className="mt-3 text-[34px]" />
          <p className="mt-2 text-[19px] font-extrabold leading-tight tracking-tight">
            <span className="block">{t('Yo‘lga ishonch bilan.')}</span>
            <span className="block text-brand-dark">{t('Manzilga o‘z vaqtida.')}</span>
          </p>
          <p className="mt-1.5 max-w-[320px] text-[14px] font-medium leading-snug text-muted">
            {t('O‘zbekiston bo‘ylab shaharlar aro taksi, yuk va pochta xizmati')}
          </p>
        </header>

        {/* Asosiy havolalar */}
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={SITE.href}
            {...external}
            style={delay(0)}
            className={`${RISE} group flex h-[64px] items-center gap-3 rounded-full bg-[#1d2229] pl-2 pr-2 text-white shadow-[0_16px_30px_-16px_rgba(15,29,42,0.6)] transition active:scale-[0.98]`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
              <Logo size={34} tone="light" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-extrabold leading-tight">{SITE.label}</span>
              <span className="block truncate text-[12px] font-medium text-white/60">{t('Rasmiy sayt — buyurtma bering')}</span>
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-ink transition-transform group-hover:rotate-45">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </a>

          <a
            href={BOT.href}
            {...external}
            style={delay(1)}
            className={`${RISE} group flex h-[64px] items-center gap-3 rounded-full bg-white pl-2 pr-2 shadow-[0_12px_28px_-18px_rgba(15,29,42,0.45)] ring-1 ring-line transition active:scale-[0.98]`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2AABEE] text-white">
              <Bot className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-extrabold leading-tight">{t('Telegram botimiz')}</span>
              <span className="block truncate text-[12px] font-medium text-muted">{BOT.handle}</span>
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2AABEE]/10 text-[#2AABEE]">
              <TelegramIcon className="h-5 w-5" />
            </span>
          </a>
        </div>

        {/* Kanal va haydovchi bo‘lish */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Tile index={2} href={CHANNEL.href} icon={Megaphone} tone="dark" title="Telegram kanalimiz" text={CHANNEL.handle} />
          <Tile index={3} href="https://taxiline.uz/haydovchi-bolish" icon={UserPlus} tone="brand" title="Haydovchi bo‘ling" text={t('Ariza qoldiring — o‘zimiz bog‘lanamiz')} />
        </div>

        {/* Telegram guruhlari */}
        <section aria-labelledby="links-groups" className={`${RISE} mt-7`} style={delay(4)}>
          <div className="flex items-end justify-between px-1">
            <h2 id="links-groups" className="text-[17px] font-extrabold tracking-tight">
              {t('Telegram guruhlarimiz')}
            </h2>
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted">
              <Users className="h-3.5 w-3.5" /> {t('{0} ta yo‘nalish', GROUPS.length)}
            </span>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2.5">
            {GROUPS.map((g) => (
              <li key={g.handle}>
                <a
                  href={`https://t.me/${g.handle}`}
                  {...external}
                  className="group flex h-full items-center gap-2.5 rounded-[18px] bg-white p-2.5 ring-1 ring-line transition hover:ring-brand active:scale-[0.97]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                    <TelegramIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-extrabold">{t(g.from)}</span>
                    <span className="flex items-start gap-1 text-[12px] font-semibold text-muted">
                      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-brand-dark" />
                      <span>
                        {t(g.to)}
                        {g.note ? ` · ${t(g.note)}` : ''}
                      </span>
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Yakuniy chaqiruv */}
        <a
          href={SITE.href}
          {...external}
          style={delay(5)}
          className={`${RISE} group relative mt-6 flex items-center gap-3 overflow-hidden rounded-[26px] bg-[#1d2229] p-4 text-white`}
        >
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-36 w-36 rounded-full bg-brand" />
          <span className="relative min-w-0 flex-1">
            <span className="block text-[16px] font-extrabold leading-tight">{t('Safarga tayyormisiz?')}</span>
            <span className="mt-0.5 block text-[12.5px] font-medium text-white/60">{t('Bir necha daqiqada joy band qiling')}</span>
          </span>
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ink transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="h-5 w-5" />
          </span>
        </a>

        {/* Faktlar */}
        <div className="mt-6 grid grid-cols-3 divide-x divide-line rounded-[22px] bg-white py-3 ring-1 ring-line">
          {FACTS.map((f) => (
            <div key={f.label} className="flex flex-col items-center px-1.5 text-center">
              <span className="flex items-center gap-1 text-[17px] font-extrabold">
                <f.icon className="h-4 w-4 text-brand-dark" />
                {f.value}
              </span>
              <span className="mt-0.5 text-[11px] font-medium leading-tight text-muted">{t(f.label)}</span>
            </div>
          ))}
        </div>

        <footer className="mt-6 text-center text-[12px] font-medium text-muted">
          <a href="tel:+998877353636" className="font-bold text-ink">
            +998 87 735 36 36
          </a>
          <p className="mt-1">
            © {new Date().getFullYear()} TaxiLine ·{' '}
            <Link to="/" className="underline decoration-brand underline-offset-2">
              taxiline.uz
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
