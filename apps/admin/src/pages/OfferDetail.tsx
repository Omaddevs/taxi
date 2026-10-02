import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { SkeletonTable } from '../components/ui/EmptyState'
import { displayName, formatDateTime, formatSom } from '../lib/utils'
import { OFFER_LABEL, OFFER_TONE } from '../lib/labels'
import { OfferEditModal } from '../components/listings/OfferEditModal'
import type { RideOfferRow } from '../types'
import { useState } from 'react'

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const { data: offer, isLoading } = useQuery({
    queryKey: ['admin-offer', id],
    queryFn: () => api.get<RideOfferRow>(`/admin/offers/${id}`),
  })

  const cancel = useMutation({
    mutationFn: () => api.patch(`/admin/offers/${id}/cancel`),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-offer', id], updated)
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Bekor qilib bo‘lmadi'),
  })

  const setStatus = useMutation({
    mutationFn: (status: 'ACTIVE' | 'CLOSED') => api.patch(`/admin/offers/${id}/status`, { status }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-offer', id], updated)
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Holatni o‘zgartirib bo‘lmadi'),
  })

  const remove = useMutation({
    mutationFn: () => api.delete<{ hardDeleted: boolean }>(`/admin/offers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] })
      navigate('/listings')
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'O‘chirib bo‘lmadi'),
  })

  if (isLoading || !offer) return <SkeletonTable />

  const canCancel = offer.status === 'ACTIVE' || offer.status === 'FULL'
  const canPublishToggle = offer.status === 'ACTIVE' || offer.status === 'CLOSED'

  return (
    <div>
      <PageHeader
        title={`${offer.fromLabel} → ${offer.toLabel}`}
        subtitle={formatDateTime(offer.departAt)}
        onBack={() => navigate('/offers')}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={OFFER_TONE[offer.status]}>{OFFER_LABEL[offer.status]}</Badge>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Tahrirlash
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Reys</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Xizmat" value={offer.service.title} />
            <Row label="Joylar" value={`${offer.seatsAvailable} / ${offer.seatsTotal}`} />
            <Row label="Yuk" value={String(offer.luggageCapacity ?? 0)} />
            <Row label="Narx / joy" value={formatSom(offer.pricePerSeat)} />
            <Row label="Jins" value={offer.genderPref || 'Cheklov yo‘q'} />
            <Row label="Qayerdan" value={offer.fromAddress || offer.fromLabel} />
            <Row label="Qayerga" value={offer.toAddress || offer.toLabel} />
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Haydovchi</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Ism" value={displayName(offer.driver.user)} />
            <Row label="Telefon" value={offer.driver.user.phone} />
          </dl>
          <div className="mt-5 space-y-2">
            {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
            {canPublishToggle ? (
              <Button
                variant="outline"
                className="w-full"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate(offer.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE')}
              >
                {offer.status === 'ACTIVE' ? 'Yopish (unpublish)' : 'Nashr qilish (publish)'}
              </Button>
            ) : null}
            {canCancel ? (
              <Button variant="danger" className="w-full" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                Reysni bekor qilish
              </Button>
            ) : null}
            <Button
              variant="danger"
              className="w-full"
              disabled={remove.isPending}
              onClick={() => {
                if (confirm('Reys bazadan butunlay o‘chiriladi. Bog‘liq bronlar ham o‘chadi. Davom etasizmi?'))
                  remove.mutate()
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> O‘chirish
            </Button>
          </div>
        </Card>
      </div>

      <OfferEditModal open={editing} offer={offer} onClose={() => setEditing(false)} />
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
