import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Field, inputClass } from '../ui/Chart'
import type { BotOrderRow } from '../../types'

// Shared by Listings.tsx (list row action) and OrderDetail.tsx (detail page action) — a
// passenger-posted bot Order's admin-editable fields. Saving re-renders every Telegram
// group/DM message this order was already dispatched to (see the bot's
// /webapp/admin/orders/:id PATCH handler), so an edit here is visible to drivers immediately.
export function OrderEditModal({ open, order, onClose }: { open: boolean; order: BotOrderRow | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [passengerName, setPassengerName] = useState(order?.passengerName ?? '')
  const [passengerPhone, setPassengerPhone] = useState(order?.passengerPhone ?? '')
  const [fromRegion, setFromRegion] = useState(order?.fromRegion ?? '')
  const [fromDistrict, setFromDistrict] = useState(order?.fromDistrict ?? '')
  const [toRegion, setToRegion] = useState(order?.toRegion ?? '')
  const [toDistrict, setToDistrict] = useState(order?.toDistrict ?? '')
  const [carBrand, setCarBrand] = useState(order?.carBrand ?? '')
  const [passengers, setPassengers] = useState(String(order?.passengers ?? 1))
  const [whenText, setWhenText] = useState(order?.whenText ?? '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/admin/bot-orders/${order!.orderId}`, {
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim(),
        fromRegion: fromRegion.trim(),
        fromDistrict: fromDistrict.trim(),
        toRegion: toRegion.trim(),
        toDistrict: toDistrict.trim(),
        carBrand: carBrand.trim(),
        passengers: Number(passengers),
        whenText: whenText.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bot-orders'] })
      qc.invalidateQueries({ queryKey: ['admin-bot-order', order!.orderId] })
      onClose()
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!passengerName.trim() || !passengerPhone.trim() || !fromRegion.trim() || !toRegion.trim()) {
      setError('Majburiy maydonlarni to‘ldiring')
      return
    }
    mutation.mutate()
  }

  if (!order) return null

  return (
    <Modal open={open} title="Yo‘lovchi elonini tahrirlash" onClose={onClose} wide>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Yo‘lovchi ismi">
          <input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Telefon">
          <input value={passengerPhone} onChange={(e) => setPassengerPhone(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Qayerdan (viloyat)">
          <input value={fromRegion} onChange={(e) => setFromRegion(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Qayerdan (tuman)">
          <input value={fromDistrict} onChange={(e) => setFromDistrict(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Qayerga (viloyat)">
          <input value={toRegion} onChange={(e) => setToRegion(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Qayerga (tuman)">
          <input value={toDistrict} onChange={(e) => setToDistrict(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Avtomobil turi">
          <input value={carBrand} onChange={(e) => setCarBrand(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Yo‘lovchilar soni">
          <input type="number" min={1} value={passengers} onChange={(e) => setPassengers(e.target.value)} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Qachon">
            <input value={whenText} onChange={(e) => setWhenText(e.target.value)} className={inputClass} />
          </Field>
        </div>
        {error ? <p className="text-sm font-semibold text-red-500 sm:col-span-2">{error}</p> : null}
        <Button type="submit" disabled={mutation.isPending} className="sm:col-span-2">
          {mutation.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
        </Button>
      </form>
    </Modal>
  )
}
