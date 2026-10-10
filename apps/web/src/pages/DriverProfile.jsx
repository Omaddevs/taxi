import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, CalendarDays, Car, MessageCircle, Phone, Route, Star } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { DriverAdCard, DriverAvatar, memberSinceLabel, telHref, useMessageDriver } from '../components/drivers/driverUi'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatPhoneUz } from '../lib/utils'

// A driver's public profile in the passenger app: who they are, their car, live ads and what
// passengers said — with call / chat right at the top.
export default function DriverProfile() {
  const { id } = useParams()
  const { message, busyId, error } = useMessageDriver()
  const { authUser } = useAuth()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['driver-profile', id],
    queryFn: () => api.get(`/drivers/${id}/profile`),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="h-[220px] animate-pulse rounded-[26px] bg-white" />
        <div className="h-[140px] animate-pulse rounded-[22px] bg-white" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-4xl">
        <ScreenHeader title="Haydovchi" />
        <p className="py-16 text-center text-sm font-semibold text-muted">Haydovchi topilmadi yoki profili yopilgan.</p>
      </div>
    )
  }

  const { driver, offers, reviews } = data
  const phone = driver.phone
  const stats = [
    { icon: Star, value: driver.ratingCount ? driver.ratingAvg.toFixed(1) : '—', label: `${driver.ratingCount} baho` },
    { icon: Route, value: String(driver.tripsCount), label: 'safar' },
    { icon: CalendarDays, value: memberSinceLabel(driver.memberSince), label: 'dan beri' },
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <ScreenHeader title="Haydovchi profili" />

      <section className="overflow-hidden rounded-[26px] bg-white shadow-[0_10px_30px_-18px_rgba(15,29,42,0.35)]">
        <div className="relative h-[92px] bg-gradient-to-br from-[#ffe08a] via-[#ffd35c] to-[#ffb84d]">
          <img src="/home/driver-mascot.webp" alt="" className="pointer-events-none absolute -bottom-6 right-4 w-[86px] opacity-90" />
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end gap-4">
            <DriverAvatar driver={driver} size="lg" />
            <div className="min-w-0 pb-1">
              <p className="flex items-center gap-1.5">
                <span className="truncate text-[20px] font-extrabold text-ink">{driver.name}</span>
                <BadgeCheck className="h-5 w-5 shrink-0 text-brand" />
              </p>
              <p className="text-[13px] font-semibold text-muted">{driver.online ? 'Hozir onlayn' : 'Tasdiqlangan haydovchi'}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-canvas px-2 py-3 text-center">
                <s.icon className="mx-auto h-4 w-4 text-brand" />
                <p className="mt-1 truncate text-[16px] font-extrabold text-ink">{s.value}</p>
                <p className="text-[11px] font-semibold text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {authUser?.id === driver.userId ? (
            <p className="mt-4 rounded-2xl bg-canvas px-3 py-3 text-center text-[13px] font-bold text-ink/70">Bu sizning profilingiz — yo‘lovchilar sizni shunday ko‘radi</p>
          ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {phone ? (
              <a href={telHref(phone)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[14px] font-extrabold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-600">
                <Phone className="h-4 w-4" /> Qo‘ng‘iroq
              </a>
            ) : (
              <span className="flex h-12 items-center justify-center rounded-2xl bg-canvas text-[13px] font-semibold text-muted">Raqam yo‘q</span>
            )}
            <button
              type="button"
              onClick={() => message(driver.userId)}
              disabled={busyId === driver.userId}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-[14px] font-extrabold text-white shadow-sm shadow-brand/30 transition hover:bg-brand-dark disabled:opacity-60"
            >
              <MessageCircle className="h-4 w-4" /> {busyId === driver.userId ? 'Ochilmoqda…' : 'Yozish'}
            </button>
          </div>
          )}
          {phone ? <p className="mt-2 text-center text-[12px] font-semibold text-muted">{formatPhoneUz(phone)}</p> : null}
          {error ? <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-600">{error}</p> : null}
        </div>
      </section>

      <section className="mt-3 flex items-center gap-4 rounded-[22px] bg-white p-4 shadow-[0_6px_20px_rgba(28,28,40,0.05)]">
        {driver.carImageUrl ? (
          <img src={driver.carImageUrl} alt="" className="h-16 w-24 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-canvas">
            <Car className="h-7 w-7 text-brand" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-wider text-muted">Avtomobil</p>
          <p className="truncate text-[16px] font-extrabold text-ink">{driver.carModel}</p>
          <p className="mt-0.5 inline-block rounded-md border border-ink/15 bg-canvas px-2 py-0.5 text-[12px] font-extrabold uppercase tracking-wider text-ink">{driver.plate}</p>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-3 px-1 text-[17px] font-extrabold text-ink">
          Faol e’lonlar <span className="text-muted">· {offers.length}</span>
        </h2>
        {offers.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {offers.map((offer) => (
              <DriverAdCard key={offer.id} offer={offer} driver={driver} showDriver={false} onMessage={message} messaging={busyId === driver.userId} />
            ))}
          </div>
        ) : (
          <p className="rounded-[22px] bg-white px-4 py-8 text-center text-sm text-muted">Hozir faol e’lon yo‘q. Haydovchiga yozib, kerakli yo‘nalishni so‘rashingiz mumkin.</p>
        )}
      </section>

      <section className="mt-5 pb-6">
        <h2 className="mb-3 px-1 text-[17px] font-extrabold text-ink">
          Yo‘lovchilar fikri <span className="text-muted">· {reviews.length}</span>
        </h2>
        {reviews.length ? (
          <div className="space-y-2.5">
            {reviews.map((r) => (
              <article key={r.id} className="rounded-[20px] bg-white p-4 shadow-[0_6px_20px_rgba(28,28,40,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <DriverAvatar driver={{ name: r.raterName, avatarUrl: r.raterAvatar }} size="sm" />
                    <span className="text-[14px] font-bold text-ink">{r.raterName}</span>
                  </span>
                  <span className="flex items-center gap-0.5" aria-label={`${r.stars} yulduz`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </span>
                </div>
                {r.comment ? <p className="mt-2.5 text-[14px] leading-5 text-ink/80">{r.comment}</p> : null}
                {r.tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink/70">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-[22px] bg-white px-4 py-8 text-center text-sm text-muted">Hali baho qoldirilmagan.</p>
        )}
      </section>
    </div>
  )
}
