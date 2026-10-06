import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Button, Card, Badge } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Modal } from '../components/ui/Modal'
import { Field, inputClass } from '../components/ui/Chart'
import { SkeletonTable } from '../components/ui/EmptyState'
import { formatSom, formatDateTime, displayName } from '../lib/utils'
import { BOOKING_LABEL, BOOKING_TONE, ROLE_LABEL, ROLE_TONE, TX_TYPE_LABEL } from '../lib/labels'
import type { AdminUserDetail } from '../types'

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [walletOpen, setWalletOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('Admin tuzatishi')
  const [walletError, setWalletError] = useState('')

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}`),
  })

  const toggleVerified = useMutation({
    mutationFn: (verified: boolean) => api.patch(`/admin/users/${id}`, { verified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const adjust = useMutation({
    mutationFn: (payload: { amount: number; title: string }) =>
      api.post('/admin/wallet/adjust', { userId: id, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] })
      setWalletOpen(false)
      setAmount('')
      setWalletError('')
    },
    onError: (err) => setWalletError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  if (isLoading || !user) return <SkeletonTable />

  return (
    <div>
      <PageHeader
        title={displayName(user)}
        subtitle={user.phone}
        onBack={() => navigate('/people')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setWalletOpen(true)}>
              Balansni o‘zgartirish
            </Button>
            <Button
              variant={user.verified ? 'outline' : 'primary'}
              disabled={toggleVerified.isPending}
              onClick={() => toggleVerified.mutate(!user.verified)}
            >
              {user.verified ? 'Tasdiqni bekor qilish' : 'Tasdiqlash'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={user.name || user.phone} src={user.avatarUrl} />
            <div>
              <p className="font-bold text-ink">{displayName(user)}</p>
              <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
            </div>
          </div>
          <dl className="space-y-2.5 text-sm">
            <Row label="Email" value={user.email || '—'} />
            <Row label="Til" value={user.language?.toUpperCase() || '—'} />
            <Row label="Telegram" value={user.telegramId ? 'Bog‘langan' : 'Yo‘q'} />
            <Row label="Balans" value={formatSom(user.balance)} />
            <Row label="Ballar / tangalar" value={`${user.points} / ${user.coins}`} />
            <Row
              label="Reyting"
              value={user.ratingCount ? `${user.ratingAvg.toFixed(1)} (${user.ratingCount})` : 'Hali yo‘q'}
            />
            <Row label="Holat" value={user.verified ? 'Tasdiqlangan' : 'Tasdiqlanmagan'} />
            <Row label="Ro‘yxatdan o‘tgan" value={formatDateTime(user.createdAt)} />
          </dl>
          {user.driver ? (
            <button
              type="button"
              onClick={() => navigate(`/drivers/${user.driver!.id}`)}
              className="mt-4 text-sm font-semibold text-brand-dark hover:underline"
            >
              Haydovchi profili →
            </button>
          ) : null}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">So‘nggi bronlar</h2>
            {user.recentBookings.length === 0 ? (
              <p className="text-sm text-muted">Bronlar yo‘q</p>
            ) : (
              <ul className="divide-y divide-line">
                {user.recentBookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2.5">
                    <button type="button" className="text-left" onClick={() => navigate(`/bookings/${b.id}`)}>
                      <p className="text-sm font-semibold text-ink">
                        {b.fromLabel} → {b.toLabel}
                      </p>
                      <p className="text-xs text-muted">{formatDateTime(b.departAt)}</p>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatSom(b.totalPrice)}</span>
                      <Badge tone={BOOKING_TONE[b.status]}>{BOOKING_LABEL[b.status]}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Tranzaksiyalar</h2>
            {user.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted">Harakatlar yo‘q</p>
            ) : (
              <ul className="divide-y divide-line">
                {user.recentTransactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-semibold text-ink">{t.title}</p>
                      <p className="text-xs text-muted">
                        {TX_TYPE_LABEL[t.type]} · {formatDateTime(t.createdAt)}
                      </p>
                    </div>
                    <span className={t.amount >= 0 ? 'font-bold text-emerald-600' : 'font-bold text-red-500'}>
                      {t.amount >= 0 ? '+' : ''}
                      {formatSom(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Olingan baholar</h2>
            {user.ratingsReceived.length === 0 ? (
              <p className="text-sm text-muted">Baholar yo‘q</p>
            ) : (
              <ul className="space-y-3">
                {user.ratingsReceived.map((r) => (
                  <li key={r.id} className="rounded-xl bg-canvas px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{displayName(r.rater)}</p>
                      <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {r.stars}
                      </span>
                    </div>
                    {r.comment ? <p className="mt-1 text-sm text-muted">{r.comment}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={walletOpen} title="Balansni o‘zgartirish" onClose={() => setWalletOpen(false)}>
        <div className="space-y-3">
          <Field label="Summa (so‘m, minus — yechish)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              placeholder="50000 yoki -20000"
            />
          </Field>
          <Field label="Izoh">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
          {walletError ? <p className="text-sm font-semibold text-red-500">{walletError}</p> : null}
          <Button
            className="w-full"
            disabled={!amount || Number(amount) === 0 || adjust.isPending}
            onClick={() => adjust.mutate({ amount: Number(amount), title })}
          >
            Saqlash
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  )
}
