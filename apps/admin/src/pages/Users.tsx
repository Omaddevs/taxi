import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { formatSom } from '../lib/utils'
import type { AdminUserRow } from '../types'

const ROLE_TONE = { PASSENGER: 'gray', DRIVER: 'pink', ADMIN: 'amber' } as const

export default function Users() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', q, role],
    queryFn: () => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (role) params.set('role', role)
      return api.get<AdminUserRow[]>(`/admin/users?${params.toString()}`)
    },
  })

  const columns: Column<AdminUserRow>[] = [
    { header: 'Ism', cell: (u) => u.name || '—' },
    { header: 'Telefon', cell: (u) => u.phone },
    { header: 'Rol', cell: (u) => <Badge tone={ROLE_TONE[u.role] as never}>{u.role}</Badge> },
    { header: 'Balans', cell: (u) => formatSom(u.balance) },
    { header: 'Tasdiqlangan', cell: (u) => (u.verified ? <Badge tone="green">Ha</Badge> : <Badge tone="gray">Yo‘q</Badge>) },
  ]

  return (
    <div>
      <PageHeader title="Foydalanuvchilar" subtitle={data ? `${data.length} ta foydalanuvchi` : undefined} />
      <div className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ism yoki telefon bo‘yicha qidirish"
          className="h-10 w-64 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand"
        >
          <option value="">Barcha rollar</option>
          <option value="PASSENGER">Yo‘lovchi</option>
          <option value="DRIVER">Haydovchi</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {isLoading ? <p className="text-muted">Yuklanmoqda…</p> : <Table columns={columns} rows={data ?? []} onRowClick={(u) => navigate(`/users/${u.id}`)} />}
    </div>
  )
}
