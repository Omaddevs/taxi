import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Route } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { SearchInput, FilterPills } from '../components/ui/Filters'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { formatDateTime, formatSom, displayName } from '../lib/utils'
import { OFFER_LABEL, OFFER_TONE } from '../lib/labels'
import type { OfferStatus, RideOfferRow } from '../types'

export default function Offers() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-offers', status, debounced],
    queryFn: () => {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (debounced) params.set('q', debounced)
      return api.get<RideOfferRow[]>(`/admin/offers?${params.toString()}`)
    },
  })

  const columns: Column<RideOfferRow>[] = [
    { header: 'Yo‘nalish', cell: (o) => `${o.fromLabel} → ${o.toLabel}` },
    { header: 'Haydovchi', cell: (o) => displayName(o.driver.user) },
    { header: 'Sana', cell: (o) => formatDateTime(o.departAt) },
    { header: 'Joylar', cell: (o) => `${o.seatsAvailable}/${o.seatsTotal}` },
    { header: 'Narx', cell: (o) => formatSom(o.pricePerSeat) },
    { header: 'Holat', cell: (o) => <Badge tone={OFFER_TONE[o.status]}>{OFFER_LABEL[o.status]}</Badge> },
  ]

  const statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'Barchasi' },
    ...(Object.keys(OFFER_LABEL) as OfferStatus[]).map((s) => ({ value: s, label: OFFER_LABEL[s] })),
  ]

  return (
    <div>
      <PageHeader title="Reyslar" subtitle={data ? `${data.length} ta reys` : undefined} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Yo‘nalish yoki haydovchi" className="sm:w-72" />
        <FilterPills value={status} onChange={setStatus} options={statusOptions} />
      </div>
      {isLoading ? (
        <SkeletonTable />
      ) : !data?.length ? (
        <EmptyState icon={Route} title="Reyslar topilmadi" />
      ) : (
        <Table columns={columns} rows={data} onRowClick={(o) => navigate(`/offers/${o.id}`)} />
      )}
    </div>
  )
}
