import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Button, Card, Badge } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Modal } from '../components/ui/Modal'
import { Field, inputClass } from '../components/ui/Chart'
import { SkeletonTable } from '../components/ui/EmptyState'
import { displayName, formatDateTime, formatSom } from '../lib/utils'
import { BOOKING_LABEL, BOOKING_TONE, OFFER_LABEL, OFFER_TONE, SUB_METHOD_LABEL, SUB_STATUS_LABEL, SUB_STATUS_TONE } from '../lib/labels'
import type { DriverDetail, DriverSubscriptionDetail, SubscriptionPlanRow } from '../types'

export default function DriverDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [renewOpen, setRenewOpen] = useState(false)
  const [planId, setPlanId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [subError, setSubError] = useState('')

  const { data: driver, isLoading } = useQuery({
    queryKey: ['admin-driver', id],
    queryFn: () => api.get<DriverDetail>(`/admin/drivers/${id}`),
  })

  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ['admin-driver-subscription', id],
    queryFn: () => api.get<DriverSubscriptionDetail>(`/admin/driver-subscriptions/${id}`),
  })

  const { data: plans } = useQuery({
    queryKey: ['admin-subscription-plans'],
    queryFn: () => api.get<SubscriptionPlanRow[]>('/admin/subscription-plans'),
    enabled: renewOpen,
  })

  const setApproved = useMutation({
    mutationFn: (approved: boolean) => api.patch(`/admin/drivers/${id}`, { approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
    },
  })

  const setGender = useMutation({
    mutationFn: (gender: 'MALE' | 'FEMALE' | null) => api.patch(`/admin/drivers/${id}/gender`, { gender }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
    },
  })

  const renew = useMutation({
    mutationFn: () =>
      api.post(`/admin/driver-subscriptions/${id}/renew`, {
        planId,
        amount: amount ? Number(amount) : undefined,
        method,
        note: note || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver-subscription', id] })
      setRenewOpen(false)
      setPlanId('')
      setAmount('')
      setNote('')
      setSubError('')
    },
    onError: (err) => setSubError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  const cancel = useMutation({
    mutationFn: () => api.post(`/admin/driver-subscriptions/${id}/cancel`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-driver-subscription', id] }),
  })

  const archiveDriver = useMutation({
    mutationFn: () => api.delete(`/admin/drivers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
    },
  })

  const restoreDriver = useMutation({
    mutationFn: () => api.post(`/admin/drivers/${id}/restore`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
    },
  })

  const canManageSubscription = user?.role === 'ADMIN' || user?.role === 'SALES_OPERATOR'
  const canRestore = user?.role === 'ADMIN' || user?.role === 'SALES_OPERATOR'

  if (isLoading || !driver) return <SkeletonTable />

  return (
    <div>
      {driver.archivedAt ? (
        <Card className="mb-4 border-red-200 bg-red-50/60 p-4">
          <p className="text-sm font-semibold text-red-600">
            Bu haydovchi arxivlangan ({formatDateTime(driver.archivedAt)})
            {driver.archivedReason ? ` · ${driver.archivedReason}` : ''}
          </p>
          <p className="mt-1 text-sm text-red-500">
            Haydovchi imkoniyatlaridan foydalanish uchun "Qayta tiklash" tugmasini bosing yoki obunani yangilang —
            obuna yangilanganda ham u avtomatik qayta tiklanadi.
          </p>
        </Card>
      ) : null}

      <PageHeader
        title={displayName(driver.user)}
        subtitle={`${driver.carModel} · ${driver.plate}`}
        onBack={() => navigate('/drivers')}
        action={
          driver.archivedAt ? (
            canRestore ? (
              <Button
                disabled={restoreDriver.isPending}
                onClick={() => {
                  if (confirm('Haydovchini qayta tiklashga ishonchingiz komilmi?')) restoreDriver.mutate()
                }}
              >
                Qayta tiklash
              </Button>
            ) : undefined
          ) : user?.role === 'ADMIN' ? (
            <div className="flex gap-2">
              <Button
                variant={driver.approved ? 'outline' : 'primary'}
                disabled={setApproved.isPending}
                onClick={() => setApproved.mutate(!driver.approved)}
              >
                {driver.approved ? 'Ruxsatni bekor qilish' : 'Tasdiqlash'}
              </Button>
              <Button
                variant="danger"
                disabled={archiveDriver.isPending}
                onClick={() => {
                  if (
                    confirm(
                      'Haydovchini o‘chirishga ishonchingiz komilmi? U "Eski haydovchilar" bo‘limiga o‘tkaziladi, ma’lumotlari saqlanadi va keyinroq qayta tiklash mumkin.',
                    )
                  )
                    archiveDriver.mutate()
                }}
              >
                Haydovchini o‘chirish
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={driver.user.name || driver.user.phone} src={driver.user.avatarUrl} />
            <div>
              <p className="font-bold text-ink">{displayName(driver.user)}</p>
              <p className="text-sm text-muted">{driver.user.phone}</p>
            </div>
          </div>
          <div className="mb-4 rounded-xl bg-canvas p-3">
            <p className="text-xs font-semibold text-muted">Jinsi</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  ['MALE', '👨 Erkak'],
                  ['FEMALE', '👩 Ayol'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={setGender.isPending}
                  onClick={() => setGender.mutate(driver.user.gender === value ? null : value)}
                  className={`h-9 rounded-lg text-sm font-bold transition disabled:opacity-60 ${
                    driver.user.gender === value
                      ? value === 'FEMALE'
                        ? 'bg-[#f5559a] text-white'
                        : 'bg-ink text-white'
                      : 'bg-white text-ink hover:bg-white/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted">
              {driver.user.gender === 'FEMALE'
                ? '🌸 «Ayollar uchun taxi» buyurtmalari bu haydovchiga keladi.'
                : driver.user.gender
                  ? '«Ayollar uchun taxi» buyurtmalari bu haydovchiga kelmaydi.'
                  : 'Belgilanmagan — «Ayollar uchun taxi» buyurtmalari kelmaydi.'}
            </p>
          </div>
          <dl className="space-y-2.5 text-sm">
            <Row label="Onlayn" value={driver.online ? 'Ha' : 'Yo‘q'} />
            <Row label="Ruxsat" value={driver.approved ? 'Tasdiqlangan' : 'Yo‘q'} />
            <Row
              label="Reyting"
              value={driver.ratingCount ? `${driver.ratingAvg.toFixed(1)} (${driver.ratingCount})` : 'Hali yo‘q'}
            />
            <Row label="Safarlar" value={String(driver.tripsCount)} />
            <Row label="Guvohnoma" value={driver.licenseNumber || '—'} />
            <Row
              label="Lokatsiya"
              value={
                driver.currentLat != null && driver.currentLng != null
                  ? `${driver.currentLat.toFixed(4)}, ${driver.currentLng.toFixed(4)}`
                  : 'Noma’lum'
              }
            />
            <Row label="Yangilangan" value={formatDateTime(driver.locationUpdatedAt)} />
          </dl>
          <button
            type="button"
            onClick={() => navigate(`/users/${driver.userId}`)}
            className="mt-4 text-sm font-semibold text-brand-dark hover:underline"
          >
            Foydalanuvchi profili →
          </button>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold text-ink">So‘nggi reyslar</h2>
          {driver.recentOffers.length === 0 ? (
            <p className="text-sm text-muted">Reyslar yo‘q</p>
          ) : (
            <ul className="divide-y divide-line">
              {driver.recentOffers.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5">
                  <button type="button" className="text-left" onClick={() => navigate(`/offers/${o.id}`)}>
                    <p className="text-sm font-semibold">
                      {o.fromLabel} → {o.toLabel}
                    </p>
                    <p className="text-xs text-muted">{formatDateTime(o.departAt)}</p>
                  </button>
                  <Badge tone={OFFER_TONE[o.status]}>{OFFER_LABEL[o.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 lg:col-span-3">
          <h2 className="mb-3 text-sm font-bold text-ink">So‘nggi bronlar</h2>
          {driver.recentBookings.length === 0 ? (
            <p className="text-sm text-muted">Bronlar yo‘q</p>
          ) : (
            <ul className="divide-y divide-line">
              {driver.recentBookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <button type="button" className="text-left" onClick={() => navigate(`/bookings/${b.id}`)}>
                    <p className="text-sm font-semibold">
                      {b.fromLabel} → {b.toLabel}
                    </p>
                    <p className="text-xs text-muted">{displayName(b.rider)}</p>
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

        <Card className="p-5 lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink">Obuna</h2>
              {sub?.subscription ? (
                <Badge tone={SUB_STATUS_TONE[sub.subscription.status]}>{SUB_STATUS_LABEL[sub.subscription.status]}</Badge>
              ) : null}
            </div>
            {canManageSubscription ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setRenewOpen(true)}>
                  Obunani yangilash
                </Button>
                {sub?.subscription && sub.subscription.status !== 'CANCELLED' ? (
                  <Button
                    variant="outline"
                    disabled={cancel.isPending}
                    onClick={() => {
                      if (confirm('Obunani bekor qilishga ishonchingiz komilmi?')) cancel.mutate()
                    }}
                  >
                    Obunani bekor qilish
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {subLoading || !sub ? (
            <p className="text-sm text-muted">Yuklanmoqda...</p>
          ) : (
            <>
              <dl className="mb-4 grid gap-2.5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Row label="Tarif" value={sub.subscription?.plan.title || 'Tanlanmagan'} />
                <Row label="Muddati" value={sub.subscription ? formatDateTime(sub.subscription.expiresAt) : '—'} />
                <Row label="Qabul qilingan" value={String(sub.bookingStats.accepted)} />
                <Row label="Bekor qilingan" value={String(sub.bookingStats.cancelled)} />
              </dl>

              <h3 className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">To‘lovlar tarixi</h3>
              {sub.payments.length === 0 ? (
                <p className="text-sm text-muted">To‘lovlar yo‘q</p>
              ) : (
                <ul className="divide-y divide-line">
                  {sub.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-semibold text-ink">{p.planTitle}</p>
                        <p className="text-xs text-muted">
                          {SUB_METHOD_LABEL[p.method] || p.method} · {formatDateTime(p.createdAt)}
                          {p.note ? ` · ${p.note}` : ''}
                        </p>
                      </div>
                      <span className="font-bold text-emerald-600">{formatSom(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>
      </div>

      <Modal open={renewOpen} title="Obunani yangilash" onClose={() => setRenewOpen(false)}>
        <div className="space-y-3">
          <Field label="Tarif">
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputClass}>
              <option value="">Tanlang</option>
              {plans?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {formatSom(p.price)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Summasi (bo‘sh qoldirsangiz tarif narxi olinadi)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              placeholder="masalan 60000"
            />
          </Field>
          <Field label="To‘lov usuli">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
              <option value="cash">Naqd</option>
              <option value="transfer">O'tkazma</option>
              <option value="other">Boshqa</option>
            </select>
          </Field>
          <Field label="Izoh">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </Field>
          {subError ? <p className="text-sm font-semibold text-red-500">{subError}</p> : null}
          <Button className="w-full" disabled={!planId || renew.isPending} onClick={() => renew.mutate()}>
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
