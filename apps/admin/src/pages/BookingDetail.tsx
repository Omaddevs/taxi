import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Card } from '../components/ui/Button'
import { formatDateTime, formatSom } from '../lib/utils'
import type { BookingRow } from '../types'

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: booking, isLoading } = useQuery({
    queryKey: ['admin-booking', id],
    queryFn: () => api.get<BookingRow>(`/admin/bookings/${id}`),
  })

  if (isLoading || !booking) return <p className="text-muted">Yuklanmoqda…</p>

  return (
    <div>
      <button onClick={() => navigate('/bookings')} className="mb-4 flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Orqaga
      </button>
      <PageHeader title={`${booking.fromLabel} → ${booking.toLabel}`} subtitle={formatDateTime(booking.departAt)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Bron</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Holat</dt><dd><Badge tone="pink">{booking.status}</Badge></dd></div>
            <div className="flex justify-between"><dt className="text-muted">O‘rindiqlar</dt><dd className="font-semibold">{booking.seatsBooked}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Narx</dt><dd className="font-semibold">{formatSom(booking.totalPrice)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Xizmat turi</dt><dd className="font-semibold">{booking.rideOffer.service.title}</dd></div>
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Ishtirokchilar</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Yo‘lovchi</dt><dd className="font-semibold">{booking.rider.name || booking.rider.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Haydovchi</dt><dd className="font-semibold">{booking.rideOffer.driver.user.name || booking.rideOffer.driver.user.phone}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  )
}
