import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Send } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { CARS } from '../ui/SearchPickers'
import { Button } from '../ui/Button'

/**
 * "Mashina qidiryapman" — turns the home search form into a request that drivers receive in
 * their Telegram groups/DMs and in the website's driver section (POST /bot-orders/mine).
 */
export function RideRequestCard({ search, prominent = false }) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)

  const send = useMutation({
    mutationFn: () =>
      api.post('/bot-orders/mine', {
        fromRegion: search.fromRegion,
        fromDistrict: search.fromPlace || undefined,
        toRegion: search.toRegion,
        toDistrict: search.toPlace || undefined,
        date: search.date || undefined,
        time: search.time || undefined,
        passengers: Number(search.passengers) || 1,
        seat: search.seat || undefined,
        luggage: search.luggage || undefined,
        gender: search.gender || undefined,
        carBrand: CARS.find((c) => c.id === search.car)?.title,
        note: note.trim() || undefined,
      }),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['bot-orders', 'mine'] })
    },
  })

  if (result) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 font-extrabold text-emerald-700">
          <CheckCircle2 className="h-5 w-5" /> So‘rovingiz yuborildi
        </p>
        <p className="mt-1 text-sm text-emerald-800">
          {result.sent > 0
            ? 'Haydovchilar so‘rovingizni oldi. Qabul qilgan haydovchi siz bilan telefon orqali bog‘lanadi.'
            : 'So‘rovingiz saqlandi va haydovchilar bo‘limida ko‘rinadi. Bu yo‘nalishdagi haydovchi qabul qilishi bilan sizga xabar beramiz.'}
        </p>
        <Link to="/orders" className="mt-3 inline-block text-sm font-bold text-brand">
          Buyurtmalarimni ko‘rish →
        </Link>
      </div>
    )
  }

  const error = send.error instanceof ApiError ? send.error.message : send.error ? 'Xatolik yuz berdi, qayta urinib ko‘ring' : ''
  const ready = Boolean(search.fromRegion && search.toRegion)

  return (
    <div className={`rounded-2xl bg-white p-4 ${prominent ? 'border-2 border-brand/30 shadow-sm' : 'border border-line'}`}>
      <p className="font-extrabold text-ink">{prominent ? 'Mos reys topilmadi' : 'Mos reys yo‘qmi?'}</p>
      <p className="mt-1 text-sm text-muted">
        So‘rov yuboring — {search.fromRegion || '…'} → {search.toRegion || '…'} yo‘nalishidagi haydovchilar ko‘radi va
        qabul qilgan haydovchi o‘zi bog‘lanadi.
      </p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="Izoh (ixtiyoriy): olib ketish joyi, yuk, qo‘shimcha talab…"
        className="mt-3 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
      />
      {error ? <p className="mt-2 text-sm font-semibold text-red-500">{error}</p> : null}
      <Button className="mt-3 w-full" onClick={() => send.mutate()} disabled={!ready || send.isPending}>
        <Send className="h-4 w-4" />
        {send.isPending ? 'Yuborilmoqda…' : 'Haydovchilarga so‘rov yuborish'}
      </Button>
    </div>
  )
}
