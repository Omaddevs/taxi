import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Field, inputClass } from '../ui/Chart'
import type { RideOfferRow } from '../../types'

// Shared by Listings.tsx (list row action) and OfferDetail.tsx (detail page action) — a
// driver-posted RideOffer's admin-editable fields. The server blocks price/time changes once
// any seat is taken (same guard the driver-side edit uses) — but that guard only looks at
// whether those keys are present in the patch, not whether the value actually changed, so this
// form must omit them entirely when left untouched or every edit to an offer with bookings
// would 409 even for an unrelated field like notes.
export function OfferEditModal({ open, offer, onClose }: { open: boolean; offer: RideOfferRow | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [fromLabel, setFromLabel] = useState(offer?.fromLabel ?? '')
  const [toLabel, setToLabel] = useState(offer?.toLabel ?? '')
  const [fromAddress, setFromAddress] = useState(offer?.fromAddress ?? '')
  const [toAddress, setToAddress] = useState(offer?.toAddress ?? '')
  const [departAt, setDepartAt] = useState(offer ? toLocalInput(offer.departAt) : '')
  const [pricePerSeat, setPricePerSeat] = useState(String(offer?.pricePerSeat ?? ''))
  const [luggageCapacity, setLuggageCapacity] = useState(String(offer?.luggageCapacity ?? 0))
  const [notes, setNotes] = useState(offer?.notes ?? '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      const nextDepartAt = new Date(departAt).toISOString()
      const nextPrice = Number(pricePerSeat)
      return api.patch(`/admin/offers/${offer!.id}`, {
        fromLabel: fromLabel.trim(),
        toLabel: toLabel.trim(),
        fromAddress: fromAddress.trim(),
        toAddress: toAddress.trim(),
        luggageCapacity: Number(luggageCapacity),
        notes: notes.trim() || undefined,
        ...(nextDepartAt !== new Date(offer!.departAt).toISOString() ? { departAt: nextDepartAt } : {}),
        ...(nextPrice !== offer!.pricePerSeat ? { pricePerSeat: nextPrice } : {}),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-offers'] })
      qc.invalidateQueries({ queryKey: ['admin-offer', offer!.id] })
      onClose()
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!fromLabel.trim() || !toLabel.trim() || !pricePerSeat) {
      setError('Yo‘nalish va narxni to‘ldiring')
      return
    }
    mutation.mutate()
  }

  if (!offer) return null

  return (
    <Modal open={open} title="Reysni tahrirlash" onClose={onClose} wide>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Qayerdan">
          <input value={fromLabel} onChange={(e) => setFromLabel(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Qayerga">
          <input value={toLabel} onChange={(e) => setToLabel(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Qayerdan manzil">
          <input value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Qayerga manzil">
          <input value={toAddress} onChange={(e) => setToAddress(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Jo‘nash vaqti">
          <input type="datetime-local" value={departAt} onChange={(e) => setDepartAt(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Narx / joy">
          <input
            type="number"
            min={1000}
            value={pricePerSeat}
            onChange={(e) => setPricePerSeat(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Yuk hajmi">
          <input
            type="number"
            min={0}
            value={luggageCapacity}
            onChange={(e) => setLuggageCapacity(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Izoh">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClass} h-auto py-2`} />
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

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
