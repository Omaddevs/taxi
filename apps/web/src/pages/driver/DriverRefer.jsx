import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bot,
  Car,
  Check,
  ChevronRight,
  Copy,
  Gift,
  Info,
  Link2,
  Radio,
  Send,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatSom, inviteCode } from '../../lib/utils'
import { sharePlace } from '../../lib/geo'
import { DriverHeader, DriverSheet } from './ui'
import { REFERRAL_ENABLED } from '../../lib/features'
import { t } from '../../i18n'

const BONUS = 20000
const TELEGRAM_BOT_URL = `https://t.me/${import.meta.env.VITE_TELEGRAM_BOT || 'taxilines_bot'}`
const TELEGRAM_CHANNEL_URL = 'https://t.me/taxiline_uzbekistan'
const INSTAGRAM_URL = 'https://www.instagram.com/'

function ReferSoon() {
  return (
    <div className="min-h-svh overflow-x-clip bg-canvas">
      <DriverHeader title={t('Do‘stingizni taklif qiling')} />
      <div className="flex flex-col items-center px-6 pt-16 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
          <Gift className="h-9 w-9" />
        </span>
        <span className="mt-6 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600">{t('Tez orada')}</span>
        <h1 className="mt-3 text-xl font-extrabold">{t('Taklif bonuslari tez orada')}</h1>
        <p className="mt-2 max-w-xs text-sm text-muted">{t('Do‘stlaringizni taklif qilib bonus olish imkoniyati tez orada ishga tushadi.')}</p>
        <Link to="/driver" className="mt-6 flex h-11 items-center rounded-full bg-brand px-6 text-sm font-bold text-ink">
          {t('Bosh sahifaga')}
        </Link>
      </div>
    </div>
  )
}

export default function DriverRefer() {
  return REFERRAL_ENABLED ? <DriverReferActive /> : <ReferSoon />
}

function DriverReferActive() {
  const { user } = useApp()
  const [copied, setCopied] = useState(false)
  const [telegramOpen, setTelegramOpen] = useState(false)
  const code = inviteCode(user.id)
  const url = `${window.location.origin}/invite/${code}`
  const shareText = t('TaxiLine’da haydovchi bo‘ling — mening havolam orqali: {0}', url)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const methods = [
    {
      id: 'ig',
      label: t('Instagram'),
      href: INSTAGRAM_URL,
      className: 'bg-[#fce7f3] text-[#E1306C]',
      icon: InstagramMark,
    },
    {
      id: 'tg',
      label: 'Telegram',
      onClick: () => setTelegramOpen(true),
      className: 'bg-sky-50 text-sky-600',
      icon: Send,
    },
    {
      id: 'link',
      label: t('Havolani ulashish'),
      href: TELEGRAM_CHANNEL_URL,
      className: 'bg-brand-soft text-brand',
      icon: Link2,
    },
    {
      id: 'more',
      label: t('Boshqalar'),
      onClick: () => sharePlace({ title: 'TaxiLine', text: shareText, url }),
      className: 'bg-slate-100 text-slate-600',
      icon: Share2,
    },
  ]

  return (
    <div className="overflow-x-clip bg-canvas">
      <DriverHeader
        title={t('Do‘stingizni taklif qiling')}
        right={
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-muted">
            <Info className="h-4 w-4" />
          </span>
        }
      />

      <div className="bg-gradient-to-b from-brand-soft to-canvas px-4 pb-4 pt-2">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold leading-snug">{t('Do‘stlaringizni taklif qiling va bonuslar oling!')}</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {t('Do‘stingiz TaxiLine’da ro‘yxatdan o‘tib, birinchi buyurtmasini bajarsa, siz va do‘stingiz bonus olasiz.')}
            </p>
          </div>
          <span className="text-5xl">🎁</span>
        </div>
      </div>

      <div className="space-y-4 px-4 pb-6">
        <section>
          <p className="mb-2 font-extrabold">{t('Siz va do‘stingiz uchun bonus')}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Users className="h-4 w-4" />
              </span>
              <p className="mt-2 text-xs text-muted">{t('Sizga')}</p>
              <p className="text-base font-extrabold text-brand">{formatSom(BONUS)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <UserPlus className="h-4 w-4" />
              </span>
              <p className="mt-2 text-xs text-muted">{t('Do‘stingizga')}</p>
              <p className="text-base font-extrabold text-sky-600">{formatSom(BONUS)}</p>
            </div>
          </div>
        </section>

        <section>
          <p className="mb-3 font-extrabold">{t('Qanday ishlaydi?')}</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { icon: Share2, text: t('Do‘stingizga havolangizni yuboring') },
              { icon: UserPlus, text: t('Do‘stingiz ro‘yxatdan o‘tadi') },
              { icon: Car, text: t('Do‘stingiz birinchi buyurtmani bajaradi') },
              { icon: Gift, text: t('Siz va do‘stingiz bonus olasiz!') },
            ].map((s) => (
              <div key={s.text}>
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <s.icon className="h-4 w-4" />
                </span>
                <p className="mt-1.5 text-[10px] font-semibold leading-tight text-muted">{t(s.text)}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex overflow-hidden rounded-2xl bg-white shadow-sm">
          <p className="min-w-0 flex-1 truncate px-3 py-3 text-xs font-semibold text-muted">{url}</p>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 bg-brand px-3 text-xs font-extrabold text-white"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {t('Nusxa olish')}
          </button>
        </div>

        <section>
          <p className="mb-2 text-sm font-bold">{t('Ulashish usullari')}</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {methods.map((m) => {
              const inner = (
                <>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${m.className}`}>
                    <m.icon className="h-5 w-5" />
                  </span>
                  <span className="mt-1 max-w-[72px] text-center text-[10px] font-bold leading-tight">{t(m.label)}</span>
                </>
              )
              if (m.href) {
                return (
                  <a key={m.id} href={m.href} target="_blank" rel="noreferrer" className="flex w-[76px] shrink-0 flex-col items-center">
                    {inner}
                  </a>
                )
              }
              return (
                <button key={m.id} type="button" onClick={m.onClick} className="flex w-[76px] shrink-0 flex-col items-center">
                  {inner}
                </button>
              )
            })}
          </div>
        </section>

        {telegramOpen ? (
          <DriverSheet title="Telegram" onClose={() => setTelegramOpen(false)}>
            <p className="mb-3 text-sm text-muted">{t('Qayerga o‘tmoqchisiz?')}</p>
            <div className="space-y-2">
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-3"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <Bot className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold">{t('Telegram Bot')}</span>
                  <span className="block truncate text-xs text-muted">{TELEGRAM_BOT_URL.replace('https://', '')}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </a>
              <a
                href={TELEGRAM_CHANNEL_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-3"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Radio className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold">{t('Telegram Kanal')}</span>
                  <span className="block truncate text-xs text-muted">t.me/taxiline_uzbekistan</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </a>
            </div>
          </DriverSheet>
        ) : null}

        <Link to="/driver" className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3">
          <span className="text-xl">🏆</span>
          <p className="min-w-0 flex-1 text-xs font-semibold leading-snug">
            {t('Ko‘proq do‘st taklif qiling, ko‘proq bonus oling! Cheksiz do‘st taklif qiling va daromadingizni oshiring.')}
          </p>
          <ChevronRight className="h-4 w-4 text-amber-500" />
        </Link>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-extrabold">{t('Statistika')}</p>
            <Link to="/driver/stats" className="text-xs font-bold text-brand">
              {t('Batafsil')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat n="0" label={t('Taklif qilingan')} icon={Users} color="bg-brand-soft text-brand" />
            <Stat n="0" label={t('Ro‘yxatdan o‘tgan')} icon={Check} color="bg-sky-50 text-sky-600" />
            <Stat n="0" label={t('Buyurtma bajargan')} icon={Car} color="bg-emerald-50 text-emerald-600" />
            <Stat n={formatSom(0)} label={t('Jami bonus')} icon={Gift} color="bg-amber-50 text-amber-600" />
          </div>
        </section>

        <section className="flex items-start gap-3 rounded-2xl bg-white p-4">
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-brand">{t('Eslatma')}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {t('Bonuslar do‘stingiz birinchi buyurtmani bajarganidan so‘ng 24 soat ichida balansingizga qo‘shiladi.')}
            </p>
          </div>
          <span className="text-3xl">👛</span>
        </section>
      </div>
    </div>
  )
}

function InstagramMark({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  )
}

function Stat({ n, label, icon: Icon, color }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-lg font-extrabold">{n}</p>
      <p className="text-[11px] font-semibold text-muted">{t(label)}</p>
    </div>
  )
}
