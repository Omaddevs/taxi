import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bike,
  Check,
  Clock,
  Eye,
  EyeOff,
  MapPinned,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Chart'
import { FilterPills } from '../components/ui/Filters'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { StatCard } from '../components/ui/StatCard'
import { CoordinatePicker } from '../components/ui/CoordinatePicker'
import { fileToImageDataUrl } from '../lib/image'
import { OWNER_LABEL, STATUS_LABEL, STATUS_TONE, VEHICLE_LABEL, VEHICLE_TYPES, parseMoney } from '../lib/rentals'
import { cn, formatDateTime, formatPhoneUz, formatSom } from '../lib/utils'
import type { RentalDetail, RentalOwnerType, RentalRow, RentalStatus, RentalVehicleType } from '../types'

const QUERY_KEY = ['admin-rentals']
const MAX_PHOTOS = 6

function priceLine(r: Pick<RentalRow, 'pricePerHour' | 'pricePerDay' | 'pricePerWeek'>) {
  if (r.pricePerDay) return `${formatSom(r.pricePerDay)} / kun`
  if (r.pricePerHour) return `${formatSom(r.pricePerHour)} / soat`
  if (r.pricePerWeek) return `${formatSom(r.pricePerWeek)} / hafta`
  return '—'
}

// ---------------------------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------------------------

export default function Rentals() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<RentalRow | null>(null)

  const { data: all = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<RentalRow[]>('/admin/rentals'),
    refetchInterval: 60_000,
  })

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter((r) => {
      if (status === 'HIDDEN' ? r.active : status && r.status !== status) return false
      if (type && r.vehicleType !== type) return false
      if (!q) return true
      return [r.title, r.brand, r.model, r.companyName, r.contactName, r.phone, r.address, r.owner?.phone].some((v) =>
        v?.toLowerCase().includes(q),
      )
    })
  }, [all, status, type, search])

  const stats = useMemo(() => {
    const s = { PENDING: 0, APPROVED: 0, REJECTED: 0, live: 0, hidden: 0 }
    for (const r of all) {
      s[r.status] += 1
      if (r.status === 'APPROVED' && r.active) s.live += 1
      if (!r.active) s.hidden += 1
    }
    return s
  }, [all])

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.patch(`/admin/rentals/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/rentals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  function openCreate() {
    setEditingId(null)
    setModalOpen(true)
  }

  function openEdit(id: string) {
    setEditingId(id)
    setModalOpen(true)
  }

  function onDelete(r: RentalRow) {
    if (window.confirm(`"${r.title}" e’loni butunlay o‘chirilsinmi?`)) remove.mutate(r.id)
  }

  return (
    <div>
      <PageHeader
        title="Skuter ijara"
        subtitle="Saytdagi ijara marketi: e’lonlarni moderatsiya qilish, tahrirlash va yangi e’lon joylash"
        action={
          <div className="flex flex-wrap gap-2">
            {user?.role === 'ADMIN' ? (
              <Link
                to="/map-places?category=SCOOTER"
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-canvas"
              >
                <MapPinned className="h-4 w-4" /> Ijara nuqtalari
              </Link>
            ) : null}
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Yangi e’lon
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Bike} label="Jami e’lonlar" value={String(all.length)} hint={`${stats.hidden} ta yashirin`} />
        <StatCard icon={Clock} label="Moderatsiyada" value={String(stats.PENDING)} hint="Tasdiqlashni kutmoqda" tone="amber" />
        <StatCard icon={Check} label="Saytda faol" value={String(stats.live)} tone="success" />
        <StatCard icon={XCircle} label="Rad etilgan" value={String(stats.REJECTED)} tone="slate" />
      </div>

      <div className="mb-4 space-y-3">
        <FilterPills
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: `Barchasi (${all.length})` },
            { value: 'PENDING', label: `Moderatsiyada (${stats.PENDING})` },
            { value: 'APPROVED', label: `Tasdiqlangan (${stats.APPROVED})` },
            { value: 'REJECTED', label: `Rad etilgan (${stats.REJECTED})` },
            { value: 'HIDDEN', label: `Yashirin (${stats.hidden})` },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sarlavha, brend, tashkilot, telefon yoki manzil bo‘yicha qidirish"
              className={`${inputClass} pl-9`}
            />
          </div>
          <FilterPills
            value={type}
            onChange={setType}
            options={[{ value: '', label: 'Barcha turlar' }, ...VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.label }))]}
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : !rows.length ? (
        <EmptyState
          icon={Bike}
          title={all.length ? 'Mos e’lon topilmadi' : 'Hali e’lon yo‘q'}
          text={all.length ? 'Filtr yoki qidiruvni o‘zgartirib ko‘ring.' : '“Yangi e’lon” tugmasi orqali birinchi e’lonni joylang.'}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">E’lon</th>
                <th className="px-4 py-3">Egasi</th>
                <th className="px-4 py-3">Narx</th>
                <th className="px-4 py-3">Holati</th>
                <th className="px-4 py-3">Yangilangan</th>
                <th className="sticky right-0 bg-white px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className={cn('hover:bg-canvas/60', !r.active && 'opacity-60')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.cover ? (
                        <img src={r.cover} alt="" className="h-12 w-14 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-12 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
                          <Bike className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0 max-w-[230px]">
                        <p className="flex items-center gap-1.5 font-bold text-ink">
                          {r.featured ? <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" /> : null}
                          <span className="truncate">{r.title}</span>
                        </p>
                        <p className="truncate text-xs text-muted">
                          {[VEHICLE_LABEL[r.vehicleType], [r.brand, r.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
                          {r.photoCount ? ` · ${r.photoCount} rasm` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="max-w-[200px] truncate font-semibold text-ink">
                      {r.ownerType === 'COMPANY' ? r.companyName || 'Tashkilot' : r.contactName || r.owner?.name || 'Shaxsiy'}
                    </p>
                    <p className="text-xs text-muted">
                      {OWNER_LABEL[r.ownerType]} · {formatPhoneUz(r.phone)}
                    </p>
                    <p className="text-[11px] text-muted">{r.ownerId ? 'Saytdan joylangan' : 'Panel orqali'}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{priceLine(r)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      {!r.active ? <Badge tone="gray">Yashirin</Badge> : null}
                    </div>
                    {r.status === 'REJECTED' && r.rejectionReason ? (
                      <p className="mt-1 max-w-[200px] truncate text-[11px] text-red-500" title={r.rejectionReason}>
                        {r.rejectionReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                    <p>{formatDateTime(r.updatedAt)}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {r.views}
                    </p>
                  </td>
                  <td className="sticky right-0 bg-white px-3 py-3 shadow-[-8px_0_12px_-10px_rgba(0,0,0,0.25)]">
                    <div className="flex justify-end gap-0.5">
                      {r.status !== 'APPROVED' ? (
                        <IconBtn title="Tasdiqlash" tone="green" onClick={() => patch.mutate({ id: r.id, body: { status: 'APPROVED' } })}>
                          <Check className="h-4 w-4" />
                        </IconBtn>
                      ) : null}
                      {r.status !== 'REJECTED' ? (
                        <IconBtn title="Rad etish" tone="red" onClick={() => setRejecting(r)}>
                          <X className="h-4 w-4" />
                        </IconBtn>
                      ) : null}
                      <IconBtn
                        title={r.featured ? 'TOP dan olish' : 'TOP ga chiqarish'}
                        onClick={() => patch.mutate({ id: r.id, body: { featured: !r.featured } })}
                      >
                        <Star className={cn('h-4 w-4', r.featured && 'fill-amber-400 text-amber-400')} />
                      </IconBtn>
                      <IconBtn
                        title={r.active ? 'Saytda yashirish' : 'Saytda ko‘rsatish'}
                        onClick={() => patch.mutate({ id: r.id, body: { active: !r.active } })}
                      >
                        {r.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </IconBtn>
                      <IconBtn title="Tahrirlash" onClick={() => openEdit(r.id)}>
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn title="O‘chirish" tone="red" onClick={() => onDelete(r)}>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {modalOpen ? <RentalModal key={editingId ?? 'new'} editingId={editingId} onClose={() => setModalOpen(false)} /> : null}

      <RejectModal
        key={rejecting?.id ?? 'none'}
        listing={rejecting}
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => {
          if (!rejecting) return
          patch.mutate({ id: rejecting.id, body: { status: 'REJECTED', rejectionReason: reason } })
          setRejecting(null)
        }}
      />
    </div>
  )
}

function IconBtn({
  title,
  tone,
  onClick,
  children,
}: {
  title: string
  tone?: 'green' | 'red'
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'rounded-lg p-1.5 text-muted hover:bg-canvas',
        tone === 'green' ? 'hover:text-emerald-600' : tone === 'red' ? 'hover:text-red-500' : 'hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------------------------
// Reject reason
// ---------------------------------------------------------------------------------------------

const REJECT_PRESETS = ['Rasmlar sifatsiz yoki yo‘q', 'Narx noto‘g‘ri ko‘rsatilgan', 'Telefon raqami ishlamayapti', 'Takroriy e’lon']

function RejectModal({
  listing,
  onClose,
  onSubmit,
}: {
  listing: RentalRow | null
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  return (
    <Modal open={Boolean(listing)} title="E’lonni rad etish" onClose={onClose}>
      <p className="mb-3 text-sm text-muted">
        “{listing?.title}”. Sababni egasi bildirishnomada ko‘radi va tahrirlab qayta yuborishi mumkin.
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {REJECT_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setReason(p)}
            className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink hover:bg-canvas"
          >
            {p}
          </button>
        ))}
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={300}
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
        placeholder="Rad etish sababi"
      />
      <Button variant="danger" className="mt-3 w-full" disabled={!reason.trim()} onClick={() => onSubmit(reason.trim())}>
        Rad etish
      </Button>
    </Modal>
  )
}

// ---------------------------------------------------------------------------------------------
// Create / edit
// ---------------------------------------------------------------------------------------------

function RentalModal({ editingId, onClose }: { editingId: string | null; onClose: () => void }) {
  const { data: editing, isLoading, isError } = useQuery({
    queryKey: [...QUERY_KEY, editingId],
    queryFn: () => api.get<RentalDetail>(`/admin/rentals/${editingId}`),
    enabled: Boolean(editingId),
    staleTime: 0,
  })

  return (
    <Modal open wide title={editingId ? 'E’lonni tahrirlash' : 'Yangi ijara e’loni'} onClose={onClose}>
      {editingId && isLoading ? (
        <p className="py-10 text-center text-sm text-muted">Yuklanmoqda…</p>
      ) : editingId && (isError || !editing) ? (
        <p className="py-10 text-center text-sm text-red-500">E’lonni yuklab bo‘lmadi</p>
      ) : (
        <RentalForm editing={editing ?? null} onDone={onClose} />
      )}
    </Modal>
  )
}

const text = (v: string | null | undefined) => v ?? ''
const money = (v: number | null | undefined) => (v == null ? '' : String(v))

function RentalForm({ editing, onDone }: { editing: RentalDetail | null; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [vehicleType, setVehicleType] = useState<RentalVehicleType>(editing?.vehicleType ?? 'SCOOTER')
  const [ownerType, setOwnerType] = useState<RentalOwnerType>(editing?.ownerType ?? 'COMPANY')
  const [companyName, setCompanyName] = useState(text(editing?.companyName))
  const [contactName, setContactName] = useState(text(editing?.contactName))
  const [phone, setPhone] = useState(text(editing?.phone))
  const [telegram, setTelegram] = useState(text(editing?.telegram))
  const [title, setTitle] = useState(text(editing?.title))
  const [brand, setBrand] = useState(text(editing?.brand))
  const [model, setModel] = useState(text(editing?.model))
  const [description, setDescription] = useState(text(editing?.description))
  const [hour, setHour] = useState(money(editing?.pricePerHour))
  const [day, setDay] = useState(money(editing?.pricePerDay))
  const [week, setWeek] = useState(money(editing?.pricePerWeek))
  const [deposit, setDeposit] = useState(money(editing?.deposit))
  const [maxSpeed, setMaxSpeed] = useState(money(editing?.maxSpeed))
  const [rangeKm, setRangeKm] = useState(money(editing?.rangeKm))
  const [licenseRequired, setLicenseRequired] = useState(editing?.licenseRequired ?? false)
  const [address, setAddress] = useState(text(editing?.address))
  const [point, setPoint] = useState<[number, number] | null>(
    editing?.lat != null && editing?.lng != null ? [editing.lat, editing.lng] : null,
  )
  const [photos, setPhotos] = useState<string[]>(editing?.photos ?? [])
  const [status, setStatus] = useState<RentalStatus>(editing?.status ?? 'APPROVED')
  const [featured, setFeatured] = useState(editing?.featured ?? false)
  const [active, setActive] = useState(editing?.active ?? true)
  const [error, setError] = useState('')
  const [imageBusy, setImageBusy] = useState(false)

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length)
    e.target.value = ''
    if (!files.length) return
    setImageBusy(true)
    setError('')
    try {
      const urls = await Promise.all(files.map((f) => fileToImageDataUrl(f, 960)))
      setPhotos((list) => [...list, ...urls].slice(0, MAX_PHOTOS))
    } catch {
      setError('Rasmni yuklab bo‘lmadi')
    } finally {
      setImageBusy(false)
    }
  }

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing ? api.patch(`/admin/rentals/${editing.id}`, payload) : api.post('/admin/rentals', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      onDone()
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (title.trim().length < 3) return setError('Sarlavhani kiriting')
    if (!phone.trim()) return setError('Aloqa uchun telefon raqamini kiriting')
    if (ownerType === 'COMPANY' && !companyName.trim()) return setError('Tashkilot nomini kiriting')

    const nums = {
      pricePerHour: parseMoney(hour),
      pricePerDay: parseMoney(day),
      pricePerWeek: parseMoney(week),
      deposit: parseMoney(deposit),
      maxSpeed: parseMoney(maxSpeed),
      rangeKm: parseMoney(rangeKm),
    }
    if (Object.values(nums).some((n) => Number.isNaN(n))) return setError('Narx va ko‘rsatkichlar butun son bo‘lishi kerak')
    if (!nums.pricePerHour && !nums.pricePerDay && !nums.pricePerWeek) {
      return setError('Kamida bitta narx kiriting (soat, kun yoki hafta)')
    }

    mutation.mutate({
      vehicleType,
      ownerType,
      companyName: ownerType === 'COMPANY' ? companyName.trim() : '',
      contactName: contactName.trim(),
      phone: phone.trim(),
      telegram: telegram.trim(),
      title: title.trim(),
      brand: brand.trim(),
      model: model.trim(),
      description: description.trim(),
      ...nums,
      licenseRequired,
      address: address.trim(),
      lat: point?.[0] ?? null,
      lng: point?.[1] ?? null,
      photos,
      status,
      featured,
      active,
    })
  }

  return (
    <form onSubmit={onSubmit} className="max-h-[78vh] space-y-4 overflow-y-auto pr-1">
      {editing?.owner ? (
        <p className="rounded-xl bg-canvas px-3 py-2 text-xs text-muted">
          Saytdan joylagan: <b className="text-ink">{editing.owner.name || editing.owner.firstName || 'Foydalanuvchi'}</b> ·{' '}
          {formatPhoneUz(editing.owner.phone)}
        </p>
      ) : null}

      <Section title="Transport">
        <div className="flex flex-wrap gap-1.5">
          {VEHICLE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setVehicleType(t.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold',
                vehicleType === t.value ? 'bg-brand text-ink' : 'border border-line bg-white text-ink hover:bg-canvas',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Field label="Sarlavha *">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Masalan, Yadea G5 elektr skuter" maxLength={100} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Brend">
            <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} placeholder="Yadea, Xiaomi, Honda…" />
          </Field>
          <Field label="Model">
            <input value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} placeholder="G5, Pro 2, Dio…" />
          </Field>
          <Field label="Maks. tezlik (km/soat)">
            <input value={maxSpeed} onChange={(e) => setMaxSpeed(e.target.value)} className={inputClass} inputMode="numeric" placeholder="45" />
          </Field>
          <Field label="Bir zaryadda masofa (km)">
            <input value={rangeKm} onChange={(e) => setRangeKm(e.target.value)} className={inputClass} inputMode="numeric" placeholder="60" />
          </Field>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={licenseRequired} onChange={(e) => setLicenseRequired(e.target.checked)} className="h-4 w-4 accent-[#00c7d4]" />
          Haydovchilik guvohnomasi talab qilinadi
        </label>
      </Section>

      <Section title="Narxlar (so‘m)">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Soatiga">
            <input value={hour} onChange={(e) => setHour(e.target.value)} className={inputClass} inputMode="numeric" placeholder="25000" />
          </Field>
          <Field label="Kuniga">
            <input value={day} onChange={(e) => setDay(e.target.value)} className={inputClass} inputMode="numeric" placeholder="150000" />
          </Field>
          <Field label="Haftasiga">
            <input value={week} onChange={(e) => setWeek(e.target.value)} className={inputClass} inputMode="numeric" placeholder="800000" />
          </Field>
          <Field label="Zalog (depozit)">
            <input value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inputClass} inputMode="numeric" placeholder="500000" />
          </Field>
        </div>
      </Section>

      <Section title={`Rasmlar (${photos.length}/${MAX_PHOTOS}) — birinchisi muqova`}>
        <div className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <div key={i} className="group relative">
              <img src={src} alt="" className={cn('h-20 w-24 rounded-lg border object-cover', i === 0 ? 'border-brand' : 'border-line')} />
              {i > 0 ? (
                <button
                  type="button"
                  title="Muqova qilish"
                  onClick={() => setPhotos((list) => [list[i], ...list.filter((_, j) => j !== i)])}
                  className="absolute bottom-1 left-1 rounded-md bg-white/90 px-1.5 text-[10px] font-bold text-ink opacity-0 group-hover:opacity-100"
                >
                  Muqova
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Rasmni olib tashlash"
                onClick={() => setPhotos((list) => list.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-xs font-semibold text-muted hover:bg-canvas">
              <Upload className="h-4 w-4" />
              {imageBusy ? 'Yuklanmoqda…' : 'Qo‘shish'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} disabled={imageBusy} />
            </label>
          ) : null}
        </div>
      </Section>

      <Section title="Egasi va aloqa">
        <div className="flex gap-1.5">
          {(['COMPANY', 'PERSON'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOwnerType(t)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold',
                ownerType === t ? 'bg-ink text-white' : 'border border-line bg-white text-ink hover:bg-canvas',
              )}
            >
              {OWNER_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ownerType === 'COMPANY' ? (
            <Field label="Tashkilot nomi *">
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder="Masalan, ScootUz" />
            </Field>
          ) : null}
          <Field label="Mas’ul shaxs">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} placeholder="Ism" />
          </Field>
          <Field label="Telefon *">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+998 90 123 45 67" />
          </Field>
          <Field label="Telegram username">
            <input value={telegram} onChange={(e) => setTelegram(e.target.value)} className={inputClass} placeholder="@scootuz" />
          </Field>
        </div>
      </Section>

      <Section title="Joylashuv (ixtiyoriy) — Smart xaritada pin bo‘lib chiqadi">
        <Field label="Manzil">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} placeholder="Chilonzor, Bunyodkor ko‘chasi 12" />
        </Field>
        <CoordinatePicker value={point} onChange={setPoint} color="#00b5c2" />
        {point ? (
          <button type="button" onClick={() => setPoint(null)} className="text-xs font-semibold text-muted hover:text-red-500">
            Joylashuvni olib tashlash
          </button>
        ) : null}
      </Section>

      <Field label="Tavsif">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
          placeholder="Holati, shartlar, kafolat, yetkazib berish, qo‘shimcha jihozlar (shlem, qulf)…"
        />
      </Field>

      <Section title="Moderatsiya">
        <div className="flex flex-wrap gap-1.5">
          {(['APPROVED', 'PENDING', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold',
                status === s ? 'bg-brand text-ink' : 'border border-line bg-white text-ink hover:bg-canvas',
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[#00c7d4]" />
            Saytda ko‘rsatish
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-[#00c7d4]" />
            TOP (ro‘yxat boshida)
          </label>
        </div>
      </Section>

      {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
      <Button type="submit" disabled={mutation.isPending || imageBusy} className="w-full">
        {mutation.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
      </Button>
    </form>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-line p-3">
      <legend className="px-1 text-xs font-extrabold uppercase tracking-wide text-muted">{title}</legend>
      {children}
    </fieldset>
  )
}
