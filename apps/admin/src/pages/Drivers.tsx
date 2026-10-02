import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Car } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { FilterPills } from '../components/ui/Filters'
import { Avatar } from '../components/ui/Avatar'
import { SkeletonTable, EmptyState } from '../components/ui/EmptyState'
import { displayName } from '../lib/utils'
import type { DriverRow } from '../types'

export default function Drivers() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')

  const params = new URLSearchParams()
  if (filter === 'online') params.set('online', 'true')
  if (filter === 'offline') params.set('online', 'false')
  if (filter === 'approved') params.set('approved', 'true')
  if (filter === 'pending') params.set('approved', 'false')
  if (filter === 'archived') params.set('archived', 'true')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-drivers', filter],
    queryFn: () => api.get<DriverRow[]>(`/admin/drivers?${params.toString()}`),
    refetchInterval: 20_000,
  })

  const columns: Column<DriverRow>[] = [
    {
      header: 'Haydovchi',
      cell: (d) => (
        <div className="flex items-center gap-3">
          <Avatar name={d.user.name || d.user.phone} src={d.user.avatarUrl} size="sm" />
          <div>
            <p className="font-semibold text-ink">{displayName(d.user)}</p>
            <p className="text-xs text-muted">{d.user.phone}</p>
          </div>
        </div>
      ),
    },
    { header: 'Avtomobil', cell: (d) => `${d.carModel} · ${d.plate}` },
    {
      header: 'Reyting',
      cell: (d) => (d.ratingCount ? `${d.ratingAvg.toFixed(1)} (${d.ratingCount})` : '—'),
    },
    { header: 'Safarlar', cell: (d) => d.tripsCount },
    {
      header: 'Holat',
      cell: (d) =>
        d.archivedAt ? (
          <Badge tone="red">Arxivlangan</Badge>
        ) : d.online ? (
          <Badge tone="green">Onlayn</Badge>
        ) : (
          <Badge tone="gray">Offlayn</Badge>
        ),
    },
    {
      header: 'Ruxsat',
      cell: (d) => (d.approved ? <Badge tone="green">Tasdiqlangan</Badge> : <Badge tone="amber">Kutilmoqda</Badge>),
    },
    {
      header: 'Obuna',
      cell: (d) => {
        if (!d.subscription || d.subscription.status === 'CANCELLED') return <Badge tone="gray">Yo‘q</Badge>
        if (d.subscription.status === 'EXPIRED') return <Badge tone="red">Tugagan</Badge>
        const daysLeft = Math.ceil((new Date(d.subscription.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        if (daysLeft <= 7) return <Badge tone="amber">{daysLeft} kun qoldi</Badge>
        return <Badge tone="green">Faol</Badge>
      },
    },
  ]

  return (
    <div>
      <PageHeader title="Haydovchilar" subtitle={data ? `${data.length} ta haydovchi` : undefined} />
      <div className="mb-4">
        <FilterPills
          value={filter}
          onChange={setFilter}
          options={[
            { value: '', label: 'Barchasi' },
            { value: 'online', label: 'Onlayn' },
            { value: 'offline', label: 'Offlayn' },
            { value: 'approved', label: 'Tasdiqlangan' },
            { value: 'pending', label: 'Tasdiqlanmagan' },
            { value: 'archived', label: 'Eski haydovchilar' },
          ]}
        />
      </div>
      {isLoading ? (
        <SkeletonTable />
      ) : !data?.length ? (
        <EmptyState icon={Car} title="Haydovchi topilmadi" />
      ) : (
        <Table columns={columns} rows={data} onRowClick={(d) => navigate(`/drivers/${d.id}`)} />
      )}
    </div>
  )
}
