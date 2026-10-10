import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, LoaderCircle, MapPin, Package, Phone, Send, Truck, X } from 'lucide-react'
import { api } from '../../lib/api'
import { cn, formatPhoneUz, formatSom } from '../../lib/utils'
import { googleMapsUrl } from '../../lib/geo'
import { cargoTypes, cargoVehicles } from '../../data/mock'
import { lockScroll } from '../../lib/scrollLock'

const typeById = Object.fromEntries(cargoTypes.map((t) => [t.id, t]))
const vehicleById = Object.fromEntries(cargoVehicles.map((v) => [v.id, v]))

const STEPS = [
  { key: 'NEW', label: 'Buyurtma berildi', hint: 'Haydovchi qidirilmoqda' },
  { key: 'CLAIMED', label: 'Haydovchi topildi', hint: 'Yukingiz yo‘lda' },
  { key: 'DELIVERED', label: 'Yetkazildi', hint: 'Qabul qiluvchiga topshirildi' },
]

function when(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function phoneHref(phone) {
  return `tel:${String(phone || '').replace(/[^\d+]/g, '')}`
}

/** Sender's view of one cargo order: progress, the driver once found, and cancel. */
export function CargoDetailSheet({ orderId, onClose }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const { data: order, isLoading } = useQuery({
    queryKey: ['cargo-orders', orderId],
    queryFn: () => api.get(`/cargo-orders/${orderId}`),
    enabled: Boolean(orderId),
    refetchInterval: 10_000,
  })

  const cancel = useMutation({
    mutationFn: () => api.post(`/cargo-orders/${orderId}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargo-orders'] })
    },
    onError: (err) => setError(err?.message || 'Bekor qilib bo‘lmadi'),
  })

  useEffect(() => {
    if (!orderId) return undefined
    return lockScroll()
  }, [orderId])

  if (!orderId) return null

  const type = order ? typeById[order.cargoType] : null
  const vehicle = order?.vehicleType ? vehicleById[order.vehicleType] : null
  const cancelled = order?.status === 'CANCELLED'
  const stepIndex = order ? STEPS.findIndex((s) => s.key === order.status) : -1
  const stamps = order ? { NEW: order.createdAt, CLAIMED: order.claimedAt, DELIVERED: order.deliveredAt } : {}

  return createPortal(
    <div className="fixed inset-0 z-[11000]">
      <button type="button" className="absolute inset-0 bg-ink/45" aria-label="Yopish" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[90vh] max-w-2xl overflow-y-auto overscroll-contain rounded-t-[28px] bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(28,28,40,0.18)]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-extrabold text-ink">Yetkazib berish</h3>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas" aria-label="Yopish">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading || !order ? (
          <div className="flex items-center justify-center py-16 text-sm font-semibold text-muted">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Yuklanmoqda…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Holat */}
            {cancelled ? (
              <div className="rounded-2xl bg-rose-50 p-4">
                <p className="font-extrabold text-rose-600">Buyurtma bekor qilindi</p>
                {order.cancelReason ? <p className="mt-1 text-sm text-rose-600/80">{order.cancelReason}</p> : null}
              </div>
            ) : (
              <ol className="rounded-2xl bg-canvas p-4">
                {STEPS.map((s, i) => {
                  const done = i <= stepIndex
                  const current = i === stepIndex
                  return (
                    <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < STEPS.length - 1 ? (
                        <span className={cn('absolute left-[13px] top-7 h-[calc(100%-20px)] w-0.5', i < stepIndex ? 'bg-brand' : 'bg-slate-200')} />
                      ) : null}
                      <span
                        className={cn(
                          'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                          done ? 'bg-brand text-white' : 'bg-white text-slate-300 ring-2 ring-slate-200',
                          current && order.status !== 'DELIVERED' && 'ring-4 ring-brand/20',
                        )}
                      >
                        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="h-2 w-2 rounded-full bg-slate-300" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-[15px] font-bold', done ? 'text-ink' : 'text-muted')}>{s.label}</span>
                        <span className="block text-[12px] text-muted">{done && stamps[s.key] ? when(stamps[s.key]) : s.hint}</span>
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}

            {/* Haydovchi */}
            {order.driver ? (
              <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-brand-dark">
                  {order.driver.user.avatarUrl ? (
                    <img src={order.driver.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Truck className="h-5 w-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold text-ink">{order.driver.user.name || 'Haydovchi'}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {[order.driver.carModel, order.driver.plate].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <a href={phoneHref(order.driver.user.phone)} className="flex h-11 items-center gap-1.5 rounded-full bg-brand px-4 text-[13px] font-bold text-white">
                  <Phone className="h-4 w-4" /> Qo‘ng‘iroq
                </a>
              </div>
            ) : !cancelled && order.status === 'NEW' ? (
              <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3 text-[13px] font-semibold text-amber-800">
                <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
                Buyurtmangiz haydovchilarga yuborildi. Kimdir qabul qilishi bilan shu yerda va Telegramda xabar olasiz.
              </div>
            ) : null}

            {/* Yo‘nalish */}
            <div className="rounded-2xl border border-line p-3">
              <p className="flex items-start gap-2.5 text-[14px]">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase text-muted">Olib ketish</span>
                  <span className="font-semibold text-ink">{order.fromLabel}</span>
                </span>
                {order.fromLat != null ? (
                  <a href={googleMapsUrl(order.fromLat, order.fromLng)} target="_blank" rel="noreferrer" className="text-brand" aria-label="Xaritada">
                    <MapPin className="h-5 w-5" />
                  </a>
                ) : null}
              </p>
              <p className="mt-3 flex items-start gap-2.5 text-[14px]">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase text-muted">Yetkazish</span>
                  <span className="font-semibold text-ink">{order.toLabel}</span>
                </span>
                {order.toLat != null ? (
                  <a href={googleMapsUrl(order.toLat, order.toLng)} target="_blank" rel="noreferrer" className="text-brand" aria-label="Xaritada">
                    <MapPin className="h-5 w-5" />
                  </a>
                ) : null}
              </p>
            </div>

            {/* Yuk */}
            <dl className="grid grid-cols-2 gap-2 text-[13px]">
              <Info label="Yuk turi" value={type?.title || order.cargoType} icon={Package} />
              <Info label="Og‘irlik" value={order.weightLabel} />
              <Info label="Transport" value={vehicle?.title || '—'} />
              <Info label="Narx" value={formatSom(order.price)} strong />
              <Info label="Qabul qiluvchi" value={order.recipientName} />
              <Info label="Telefon" value={formatPhoneUz(order.recipientPhone)} />
            </dl>
            {order.note ? <p className="rounded-2xl bg-canvas p-3 text-[13px] text-ink">📝 {order.note}</p> : null}

            {error ? <p className="text-center text-sm font-semibold text-red-500">{error}</p> : null}
            {order.status === 'NEW' || order.status === 'CLAIMED' ? (
              <button
                type="button"
                disabled={cancel.isPending}
                onClick={() => {
                  if (window.confirm('Buyurtmani bekor qilasizmi?')) cancel.mutate()
                }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 text-sm font-bold text-rose-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Buyurtmani bekor qilish
              </button>
            ) : null}
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
              <Send className="h-3 w-3" /> Holat o‘zgarsa, Telegram orqali ham xabar beramiz
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function Info({ label, value, strong = false, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-canvas px-3 py-2.5">
      <dt className="flex items-center gap-1 text-[11px] font-semibold text-muted">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </dt>
      <dd className={cn('mt-0.5 truncate text-ink', strong ? 'text-[15px] font-extrabold' : 'font-semibold')}>{value || '—'}</dd>
    </div>
  )
}
