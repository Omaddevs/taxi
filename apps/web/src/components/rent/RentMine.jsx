import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { VEHICLE_TYPE } from '../../data/rentals'
import { Cover, EmptyBlock, ListingCard } from './shared'
import { distanceKm, mainPrice, som, useMyRentals, useOrigin, useRentFavorites, useRentNav, useRentals } from './rentData'
import { t } from '../../i18n'

function statusOf(l) {
  if (l.status === 'PENDING') return { label: t('Moderatsiyada'), tone: 'bg-amber-100 text-amber-800' }
  if (l.status === 'REJECTED') return { label: t('Rad etildi'), tone: 'bg-red-100 text-red-600' }
  if (!l.active) return { label: t('Yashirin'), tone: 'bg-slate-200 text-slate-600' }
  return { label: t('Faol'), tone: 'bg-emerald-100 text-emerald-700' }
}

function ScreenTitle({ title, hint }) {
  return (
    <header className="px-4 pb-2 pt-8 lg:px-8">
      <h2 className="text-[26px] font-black tracking-tight text-ink">{t(title)}</h2>
      {hint ? <p className="text-[13px] text-muted">{t(hint)}</p> : null}
    </header>
  )
}

export function RentMine() {
  const { go } = useRentNav()
  const queryClient = useQueryClient()
  const { data = [], isLoading } = useMyRentals()

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['rentals-mine'] })
    queryClient.invalidateQueries({ queryKey: ['rentals'] })
  }
  const toggle = useMutation({
    mutationFn: (l) => api.patch(`/rentals/${l.id}`, { active: !l.active }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/rentals/${id}`),
    onSuccess: refresh,
  })

  return (
    <div className="pb-6">
      <ScreenTitle title={t('Mening e’lonlarim')} hint={t('Ijaraga bergan transportlaringiz')} />

      {isLoading ? (
        <div className="space-y-3 px-4 pt-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[132px] animate-pulse rounded-[24px] bg-canvas" />
          ))}
        </div>
      ) : data.length ? (
        <ul className="space-y-3 px-4 pt-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 lg:px-8">
          {data.map((l) => {
            const st = statusOf(l)
            const price = mainPrice(l)
            const photos = Array.isArray(l.photos) ? l.photos : []
            return (
              <li key={l.id} className="rounded-[24px] border border-line bg-white p-3">
                <div className="flex gap-3">
                  <Cover src={photos[0]} className="h-[84px] w-[84px] shrink-0 rounded-[18px]" iconClass="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-bold', st.tone)}>{t(st.label)}</span>
                    <p className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-ink">{t(l.title)}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      {t(VEHICLE_TYPE[l.vehicleType]?.label)}
                      {price ? t(' · {0} so‘m/{1}', som(price.amount), price.unit) : ''}
                      {l.status === 'APPROVED' ? t(' · {0} ko‘rish', l.views) : ''}
                    </p>
                  </div>
                </div>
                {l.status === 'REJECTED' && l.rejectionReason ? (
                  <p className="mt-2 rounded-[14px] bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">{l.rejectionReason}</p>
                ) : null}
                {l.status === 'PENDING' ? (
                  <p className="mt-2 rounded-[14px] bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                    {t('Operator tekshirmoqda. Tasdiqlangach, bildirishnoma olasiz.')}
                  </p>
                ) : null}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => go({ ijara: 'yangi', tahrir: l.id })}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-[14px] bg-canvas text-[13px] font-bold text-ink"
                  >
                    <Pencil className="h-4 w-4" /> {t('Tahrir')}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle.mutate(l)}
                    disabled={toggle.isPending}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-[14px] bg-canvas text-[13px] font-bold text-ink"
                  >
                    {l.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {l.active ? t('Yashirish') : t('Ko‘rsatish')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`“${l.title}” e’loni o‘chirilsinmi?`)) remove.mutate(l.id)
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-[14px] bg-red-50 text-[13px] font-bold text-red-600"
                  >
                    <Trash2 className="h-4 w-4" /> {t('O‘chirish')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyBlock
          title={t('Hali e’lon joylamagansiz')}
          text={t('Skuter, samokat, velosiped yoki mototsiklingizni ijaraga bering va daromad qiling.')}
          action={
            <button
              type="button"
              onClick={() => go({ ijara: 'yangi' })}
              className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-full bg-brand px-6 text-sm font-extrabold text-white"
            >
              <Plus className="h-4 w-4" strokeWidth={3} /> {t('E’lon joylash')}
            </button>
          }
        />
      )}
    </div>
  )
}

export function RentSaved() {
  const { go } = useRentNav()
  const favs = useRentFavorites()
  const origin = useOrigin()
  const { data = [] } = useRentals()
  const saved = data.filter((l) => favs.has(l.id))

  return (
    <div className="pb-6">
      <ScreenTitle title={t('Saqlanganlar')} hint={t('Yoqqan e’lonlar shu qurilmada saqlanadi')} />
      {saved.length ? (
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-5 px-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:px-8 xl:grid-cols-5">
          {saved.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              km={distanceKm(origin, l)}
              saved
              onToggleSave={() => favs.toggle(l.id)}
              onOpen={() => go({ ijara: 'saqlangan', elon: l.id })}
            />
          ))}
        </div>
      ) : (
        <EmptyBlock title={t('Hozircha bo‘sh')} text={t('E’lonlardagi ♡ belgisini bosing, ular shu yerda to‘planadi.')} />
      )}
    </div>
  )
}
