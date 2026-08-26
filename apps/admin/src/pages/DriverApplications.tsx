import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import type { DriverApplicationRow } from '../types'

const STATUS_TONE = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' } as const

export default function DriverApplications() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('PENDING')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-driver-applications', status],
    queryFn: () => api.get<DriverApplicationRow[]>(`/admin/drivers/applications${status ? `?status=${status}` : ''}`),
  })

  const review = useMutation({
    mutationFn: (input: { id: string; status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
      api.patch(`/admin/drivers/applications/${input.id}`, { status: input.status, rejectionReason: input.rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver-applications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
      setRejectingId(null)
      setReason('')
    },
  })

  return (
    <div>
      <PageHeader title="Haydovchi arizalari" subtitle={data ? `${data.length} ta ariza` : undefined} />
      <div className="mb-4 flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${status === s ? 'bg-brand text-white' : 'bg-white text-ink border border-line'}`}
          >
            {s || 'Barchasi'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted">Yuklanmoqda…</p>
      ) : (
        <div className="space-y-3">
          {(data ?? []).length === 0 ? <p className="text-muted">Arizalar topilmadi</p> : null}
          {(data ?? []).map((app) => (
            <Card key={app.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-ink">{app.fullName}</p>
                    <Badge tone={STATUS_TONE[app.status]}>{app.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{app.phone}</p>
                  <p className="mt-1 text-sm text-ink">{app.carModel} · {app.plate}</p>
                  {app.rejectionReason ? <p className="mt-1 text-sm text-red-500">Sabab: {app.rejectionReason}</p> : null}
                </div>
                {app.status === 'PENDING' ? (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => review.mutate({ id: app.id, status: 'APPROVED' })} disabled={review.isPending}>
                      Tasdiqlash
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectingId(app.id)}>
                      Rad etish
                    </Button>
                  </div>
                ) : null}
              </div>
              {rejectingId === app.id ? (
                <div className="mt-3 flex gap-2">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Rad etish sababi"
                    className="h-9 flex-1 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={!reason || review.isPending}
                    onClick={() => review.mutate({ id: app.id, status: 'REJECTED', rejectionReason: reason })}
                  >
                    Tasdiqlash
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
