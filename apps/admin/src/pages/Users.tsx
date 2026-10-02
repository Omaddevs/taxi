import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Users as UsersIcon } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { SearchInput, FilterPills } from '../components/ui/Filters'
import { Avatar } from '../components/ui/Avatar'
import { SkeletonTable, EmptyState } from '../components/ui/EmptyState'
import { formatSom, displayName } from '../lib/utils'
import { ROLE_LABEL, ROLE_TONE } from '../lib/labels'
import type { AdminUserRow } from '../types'

export default function Users() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', debounced, role],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debounced) params.set('q', debounced)
      if (role) params.set('role', role)
      return api.get<AdminUserRow[]>(`/admin/users?${params.toString()}`)
    },
  })

  const columns: Column<AdminUserRow>[] = [
    {
      header: 'Foydalanuvchi',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name || u.phone} src={u.avatarUrl} size="sm" />
          <div>
            <p className="font-semibold text-ink">{displayName(u)}</p>
            <p className="text-xs text-muted">{u.phone}</p>
          </div>
        </div>
      ),
    },
    { header: 'Rol', cell: (u) => <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge> },
    { header: 'Balans', cell: (u) => formatSom(u.balance) },
    {
      header: 'Telegram',
      cell: (u) => (u.telegramId ? <Badge tone="green">Bog‘langan</Badge> : <Badge tone="gray">Yo‘q</Badge>),
    },
    {
      header: 'Holat',
      cell: (u) => (u.verified ? <Badge tone="green">Tasdiqlangan</Badge> : <Badge tone="gray">Kutilmoqda</Badge>),
    },
  ]

  return (
    <div>
      <PageHeader title="Foydalanuvchilar" subtitle={data ? `${data.length} ta natija` : undefined} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Ism yoki telefon" className="sm:w-72" />
        <FilterPills
          value={role}
          onChange={setRole}
          options={[
            { value: '', label: 'Barchasi' },
            { value: 'PASSENGER', label: 'Yo‘lovchi' },
            { value: 'DRIVER', label: 'Haydovchi' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
        />
      </div>
      {isLoading ? (
        <SkeletonTable />
      ) : !data?.length ? (
        <EmptyState icon={UsersIcon} title="Foydalanuvchi topilmadi" text="Qidiruv shartlarini o‘zgartirib ko‘ring." />
      ) : (
        <Table columns={columns} rows={data} onRowClick={(u) => navigate(`/users/${u.id}`)} />
      )}
    </div>
  )
}
