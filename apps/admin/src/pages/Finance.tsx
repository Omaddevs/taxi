import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { SearchInput, FilterPills } from '../components/ui/Filters'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { displayName, formatDateTime, formatSom } from '../lib/utils'
import { TX_STATUS_LABEL, TX_TYPE_LABEL } from '../lib/labels'
import type { TransactionRow, TransactionStatus, TransactionType } from '../types'

export default function Finance() {
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-transactions', type, status, debounced],
    queryFn: () => {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (status) params.set('status', status)
      if (debounced) params.set('q', debounced)
      return api.get<TransactionRow[]>(`/admin/wallet/transactions?${params.toString()}`)
    },
  })

  const columns: Column<TransactionRow>[] = [
    { header: 'Foydalanuvchi', cell: (t) => displayName(t.user) },
    { header: 'Sarlavha', cell: (t) => t.title },
    { header: 'Tur', cell: (t) => TX_TYPE_LABEL[t.type] },
    {
      header: 'Summa',
      cell: (t) => (
        <span className={t.amount >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'}>
          {t.amount >= 0 ? '+' : ''}
          {formatSom(t.amount)}
        </span>
      ),
    },
    {
      header: 'Holat',
      cell: (t) => (
        <Badge tone={t.status === 'SUCCESS' ? 'green' : t.status === 'FAILED' ? 'red' : 'amber'}>
          {TX_STATUS_LABEL[t.status]}
        </Badge>
      ),
    },
    { header: 'Sana', cell: (t) => formatDateTime(t.createdAt) },
  ]

  return (
    <div>
      <PageHeader title="Tranzaksiyalar" subtitle={data ? `${data.length} ta yozuv` : undefined} />
      <div className="mb-4 flex flex-col gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Ism, telefon yoki sarlavha" className="sm:w-72" />
        <FilterPills
          value={type}
          onChange={setType}
          options={[
            { value: '', label: 'Barcha turlar' },
            ...(Object.keys(TX_TYPE_LABEL) as TransactionType[]).map((k) => ({ value: k, label: TX_TYPE_LABEL[k] })),
          ]}
        />
        <FilterPills
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'Barcha holatlar' },
            ...(Object.keys(TX_STATUS_LABEL) as TransactionStatus[]).map((k) => ({
              value: k,
              label: TX_STATUS_LABEL[k],
            })),
          ]}
        />
      </div>
      {isLoading ? (
        <SkeletonTable />
      ) : !data?.length ? (
        <EmptyState icon={Wallet} title="Tranzaksiyalar yo‘q" />
      ) : (
        <Table columns={columns} rows={data} />
      )}
    </div>
  )
}
