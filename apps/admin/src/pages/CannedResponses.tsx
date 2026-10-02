import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquareText, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { FilterPills } from '../components/ui/Filters'
import { Field, inputClass } from '../components/ui/Chart'
import { Modal } from '../components/ui/Modal'
import { EmptyState, SkeletonGrid } from '../components/ui/EmptyState'
import { TICKET_CATEGORY_LABEL } from '../lib/labels'
import type { CannedResponseRow, TicketCategory } from '../types'

const CATEGORIES = [
  { value: '', label: 'Barchasi' },
  ...(Object.keys(TICKET_CATEGORY_LABEL) as TicketCategory[]).map((c) => ({ value: c, label: TICKET_CATEGORY_LABEL[c] })),
]

export default function CannedResponses() {
  const qc = useQueryClient()
  const [category, setCategory] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CannedResponseRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['canned-responses', category],
    queryFn: () => {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      return api.get<CannedResponseRow[]>(`/admin/canned-responses?${params}`)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/canned-responses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['canned-responses'] }),
  })

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(row: CannedResponseRow) {
    setEditing(row)
    setModalOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Tayyor javoblar"
        subtitle="Texnik xizmat murojaatlariga tez javob berish uchun shablonlar"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Yangi shablon
          </Button>
        }
      />
      <div className="mb-4">
        <FilterPills value={category} onChange={setCategory} options={CATEGORIES} />
      </div>
      {isLoading ? (
        <SkeletonGrid count={4} />
      ) : !data?.length ? (
        <EmptyState icon={MessageSquareText} title="Shablon yo‘q" text="Tez-tez uchraydigan savollarga tayyor javob shabloni qo‘shing." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((row) => (
            <Card key={row.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink">{row.title}</p>
                  {row.category ? <Badge tone="pink">{TICKET_CATEGORY_LABEL[row.category]}</Badge> : <Badge tone="gray">Umumiy</Badge>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => openEdit(row)} className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(row.id)}
                    className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted">{row.body}</p>
            </Card>
          ))}
        </div>
      )}
      <CannedResponseModal key={editing?.id ?? 'new'} open={modalOpen} editing={editing} onClose={() => setModalOpen(false)} />
    </div>
  )
}

function CannedResponseModal({
  open,
  editing,
  onClose,
}: {
  open: boolean
  editing: CannedResponseRow | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [category, setCategory] = useState<TicketCategory | ''>(editing?.category ?? '')
  const [title, setTitle] = useState(editing?.title ?? '')
  const [body, setBody] = useState(editing?.body ?? '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { category: category || undefined, title: title.trim(), body: body.trim() }
      return editing ? api.patch(`/admin/canned-responses/${editing.id}`, payload) : api.post('/admin/canned-responses', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canned-responses'] })
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Xatolik'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (title.trim().length < 2 || body.trim().length < 2) {
      setError('Sarlavha va matnni to‘ldiring')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal open={open} title={editing ? 'Shablonni tahrirlash' : 'Yangi shablon'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Kategoriya (ixtiyoriy)">
          <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory | '')} className={inputClass}>
            <option value="">Umumiy</option>
            {(Object.keys(TICKET_CATEGORY_LABEL) as TicketCategory[]).map((c) => (
              <option key={c} value={c}>
                {TICKET_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sarlavha">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Matn">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={`${inputClass} h-auto py-2`} />
        </Field>
        {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
        </Button>
      </form>
    </Modal>
  )
}
