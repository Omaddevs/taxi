import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import type { DriverRow } from '../types'

export default function Drivers() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: () => api.get<DriverRow[]>('/admin/drivers'),
  })

  const columns: Column<DriverRow>[] = [
    { header: 'Ism', cell: (d) => d.user.name || '—' },
    { header: 'Telefon', cell: (d) => d.user.phone },
    { header: 'Avtomobil', cell: (d) => `${d.carModel} · ${d.plate}` },
    { header: 'Reyting', cell: (d) => d.ratingAvg.toFixed(1) },
    { header: 'Safarlar', cell: (d) => d.tripsCount },
    { header: 'Onlayn', cell: (d) => (d.online ? <Badge tone="green">Onlayn</Badge> : <Badge tone="gray">Offlayn</Badge>) },
    { header: 'Tasdiqlangan', cell: (d) => (d.approved ? <Badge tone="green">Ha</Badge> : <Badge tone="amber">Yo‘q</Badge>) },
  ]

  return (
    <div>
      <PageHeader title="Haydovchilar" subtitle={data ? `${data.length} ta haydovchi` : undefined} />
      {isLoading ? <p className="text-muted">Yuklanmoqda…</p> : <Table columns={columns} rows={data ?? []} />}
    </div>
  )
}
