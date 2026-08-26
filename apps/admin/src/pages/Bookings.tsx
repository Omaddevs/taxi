import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { formatDateTime, formatSom } from '../lib/utils'
import type { BookingRow } from '../types'

const STATUS_TONE = {
  PENDING: 'amber',
  ACCEPTED: 'pink',
  ONGOING: 'pink',
  COMPLETED: 'green',
  CANCELLED: 'red',
} as const

export default function Bookings() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', status],
    queryFn: () => api.get<BookingRow[]>(`/admin/bookings${status ? `?status=${status}` : ''}`),
    refetchInterval: 15_000,
  })

  const columns: Column<BookingRow>[] = [
    { header: 'Yo‘nalish', cell: (b) => `${b.fromLabel} → ${b.toLabel}` },
    { header: 'Yo‘lovchi', cell: (b) => b.rider.name || b.rider.phone },
    { header: 'Haydovchi', cell: (b) => b.rideOffer.driver.user.name || b.rideOffer.driver.user.phone },
    { header: 'Sana', cell: (b) => formatDateTime(b.departAt) },
    { header: 'Narx', cell: (b) => formatSom(b.totalPrice) },
    { header: 'Holat', cell: (b) => <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge> },
  ]

  return (
    <div>
      <PageHeader title="Bronlar" subtitle={data ? `${data.length} ta bron (jonli)` : undefined} />
      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'PENDING', 'ACCEPTED', 'ONGOING', 'COMPLETED', 'CANCELLED'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${status === s ? 'bg-brand text-white' : 'bg-white text-ink border border-line'}`}
          >
            {s || 'Barchasi'}
          </button>
        ))}
      </div>
      {isLoading ? <p className="text-muted">Yuklanmoqda…</p> : <Table columns={columns} rows={data ?? []} onRowClick={(b) => navigate(`/bookings/${b.id}`)} />}
    </div>
  )
}
