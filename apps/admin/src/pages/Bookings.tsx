import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { SearchInput, FilterPills } from '../components/ui/Filters'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { formatDateTime, formatSom, displayName } from '../lib/utils'
import { BOOKING_LABEL, BOOKING_TONE } from '../lib/labels'
import type { BookingRow, BookingStatus } from '../types'

export default function Bookings() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', status, debounced],
    queryFn: () => {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (debounced) params.set('q', debounced)
      return api.get<BookingRow[]>(`/admin/bookings?${params.toString()}`)
    },
    refetchInterval: 15_000,
  })

  const columns: Column<BookingRow>[] = [
    { header: 'Yo‘nalish', cell: (b) => `${b.fromLabel} → ${b.toLabel}` },
    { header: 'Yo‘lovchi', cell: (b) => displayName(b.rider) },
    { header: 'Haydovchi', cell: (b) => displayName(b.rideOffer.driver.user) },
    { header: 'Sana', cell: (b) => formatDateTime(b.departAt) },
    { header: 'Narx', cell: (b) => formatSom(b.totalPrice) },
    {
      header: 'Holat',
      cell: (b) => <Badge tone={BOOKING_TONE[b.status]}>{BOOKING_LABEL[b.status]}</Badge>,
    },
  ]

  const statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'Barchasi' },
    ...(Object.keys(BOOKING_LABEL) as BookingStatus[]).map((s) => ({ value: s, label: BOOKING_LABEL[s] })),
  ]

  return (
    <div>
      <PageHeader title="Bronlar" subtitle={data ? `${data.length} ta bron · har 15 soniyada yangilanadi` : undefined} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Yo‘nalish, ism yoki telefon" className="sm:w-72" />
        <FilterPills value={status} onChange={setStatus} options={statusOptions} />
      </div>
      {isLoading ? (
        <SkeletonTable />
      ) : !data?.length ? (
        <EmptyState icon={Ticket} title="Bronlar topilmadi" />
      ) : (
        <Table columns={columns} rows={data} onRowClick={(b) => navigate(`/bookings/${b.id}`)} />
      )}
    </div>
  )
}
