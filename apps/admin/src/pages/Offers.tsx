import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { formatDateTime, formatSom } from '../lib/utils'
import type { RideOfferRow } from '../types'

const STATUS_TONE = { ACTIVE: 'green', FULL: 'amber', CLOSED: 'gray', CANCELLED: 'red' } as const

export default function Offers() {
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-offers', status],
    queryFn: () => api.get<RideOfferRow[]>(`/admin/offers${status ? `?status=${status}` : ''}`),
  })

  const columns: Column<RideOfferRow>[] = [
    { header: 'Yo‘nalish', cell: (o) => `${o.fromLabel} → ${o.toLabel}` },
    { header: 'Haydovchi', cell: (o) => o.driver.user.name || o.driver.user.phone },
    { header: 'Sana', cell: (o) => formatDateTime(o.departAt) },
    { header: 'Joylar', cell: (o) => `${o.seatsAvailable}/${o.seatsTotal}` },
    { header: 'Narx', cell: (o) => formatSom(o.pricePerSeat) },
    { header: 'Holat', cell: (o) => <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge> },
  ]

  return (
    <div>
      <PageHeader title="Reyslar" subtitle={data ? `${data.length} ta reys` : undefined} />
      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'ACTIVE', 'FULL', 'CLOSED', 'CANCELLED'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${status === s ? 'bg-brand text-white' : 'bg-white text-ink border border-line'}`}
          >
            {s || 'Barchasi'}
          </button>
        ))}
      </div>
      {isLoading ? <p className="text-muted">Yuklanmoqda…</p> : <Table columns={columns} rows={data ?? []} />}
    </div>
  )
}
