import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Chart'
import { SkeletonTable } from '../components/ui/EmptyState'
import { formatDateTime, formatSom, displayName } from '../lib/utils'
import { BOOKING_LABEL, BOOKING_TONE } from '../lib/labels'
import type { BookingRow } from '../types'

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const { data: booking, isLoading } = useQuery({
    queryKey: ['admin-booking', id],
    queryFn: () => api.get<BookingRow>(`/admin/bookings/${id}`),
  })

  const cancel = useMutation({
    mutationFn: () => api.patch(`/admin/bookings/${id}/cancel`, { reason }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-booking', id], updated)
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      setReason('')
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Bekor qilib bo‘lmadi'),
  })

  if (isLoading || !booking) return <SkeletonTable />

  const canCancel = ['PENDING', 'ACCEPTED', 'ONGOING'].includes(booking.status)

  return (
    <div>
      <PageHeader
        title={`${booking.fromLabel} → ${booking.toLabel}`}
        subtitle={formatDateTime(booking.departAt)}
        onBack={() => navigate('/bookings')}
        action={<Badge tone={BOOKING_TONE[booking.status]}>{BOOKING_LABEL[booking.status]}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Bron</h2>
          <dl className="space-y-2 text-sm">
            <Row label="O‘rindiqlar" value={String(booking.seatsBooked)} />
            <Row label="Yuk" value={String(booking.luggage ?? 0)} />
            <Row label="Narx" value={formatSom(booking.totalPrice)} />
            <Row label="Chegirma" value={booking.discountApplied ? formatSom(booking.discountApplied) : '—'} />
            <Row label="Promo" value={booking.promoCode?.code || '—'} />
            <Row label="Xizmat" value={booking.rideOffer.service.title} />
            <Row label="Manzil (dan)" value={booking.fromAddress || booking.fromLabel} />
            <Row label="Manzil (ga)" value={booking.toAddress || booking.toLabel} />
            {booking.cancelReason ? <Row label="Bekor sababi" value={booking.cancelReason} /> : null}
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Ishtirokchilar</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Yo‘lovchi" value={`${displayName(booking.rider)} · ${booking.rider.phone}`} />
            <Row
              label="Haydovchi"
              value={`${displayName(booking.rideOffer.driver.user)} · ${booking.rideOffer.driver.user.phone}`}
            />
            <Row label="Yaratilgan" value={formatDateTime(booking.createdAt)} />
          </dl>
          {canCancel ? (
            <div className="mt-5 space-y-2">
              <Field label="Bekor qilish sababi">
                <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
              </Field>
              {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
              <Button
                variant="danger"
                className="w-full"
                disabled={!reason || cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                Bronni bekor qilish
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
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
