import { useQuery } from '@tanstack/react-query'
import { Star, UserRound } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Card } from '../components/ui/Button'
import { api } from '../lib/api'

export default function Drivers() {
  const { data: drivers = [], isLoading, isError } = useQuery({
    queryKey: ['drivers-top'],
    queryFn: () => api.get('/drivers/top'),
  })

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader title="Haydovchilar" />
      <PageTitle title="Haydovchilar" subtitle="Tasdiqlangan haydovchilar bazasi" />
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted">Yuklanmoqda…</p>
      ) : isError ? (
        <p className="py-10 text-center text-sm font-semibold text-danger">Ro‘yxatni yuklab bo‘lmadi</p>
      ) : !drivers.length ? (
        <p className="py-10 text-center text-sm text-muted">Hozircha tasdiqlangan haydovchilar yo‘q</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {drivers.map((d) => (
            <Card key={d.id} className="flex items-center gap-3 p-4">
              {d.avatarUrl ? (
                <img src={d.avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <UserRound className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-bold">{d.name || 'Haydovchi'}</p>
                <p className="truncate text-xs text-muted">{d.carModel}</p>
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {d.ratingCount ? d.ratingAvg.toFixed(1) : 'Yangi'} · {d.tripsCount} safar
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
