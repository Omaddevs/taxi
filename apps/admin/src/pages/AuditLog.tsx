import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { SearchInput } from '../components/ui/Filters'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { displayName, formatDateTime } from '../lib/utils'
import { AUDIT_ACTION_LABEL } from '../lib/labels'
import type { AuditLogRow } from '../types'

export default function AuditLog() {
  const [q, setQ] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', q],
    queryFn: () => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      return api.get<AuditLogRow[]>(`/admin/audit?${params}`)
    },
  })

  const columns: Column<AuditLogRow>[] = [
    { header: 'Sana', cell: (row) => formatDateTime(row.createdAt) },
    {
      header: 'Amal',
      cell: (row) => <Badge tone="amber">{AUDIT_ACTION_LABEL[row.action] ?? row.action}</Badge>,
    },
    { header: 'Kim bajardi', cell: (row) => (row.actor ? displayName(row.actor) : 'Tizim') },
    { header: 'Nishon', cell: (row) => <span className="font-mono text-xs text-muted">{row.targetType}</span> },
    {
      header: 'Tafsilot',
      cell: (row) =>
        row.meta ? (
          <span className="text-xs text-muted">
            {Object.entries(row.meta)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
              .join(' · ')}
          </span>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <div>
      <PageHeader title="Audit jurnali" subtitle="Xodim hisoblari bo‘yicha o‘zgarishlar tarixi — kim, qachon, nima o‘zgartirgani" />
      <div className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Ism, telefon yoki amal bo‘yicha qidirish" className="sm:w-96" />
      </div>
      {isLoading ? (
        <SkeletonTable />
      ) : !data?.length ? (
        <EmptyState icon={ShieldCheck} title="Yozuv yo‘q" text="Xodim hisoblarida o‘zgarish bo‘lishi bilan shu yerda ko‘rinadi." />
      ) : (
        <Table columns={columns} rows={data} />
      )}
    </div>
  )
}
