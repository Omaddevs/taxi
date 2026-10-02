import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Info, Star } from 'lucide-react'
import { api } from '../../lib/api'
import { avatarOrFallback } from '../../lib/adapters'
import { DriverHeader } from './ui'

function qualityLabel(avg) {
  if (avg >= 4.8) return 'Ajoyib'
  if (avg >= 4.5) return 'Juda yaxshi'
  if (avg >= 4) return 'Yaxshi'
  if (avg >= 3) return 'O‘rtacha'
  return 'Yaxshilash kerak'
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Bugun'
  if (days === 1) return 'Kecha'
  if (days < 30) return `${days} kun oldin`
  const months = Math.floor(days / 30)
  return `${months} oy oldin`
}

export default function DriverRating() {
  const { data, isLoading } = useQuery({ queryKey: ['driver-ratings'], queryFn: () => api.get('/drivers/me/ratings') })
  // 0 alongside 0 ratings means "no real ratings yet" — never a fabricated default.
  const avg = Number(data?.avg ?? 0)
  const count = data?.count ?? 0
  const distribution = data?.distribution || { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
  const recent = data?.recent || []

  return (
    <div className="overflow-x-clip bg-canvas">
      <DriverHeader
        title="Reyting detallari"
        right={
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-muted">
            <Info className="h-4 w-4" />
          </span>
        }
      />

      <div className="space-y-3 px-4 pb-4 pt-3">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
          <div className="flex-1">
            <p className="flex items-center gap-2 text-4xl font-extrabold">
              {count > 0 ? avg.toFixed(1) : 'Yangi'} <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
            </p>
            <p className="mt-1 text-sm text-muted">{count > 0 ? `${count} ta baho` : 'Hali baho yo‘q'}</p>
          </div>
          {count > 0 ? (
            <div className="rounded-2xl bg-amber-50 px-3 py-2 text-center">
              <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-amber-700">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {qualityLabel(avg)}
              </p>
            </div>
          ) : null}
        </div>

        <section className="rounded-2xl bg-white p-4">
          <p className="mb-3 font-extrabold">Reyting taqsimoti</p>
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const n = distribution[String(star)] || 0
                const pct = count ? Math.round((n / count) * 100) : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-xs font-bold">
                    <span className="w-3">{star}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right text-muted">{n}</span>
                  </div>
                )
              })}
            </div>
            <div className="w-24 rounded-xl border border-line p-2 text-center">
              <p className="text-lg font-extrabold">{count > 0 ? avg.toFixed(1) : '—'}</p>
              <p className="text-[10px] text-muted">Umumiy reyting</p>
              <p className="mt-1 text-[10px] text-muted">{count} baho</p>
            </div>
          </div>
        </section>

        <section>
          <p className="mb-2 font-extrabold">Oxirgi baholar</p>
          {isLoading ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-muted">Yuklanmoqda…</p>
          ) : recent.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-muted">
              Hali yo‘lovchi izohlari yo‘q. Baholar safar yakunlangach paydo bo‘ladi.
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div key={r.id} className="rounded-2xl bg-white p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarOrFallback(r.riderAvatarUrl, r.riderName || 'Yo‘lovchi')}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{r.riderName || 'Yo‘lovchi'}</p>
                      <p className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < r.stars ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`}
                          />
                        ))}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted">{timeAgo(r.createdAt)}</span>
                  </div>
                  {r.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {r.comment ? <p className="mt-2 text-xs text-muted">{r.comment}</p> : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <Link to="/driver" className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3">
          <span className="text-2xl">🏅</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">Yaxshi reyting — ko‘proq buyurtma!</p>
            <p className="text-[11px] text-muted">Yuqori baho ko‘proq buyurtma va bonus olib keladi.</p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-500" />
        </Link>
      </div>
    </div>
  )
}
