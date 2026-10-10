import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Briefcase, Car, Clock, MessageCircle, Phone, Star, UserRound, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { dayMonth, formatPhoneUz, formatSom, monthName } from '../../lib/utils'
import { t } from '../../i18n'

// Shared pieces of the "Haydovchilar" section (drivers' ads + driver profile).

const TZ = 'Asia/Tashkent'

function tashkentParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type)?.value
  return { ymd: `${get('year')}-${get('month')}-${get('day')}`, month: Number(get('month')), day: Number(get('day')), time: `${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}` }
}

export function tashkentDate(offsetDays = 0) {
  return tashkentParts(new Date(Date.now() + offsetDays * 86_400_000)).ymd
}

/** "Bugun, 14:30" / "Ertaga, 07:00" / "15-oktabr, 09:00" (Tashkent time). */
export function departLabel(iso) {
  const p = tashkentParts(new Date(iso))
  const day = p.ymd === tashkentDate(0) ? t('Bugun') : p.ymd === tashkentDate(1) ? t('Ertaga') : dayMonth(p.day, p.month - 1, { dash: true, lower: true })
  return { day, time: p.time, full: `${day}, ${p.time}` }
}

export function memberSinceLabel(iso) {
  const d = new Date(iso)
  return `${monthName(d.getMonth(), { lower: true })} ${d.getFullYear()}`
}

export function telHref(phone) {
  return `tel:${String(phone || '').replace(/[^\d+]/g, '')}`
}

/** "Yozish": opens (or reuses) the conversation with the driver, then the chat screen. */
export function useMessageDriver() {
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  async function message(driverUserId) {
    setError('')
    setBusyId(driverUserId)
    try {
      // Chat API lives under /conversations (server app.ts).
      const { id } = await api.post('/conversations/direct', { userId: driverUserId })
      navigate(`/messages/${id}`)
    } catch (err) {
      setError(err.message || t('Chatni ochib bo‘lmadi'))
    } finally {
      setBusyId(null)
    }
  }
  return { message, busyId, error }
}

export function DriverAvatar({ driver, size = 'md' }) {
  const box = size === 'lg' ? 'h-20 w-20 text-2xl' : size === 'sm' ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-base'
  return (
    <span className={`relative inline-flex shrink-0 ${box}`}>
      {driver.avatarUrl ? (
        <img src={driver.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-full object-cover ring-2 ring-white" />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand-soft to-[#c7f1f4] font-extrabold text-brand-dark ring-2 ring-white">
          {(driver.name || 'H').trim().charAt(0).toUpperCase() || <UserRound className="h-5 w-5" />}
        </span>
      )}
      {driver.online ? <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" title={t('Hozir onlayn')} /> : null}
    </span>
  )
}

export function RatingLine({ driver, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold text-ink/80 ${className}`}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {driver.ratingCount ? `${driver.ratingAvg.toFixed(1)} (${driver.ratingCount})` : t('Yangi')}
      <span className="text-muted">·</span>
      {t('{0} safar', driver.tripsCount)}
    </span>
  )
}

function SeatDots({ total, available }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={t('{0} ta bo‘sh joy', available)}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < available ? 'bg-brand' : 'bg-slate-200'}`} />
      ))}
    </span>
  )
}

/** One driver ad. `showDriver={false}` on the driver's own profile page. */
export function DriverAdCard({ offer, driver, showDriver = true, onMessage, messaging = false }) {
  const when = departLabel(offer.departAt)
  const phone = offer.phones?.[0]
  const full = offer.seatsAvailable <= 0
  const womenOnly = offer.genderPref === 'FEMALE'
  // A driver looking at their own ad: no calling, messaging or booking themselves.
  const { authUser } = useAuth()
  const own = Boolean(authUser?.id && authUser.id === driver.userId)

  return (
    <article className="overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_10px_30px_-18px_rgba(15,29,42,0.35)] transition hover:border-brand/40">
      {showDriver ? (
        <Link to={`/drivers/${driver.id}`} className="flex items-center gap-3 border-b border-line/70 px-4 py-3 transition hover:bg-canvas/60">
          <DriverAvatar driver={driver} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-extrabold text-ink">{t(driver.name)}</span>
              <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label={t('Tasdiqlangan haydovchi')} />
            </span>
            <RatingLine driver={driver} />
          </span>
          <span className="hidden text-right sm:block">
            <span className="block text-[13px] font-bold text-ink">{driver.carModel}</span>
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{driver.plate}</span>
          </span>
        </Link>
      ) : null}

      <div className="px-4 pb-4 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-[17px] font-extrabold leading-tight text-ink">
              <span className="truncate">{offer.fromLabel}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-brand" />
              <span className="truncate">{offer.toLabel}</span>
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <Clock className="h-3.5 w-3.5 text-brand" /> {when.full}
              </span>
              {offer.service ? <span>{offer.service}</span> : null}
              {!showDriver ? null : (
                <span className="inline-flex items-center gap-1 sm:hidden">
                  <Car className="h-3.5 w-3.5" /> {driver.carModel}
                </span>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[19px] font-extrabold leading-none text-ink">{formatSom(offer.pricePerSeat)}</p>
            <p className="mt-1 text-[11px] font-semibold text-muted">{t('1 kishi uchun')}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold ${full ? 'bg-slate-100 text-slate-500' : 'bg-brand-soft text-brand-dark'}`}>
            <Users className="h-3.5 w-3.5" />
            {full ? t('Joy qolmagan') : t('{0} ta bo‘sh joy', offer.seatsAvailable)}
            <SeatDots total={offer.seatsTotal} available={offer.seatsAvailable} />
          </span>
          {offer.luggageCapacity ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-[12px] font-bold text-ink/80">
              <Briefcase className="h-3.5 w-3.5" /> {t('{0} ta bagaj', offer.luggageCapacity)}
            </span>
          ) : null}
          {womenOnly ? <span className="rounded-full bg-pink-50 px-3 py-1.5 text-[12px] font-bold text-pink-600">{t('Faqat ayollar uchun')}</span> : null}
        </div>

        {offer.notes ? <p className="mt-3 line-clamp-2 rounded-xl bg-canvas px-3 py-2 text-[13px] leading-5 text-ink/80">{offer.notes}</p> : null}

        {own ? (
          <p className="mt-4 flex h-11 items-center justify-center rounded-xl bg-canvas text-[13px] font-bold text-ink/70">{t('Sizning e’loningiz')}</p>
        ) : (
        <div className="mt-4 grid grid-cols-[1fr_1fr_1.4fr] gap-2">
          {phone ? (
            <a
              href={telHref(phone)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-white text-[13px] font-bold text-ink transition hover:border-emerald-300 hover:bg-emerald-50"
              title={formatPhoneUz(phone)}
            >
              <Phone className="h-4 w-4 text-emerald-600" /> {t('Qo‘ng‘iroq')}
            </a>
          ) : (
            <span className="flex h-11 items-center justify-center rounded-xl border border-line text-[12px] font-semibold text-muted">{t('Raqam yo‘q')}</span>
          )}
          <button
            type="button"
            onClick={() => onMessage?.(driver.userId)}
            disabled={messaging}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-white text-[13px] font-bold text-ink transition hover:border-brand/40 hover:bg-brand-soft/50 disabled:opacity-60"
          >
            <MessageCircle className="h-4 w-4 text-brand" /> {messaging ? '…' : t('Yozish')}
          </button>
          <Link
            to={`/trip/${offer.id}`}
            aria-disabled={full}
            className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-[13px] font-extrabold transition ${
              full ? 'pointer-events-none bg-slate-100 text-slate-400' : 'bg-brand text-white shadow-sm shadow-brand/30 hover:bg-brand-dark'
            }`}
          >
            {t('Joy band qilish')}
          </Link>
        </div>
        )}
      </div>
    </article>
  )
}
