import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Button, Card, Badge } from '../components/ui/Button'
import { formatSom } from '../lib/utils'
import type { AdminUserRow } from '../types'

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => api.get<AdminUserRow>(`/admin/users/${id}`),
  })

  const toggleVerified = useMutation({
    mutationFn: (verified: boolean) => api.patch<AdminUserRow>(`/admin/users/${id}`, { verified }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-user', id], updated)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  if (isLoading || !user) return <p className="text-muted">Yuklanmoqda…</p>

  return (
    <div>
      <button onClick={() => navigate('/users')} className="mb-4 flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Orqaga
      </button>
      <PageHeader title={user.name || user.phone} subtitle={user.phone} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Profil</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Rol</dt><dd className="font-semibold">{user.role}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Email</dt><dd className="font-semibold">{user.email || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Balans</dt><dd className="font-semibold">{formatSom(user.balance)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Ballar</dt><dd className="font-semibold">{user.points}</dd></div>
            <div className="flex justify-between items-center"><dt className="text-muted">Holat</dt><dd>{user.verified ? <Badge tone="green">Tasdiqlangan</Badge> : <Badge tone="gray">Tasdiqlanmagan</Badge>}</dd></div>
          </dl>
          <Button
            className="mt-4 w-full"
            variant={user.verified ? 'outline' : 'primary'}
            disabled={toggleVerified.isPending}
            onClick={() => toggleVerified.mutate(!user.verified)}
          >
            {user.verified ? 'Tasdiqni bekor qilish' : 'Tasdiqlash'}
          </Button>
        </Card>
      </div>
    </div>
  )
}
