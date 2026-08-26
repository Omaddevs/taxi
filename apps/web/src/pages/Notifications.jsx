import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Card } from '../components/ui/Button'
import { api } from '../lib/api'

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'hozir'
  if (mins < 60) return `${mins} daqiqa oldin`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} soat oldin`
  return `${Math.floor(hours / 24)} kun oldin`
}

export default function Notifications() {
  const queryClient = useQueryClient()
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications'),
  })

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    if (notifications.some((n) => !n.readAt)) markAllRead.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length])

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title="Xabarnomalar" />
      <PageTitle title="Xabarnomalar" subtitle="Buyurtma, promo va to‘lov yangiliklari" />
      {notifications.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Hozircha xabarnomalar yo‘q.</p>
      ) : (
        <Card className="divide-y divide-line">
          {notifications.map((n) => (
            <div key={n.id} className="flex gap-3 px-4 py-3">
              {!n.readAt ? <span className="mt-2 h-2 w-2 rounded-full bg-brand" /> : <span className="mt-2 h-2 w-2" />}
              <div>
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-sm text-muted">{n.text}</p>
                <p className="mt-1 text-[11px] text-muted">{timeAgo(n.createdAt)}</p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
