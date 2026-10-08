import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CarFront, Pencil, Trash2, Upload } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Chart'
import { EmptyState, SkeletonGrid } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { DEFAULT_CAR_IMAGE } from '../lib/carImage'
import { fileToImageDataUrl } from '../lib/image'
import type { CarFuelType, CarRow } from '../types'

const FUEL_LABEL: Record<CarFuelType, string> = {
  BENZIN: 'Benzin',
  ELECTRO_HYBRID: 'Elektro yoki gibrid',
}

export default function Cars() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CarRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-cars'],
    queryFn: () => api.get<CarRow[]>('/admin/cars'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cars/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-cars'] }),
  })

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(car: CarRow) {
    setEditing(car)
    setModalOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Mashinalar"
        subtitle="Haydovchilar ro‘yxatdan o‘tayotganda tanlaydigan avtomobillar katalogi"
        action={<Button onClick={openCreate}>Yangi mashina</Button>}
      />

      {isLoading ? (
        <SkeletonGrid count={4} />
      ) : !data?.length ? (
        <EmptyState icon={CarFront} title="Mashinalar yo‘q" text="Hozircha hech qanday avtomobil qo‘shilmagan" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((car) => (
            <Card key={car.id} className="overflow-hidden">
              <img
                src={car.imageUrl || DEFAULT_CAR_IMAGE}
                alt={`${car.brand} ${car.model}`}
                className="h-[178px] w-full bg-white object-contain p-3"
              />
              <div className="p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-bold text-ink">{car.brand}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(car)}
                      className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove.mutate(car.id)}
                      className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm text-muted">{car.model}</p>
                  <Badge tone={car.fuelType === 'BENZIN' ? 'gray' : 'green'}>{FUEL_LABEL[car.fuelType]}</Badge>
                </div>
                <p className="text-xs font-semibold text-muted">
                  Haydovchilar tanlagan: <span className="text-ink">{car.selectionCount}</span>
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CarModal key={editing?.id ?? 'new'} open={modalOpen} editing={editing} onClose={() => setModalOpen(false)} />
    </div>
  )
}

function CarModal({ open, editing, onClose }: { open: boolean; editing: CarRow | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [brand, setBrand] = useState(editing?.brand ?? '')
  const [model, setModel] = useState(editing?.model ?? '')
  const [fuelType, setFuelType] = useState<CarFuelType>(editing?.fuelType ?? 'BENZIN')
  const [imageUrl, setImageUrl] = useState(editing?.imageUrl ?? '')
  const [error, setError] = useState('')
  const [imageBusy, setImageBusy] = useState(false)

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImageBusy(true)
    setError('')
    try {
      setImageUrl(await fileToImageDataUrl(file, 480, 0.82, { keepAlpha: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rasmni yuklab bo‘lmadi')
    } finally {
      setImageBusy(false)
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { brand: brand.trim(), model: model.trim(), fuelType, imageUrl: imageUrl.trim() }
      return editing ? api.patch(`/admin/cars/${editing.id}`, payload) : api.post('/admin/cars', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] })
      onClose()
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!brand.trim() || !model.trim()) {
      setError('Rusum va modelni to‘ldiring')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal open={open} title={editing ? 'Mashinani tahrirlash' : 'Yangi mashina qo‘shish'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Rusumi (masalan, Chevrolet)">
          <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} placeholder="Chevrolet" />
        </Field>
        <Field label="Modeli (masalan, Cobalt)">
          <input value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} placeholder="Cobalt" />
        </Field>
        <Field label="Yoqilg‘i turi">
          <select value={fuelType} onChange={(e) => setFuelType(e.target.value as CarFuelType)} className={inputClass}>
            <option value="BENZIN">Benzin</option>
            <option value="ELECTRO_HYBRID">Elektro yoki gibrid</option>
          </select>
        </Field>
        <Field label="Rasm">
          <div className="flex items-center gap-3">
            <img
              src={imageUrl || DEFAULT_CAR_IMAGE}
              alt=""
              className="h-16 w-24 shrink-0 rounded-lg border border-line bg-white object-contain p-1"
            />
            <div className="flex-1 space-y-1.5">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas">
                <Upload className="h-3.5 w-3.5" />
                {imageBusy ? 'Yuklanmoqda…' : 'Rasm tanlash'}
                <input type="file" accept="image/*" className="hidden" onChange={onFileChange} disabled={imageBusy} />
              </label>
              {imageUrl ? (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="block text-xs font-semibold text-muted hover:text-red-500"
                >
                  Rasmni olib tashlash
                </button>
              ) : null}
            </div>
          </div>
        </Field>
        {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
        <Button type="submit" disabled={mutation.isPending || imageBusy} className="w-full">
          {mutation.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
        </Button>
      </form>
    </Modal>
  )
}
