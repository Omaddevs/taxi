import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gift, Pencil, Plus, Trash2, X } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Chart'
import { Modal } from '../components/ui/Modal'
import { Switch } from '../components/ui/Switch'
import { EmptyState, SkeletonGrid } from '../components/ui/EmptyState'
import type { LandingPromoPeriod, LandingPromoPrize, LandingPromoRow } from '../types'

const PERIOD_LABEL: Record<LandingPromoPeriod, string> = { haftalik: 'Haftalik', oylik: 'Oylik', doimiy: 'Doimiy' }
const KEY = ['admin-landing-promos']

// Saytdagi (taxiline.uz) "Aksiyalar" bo‘limi. Faol aksiya qolmasa bo‘lim saytda umuman ko‘rinmaydi.
export default function LandingPromos() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LandingPromoRow | null>(null)

  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: () => api.get<LandingPromoRow[]>('/admin/promotions') })

  const toggle = useMutation({
    mutationFn: (row: LandingPromoRow) => api.patch(`/admin/promotions/${row.id}`, { active: !row.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/promotions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  function openEdit(row: LandingPromoRow | null) {
    setEditing(row)
    setModalOpen(true)
  }

  function onDelete(row: LandingPromoRow) {
    if (window.confirm('Aksiya o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.')) remove.mutate(row.id)
  }

  const activeCount = data?.filter((p) => p.active).length ?? 0

  return (
    <div>
      <PageHeader
        title="Aksiyalar"
        subtitle={data ? (activeCount ? `Saytda ${activeCount} ta aksiya ko‘rinmoqda` : 'Saytda “Aksiyalar” bo‘limi yashirin — faol aksiya yo‘q') : undefined}
        action={
          <Button onClick={() => openEdit(null)}>
            <Plus className="h-4 w-4" />
            Yangi aksiya
          </Button>
        }
      />

      {isLoading ? (
        <SkeletonGrid count={3} />
      ) : !data?.length ? (
        <EmptyState icon={Gift} title="Aksiyalar yo‘q" text="Saytda “Aksiyalar” bo‘limi ko‘rinmaydi. Yangi aksiya qo‘shsangiz, u darhol paydo bo‘ladi." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((row) => (
            <Card key={row.id} className={`flex flex-col p-5 ${row.active ? '' : 'opacity-60'}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="pink">{PERIOD_LABEL[row.period] ?? row.period}</Badge>
                  {row.active ? <Badge tone="green">Saytda</Badge> : <Badge tone="gray">Yashirin</Badge>}
                  {row.soon ? <Badge tone="amber">Tez orada</Badge> : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => openEdit(row)} aria-label="Tahrirlash" className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => onDelete(row)} aria-label="O‘chirish" className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Sovg‘alar</p>
              <ol className="mt-1 space-y-1 text-sm text-ink">
                {row.prizes.map((p, i) => (
                  <li key={i}>
                    {i + 1}. {p.place} — <b>{p.reward}</b> {p.tail}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">Shartlar</p>
              <p className="mt-1 flex-1 text-sm text-muted">
                {row.terms} {row.termsBold ? <b className="text-ink">{row.termsBold}</b> : null}
              </p>
              <div className="mt-4 border-t border-line pt-3">
                <Switch checked={row.active} onChange={() => toggle.mutate(row)} label="Saytda ko‘rsatish" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <PromoModal key={editing?.id ?? 'new'} open={modalOpen} editing={editing} onClose={() => setModalOpen(false)} />
    </div>
  )
}

const EMPTY_PRIZE: LandingPromoPrize = { place: '', reward: '', tail: '' }

function PromoModal({ open, editing, onClose }: { open: boolean; editing: LandingPromoRow | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [period, setPeriod] = useState<LandingPromoPeriod>(editing?.period ?? 'haftalik')
  const [prizes, setPrizes] = useState<LandingPromoPrize[]>(editing?.prizes.length ? editing.prizes : [{ ...EMPTY_PRIZE }])
  const [terms, setTerms] = useState(editing?.terms ?? '')
  const [termsBold, setTermsBold] = useState(editing?.termsBold ?? '')
  const [soon, setSoon] = useState(editing?.soon ?? false)
  const [active, setActive] = useState(editing?.active ?? true)
  const [sortOrder, setSortOrder] = useState(String(editing?.sortOrder ?? 0))
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        period,
        prizes: prizes.map((p) => ({ place: p.place.trim(), reward: p.reward.trim(), ...(p.tail?.trim() ? { tail: p.tail.trim() } : {}) })),
        terms: terms.trim(),
        termsBold: termsBold.trim(),
        soon,
        active,
        sortOrder: Number(sortOrder) || 0,
      }
      return editing ? api.patch(`/admin/promotions/${editing.id}`, payload) : api.post('/admin/promotions', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      onClose()
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  function setPrize(i: number, patch: Partial<LandingPromoPrize>) {
    setPrizes((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (prizes.some((p) => !p.place.trim() || !p.reward.trim())) {
      setError('Har bir sovg‘a uchun “Kimga” va “Sovg‘a” maydonlarini to‘ldiring')
      return
    }
    if (terms.trim().length < 2) {
      setError('Shartlarni yozing')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal open={open} title={editing ? 'Aksiyani tahrirlash' : 'Yangi aksiya'} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Davr">
            <select value={period} onChange={(e) => setPeriod(e.target.value as LandingPromoPeriod)} className={inputClass}>
              {(Object.keys(PERIOD_LABEL) as LandingPromoPeriod[]).map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tartib raqami (kichigi oldinda)">
            <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold text-muted">Bizdan sovg‘alar</p>
          <div className="space-y-2">
            {prizes.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1.4fr_auto] gap-2">
                <input value={p.place} onChange={(e) => setPrize(i, { place: e.target.value })} placeholder="Kimga: 1-o‘rin" className={inputClass} />
                <input value={p.reward} onChange={(e) => setPrize(i, { reward: e.target.value })} placeholder="Sovg‘a: 500 000 so‘m" className={inputClass} />
                <input value={p.tail ?? ''} onChange={(e) => setPrize(i, { tail: e.target.value })} placeholder="Izoh (ixtiyoriy)" className={inputClass} />
                <button
                  type="button"
                  onClick={() => setPrizes((list) => list.filter((_, j) => j !== i))}
                  disabled={prizes.length === 1}
                  aria-label="Sovg‘ani olib tashlash"
                  className="rounded-lg px-2 text-muted hover:bg-canvas hover:text-red-500 disabled:opacity-30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {prizes.length < 5 ? (
            <button type="button" onClick={() => setPrizes((list) => [...list, { ...EMPTY_PRIZE }])} className="mt-2 text-sm font-semibold text-brand-dark hover:underline">
              + Sovg‘a qo‘shish
            </button>
          ) : null}
        </div>

        <Field label="Shartlar">
          <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} className={`${inputClass} h-auto py-2`} />
        </Field>
        <Field label="Qalin qilib ajratiladigan qism (ixtiyoriy)">
          <input value={termsBold} onChange={(e) => setTermsBold(e.target.value)} placeholder="G‘oliblar har dushanba e’lon qilinadi" className={inputClass} />
        </Field>

        <div className="flex flex-col gap-2 rounded-xl bg-canvas p-3">
          <Switch checked={active} onChange={setActive} label="Saytda ko‘rsatish" />
          <Switch checked={soon} onChange={setSoon} label="Tugma “Tez orada” bo‘lib tursin (hali boshlanmagan)" />
        </div>

        {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
        </Button>
      </form>
    </Modal>
  )
}
