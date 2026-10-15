import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BadgeCheck, CalendarClock, Car, Check, Clock, ExternalLink, Megaphone, Pencil, Phone, Repeat2, Trash2, Users, X } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { SearchInput } from '../components/ui/Filters'
import { Field, inputClass } from '../components/ui/Chart'
import { Modal } from '../components/ui/Modal'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { cn, formatDateTime, formatPhoneUz, formatSom, isCompletePhoneUz, toE164Uz } from '../lib/utils'
import type { GroupAdFeature, GroupDriverAdList, GroupDriverAdRow, GroupDriverAdTab } from '../types'

// "Haydovchilar e’lonlari": drivers' ads the bot picked up in the Telegram groups. Each waits
// here until an admin corrects the fields and puts it on the site, where it stays for 24 hours
// (then it moves to "Muddati tugagan" and can be put back up for another day).

const TABS: { value: GroupDriverAdTab; label: string; count: keyof GroupDriverAdList['counts'] }[] = [
  { value: 'PENDING', label: 'Kutilmoqda', count: 'pending' },
  { value: 'PUBLISHED', label: 'Saytda', count: 'published' },
  { value: 'EXPIRED', label: 'Muddati tugagan', count: 'expired' },
  { value: 'REJECTED', label: 'Rad etilgan', count: 'rejected' },
]

const FEATURE_LABEL: Record<GroupAdFeature, string> = {
  CARGO: 'Pochta olinadi',
  AIRCON: 'Konditsioner',
  LUGGAGE: 'Bagaj bor',
  WIFI: 'Wi-Fi',
  WOMEN: 'Ayollar uchun',
}
const FEATURES = Object.keys(FEATURE_LABEL) as GroupAdFeature[]

// Places the group ads mention most — the inputs still take any text.
const PLACES = ['Toshkent', 'Samarqand', 'Urgut', 'Jartepa', 'Toyloq', 'Kattaqo‘rg‘on', 'Jizzax', 'Guliston', 'Sirdaryo', 'Buxoro', 'Navoiy', 'Qarshi', 'Termiz', 'Andijon', 'Farg‘ona', 'Namangan', 'Xiva', 'Urganch', 'Nukus']

function telegramMessageUrl(ad: GroupDriverAdRow) {
  if (!ad.messageId) return null
  if (ad.chatUsername) return `https://t.me/${ad.chatUsername}/${ad.messageId}`
  // A private supergroup's id is -100<internal id>; t.me/c links use the internal id.
  return ad.chatId.startsWith('-100') ? `https://t.me/c/${ad.chatId.slice(4)}/${ad.messageId}` : null
}

function hoursLeft(iso: string | null) {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 3_600_000))
}

function readyToPublish(ad: GroupDriverAdRow) {
  return Boolean(ad.fromLabel && ad.toLabel && ad.phones.length)
}

function errorText(err: unknown, fallback: string) {
  return err instanceof ApiError || err instanceof Error ? err.message : fallback
}

export default function GroupDriverAds() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<GroupDriverAdTab>('PENDING')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<GroupDriverAdRow | null>(null)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['group-driver-ads', tab, q],
    queryFn: () => {
      const params = new URLSearchParams({ status: tab })
      if (q) params.set('q', q)
      return api.get<GroupDriverAdList>(`/admin/group-driver-ads?${params}`)
    },
    refetchInterval: 30_000,
  })

  const action = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: 'publish' | 'extend' | 'reject' | 'delete' }) =>
      kind === 'delete' ? api.delete(`/admin/group-driver-ads/${id}`) : api.post(`/admin/group-driver-ads/${id}/${kind}`, {}),
    onMutate: () => setError(''),
    onError: (err) => setError(errorText(err, 'Bajarib bo‘lmadi')),
    onSettled: () => qc.invalidateQueries({ queryKey: ['group-driver-ads'] }),
  })

  function run(ad: GroupDriverAdRow, kind: 'publish' | 'extend' | 'reject' | 'delete') {
    if (kind === 'delete' && !window.confirm('E’lonni butunlay o‘chirasizmi?')) return
    action.mutate({ id: ad.id, kind })
  }

  const items = data?.items ?? []

  return (
    <div>
      <PageHeader
        title="Haydovchilar e’lonlari"
        subtitle="Telegram guruhlaridan bot olib kelgan haydovchi e’lonlari. Tuzating va saytga joylang — e’lon saytda 24 soat turadi."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-[0_8px_30px_rgba(28,28,40,0.04)]">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
                tab === t.value ? 'bg-ink text-white' : 'text-ink/70 hover:bg-canvas hover:text-ink',
              )}
            >
              {t.label}
              {data ? (
                <span className={cn('min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold', tab === t.value ? 'bg-white/20' : 'bg-canvas')}>
                  {data.counts[t.count]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Matn, telefon, yo‘nalish, guruh…" className="min-w-[240px] flex-1" />
      </div>

      {error ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p> : null}

      {isLoading ? (
        <SkeletonTable />
      ) : !items.length ? (
        <EmptyState
          icon={Megaphone}
          title={q ? 'Hech narsa topilmadi' : 'Bu yerda hozircha e’lon yo‘q'}
          text={tab === 'PENDING' ? 'Guruhga haydovchi e’lon yozishi bilan bot uni shu yerga olib keladi.' : undefined}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              tab={tab}
              busy={action.isPending && action.variables?.id === ad.id}
              onEdit={() => setEditing(ad)}
              onAction={(kind) => run(ad, kind)}
            />
          ))}
        </div>
      )}

      {editing ? <EditModal key={editing.id} ad={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}

function AdCard({
  ad,
  tab,
  busy,
  onEdit,
  onAction,
}: {
  ad: GroupDriverAdRow
  tab: GroupDriverAdTab
  busy: boolean
  onEdit: () => void
  onAction: (kind: 'publish' | 'extend' | 'reject' | 'delete') => void
}) {
  const link = telegramMessageUrl(ad)
  const left = hoursLeft(ad.expiresAt)
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-extrabold text-ink">
            {ad.fromLabel || <span className="text-red-500">Qayerdan?</span>}
            <ArrowRight className="h-4 w-4 shrink-0 text-brand" />
            {ad.toLabel || <span className="text-red-500">Qayerga?</span>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="font-semibold text-ink">{ad.driverName || ad.authorName}</span>
            {ad.driver ? (
              <span className="inline-flex items-center gap-1 font-semibold text-brand-dark">
                <BadgeCheck className="h-3.5 w-3.5" /> Saytdagi haydovchi
              </span>
            ) : null}
            <span>{ad.chatTitle ?? 'Guruh'}</span>
            <span>{formatDateTime(ad.lastSeenAt)}</span>
            {ad.repostCount > 1 ? (
              <span className="inline-flex items-center gap-1" title="Shu haydovchi shu yo‘nalishni 24 soat ichida necha marta yozgan">
                <Repeat2 className="h-3.5 w-3.5" /> {ad.repostCount} marta
              </span>
            ) : null}
          </p>
        </div>
        {tab === 'PUBLISHED' ? <Badge tone="green">{left} soat qoldi</Badge> : null}
        {tab === 'EXPIRED' ? <Badge tone="gray">Tugagan</Badge> : null}
        {tab === 'REJECTED' ? <Badge tone="red">Rad etilgan</Badge> : null}
        {tab === 'PENDING' && ad.editedAt ? <Badge tone="amber">Tahrirlangan</Badge> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        <Chip icon={Clock} missing={!ad.departAt && !ad.departNote}>
          {ad.departAt ? formatDateTime(ad.departAt) : ad.departNote || 'Vaqt yo‘q'}
        </Chip>
        <Chip icon={Phone} missing={!ad.phones.length}>
          {ad.phones.length ? ad.phones.map(formatPhoneUz).join(', ') : 'Raqam yo‘q'}
        </Chip>
        {ad.seats ? <Chip icon={Users}>{ad.seats} ta joy</Chip> : null}
        {ad.carModel ? <Chip icon={Car}>{ad.carModel}</Chip> : null}
        <Chip>{ad.pricePerSeat ? formatSom(ad.pricePerSeat) : 'Narx: kelishiladi'}</Chip>
        {ad.features.map((f) => (
          <Chip key={f}>{FEATURE_LABEL[f]}</Chip>
        ))}
      </div>

      <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-canvas px-3 py-2 font-sans text-[13px] leading-5 text-ink/80">
        {ad.rawText}
      </pre>
      {ad.rejectReason ? <p className="mt-2 text-xs text-red-500">Sabab: {ad.rejectReason}</p> : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        {tab === 'PENDING' ? (
          <>
            <Button size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Tekshirish
            </Button>
            <Button
              size="sm"
              variant="soft"
              disabled={busy || !readyToPublish(ad)}
              title={readyToPublish(ad) ? 'Shu holicha saytga joylash' : 'Avval yo‘nalish va telefonni to‘ldiring'}
              onClick={() => onAction('publish')}
            >
              <Check className="h-4 w-4" /> Tez tasdiqlash
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction('reject')}>
              <X className="h-4 w-4" /> Rad etish
            </Button>
          </>
        ) : null}
        {tab === 'PUBLISHED' ? (
          <>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Tahrirlash
            </Button>
            <Button size="sm" variant="soft" disabled={busy} onClick={() => onAction('extend')}>
              <CalendarClock className="h-4 w-4" /> +24 soat
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction('reject')}>
              <X className="h-4 w-4" /> Saytdan olish
            </Button>
          </>
        ) : null}
        {tab === 'EXPIRED' ? (
          <Button size="sm" variant="soft" disabled={busy} onClick={() => onAction('extend')}>
            <CalendarClock className="h-4 w-4" /> Yana 24 soat joylash
          </Button>
        ) : null}
        {tab === 'REJECTED' ? (
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Qayta ko‘rib chiqish
          </Button>
        ) : null}
        {tab === 'EXPIRED' || tab === 'REJECTED' ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction('delete')}>
            <Trash2 className="h-4 w-4" /> O‘chirish
          </Button>
        ) : null}
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
            Guruhda ko‘rish <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </Card>
  )
}

function Chip({ icon: Icon, missing = false, children }: { icon?: typeof Clock; missing?: boolean; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold', missing ? 'bg-red-50 text-red-500' : 'bg-canvas text-ink/80')}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  )
}

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function EditModal({ ad, onClose }: { ad: GroupDriverAdRow; onClose: () => void }) {
  const qc = useQueryClient()
  const [fromLabel, setFromLabel] = useState(ad.fromLabel ?? '')
  const [toLabel, setToLabel] = useState(ad.toLabel ?? '')
  const [departAt, setDepartAt] = useState(toLocalInput(ad.departAt))
  const [departNote, setDepartNote] = useState(ad.departNote ?? '')
  const [seats, setSeats] = useState(ad.seats ? String(ad.seats) : '')
  const [price, setPrice] = useState(ad.pricePerSeat ? String(ad.pricePerSeat) : '')
  const [carModel, setCarModel] = useState(ad.carModel ?? ad.driver?.carModel ?? '')
  const [driverName, setDriverName] = useState(ad.driverName ?? '')
  const [phones, setPhones] = useState(ad.phones.join(', '))
  const [features, setFeatures] = useState<GroupAdFeature[]>(ad.features)
  const [notes, setNotes] = useState(ad.notes ?? '')
  const [error, setError] = useState('')
  const live = ad.status === 'PUBLISHED' && hoursLeft(ad.expiresAt) > 0

  const save = useMutation({
    mutationFn: ({ publish, body }: { publish: boolean; body: Record<string, unknown> }) =>
      publish ? api.post(`/admin/group-driver-ads/${ad.id}/publish`, body) : api.patch(`/admin/group-driver-ads/${ad.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-driver-ads'] })
      onClose()
    },
    onError: (err) => setError(errorText(err, 'Saqlab bo‘lmadi')),
  })

  function submit(e: FormEvent, publish: boolean) {
    e.preventDefault()
    setError('')
    const phoneList = phones
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    const bad = phoneList.find((p) => !isCompletePhoneUz(p))
    if (bad) {
      setError(`Telefon noto‘g‘ri: ${bad}`)
      return
    }
    const priceNum = price ? Number(price.replace(/\D/g, '')) : null
    if (priceNum !== null && priceNum < 1000) {
      setError('Narxni so‘mda yozing, masalan 150000')
      return
    }
    if (publish && (!fromLabel.trim() || !toLabel.trim() || !phoneList.length)) {
      setError('Saytga joylash uchun yo‘nalish va kamida bitta telefon kerak')
      return
    }
    save.mutate({
      publish,
      body: {
        fromLabel: fromLabel.trim() || null,
        toLabel: toLabel.trim() || null,
        departAt: departAt ? new Date(departAt).toISOString() : null,
        departNote: departNote.trim() || null,
        seats: seats ? Number(seats) : null,
        pricePerSeat: priceNum,
        carModel: carModel.trim() || null,
        driverName: driverName.trim() || null,
        phones: [...new Set(phoneList.map(toE164Uz))],
        features,
        notes: notes.trim() || null,
      },
    })
  }

  return (
    <Modal open title="E’lonni tekshirish" onClose={onClose} wide>
      <div className="max-h-[78vh] overflow-y-auto pr-1">
        <p className="mb-1 text-xs font-semibold text-muted">
          Asl matn · {ad.authorName}
          {ad.authorUsername ? ` (@${ad.authorUsername})` : ''} · {ad.chatTitle ?? 'Guruh'}
        </p>
        <pre className="mb-4 max-h-44 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-canvas px-3 py-2 font-sans text-[13px] leading-5 text-ink/80">
          {ad.rawText}
        </pre>

        <form onSubmit={(e) => submit(e, !live)} className="grid gap-3 sm:grid-cols-2">
          <datalist id="group-ad-places">
            {PLACES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <Field label="Qayerdan *">
            <input list="group-ad-places" value={fromLabel} onChange={(e) => setFromLabel(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Qayerga *">
            <input list="group-ad-places" value={toLabel} onChange={(e) => setToLabel(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Jo‘nash vaqti (aniq bo‘lsa)">
            <input type="datetime-local" value={departAt} onChange={(e) => setDepartAt(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Vaqt matni (aniq vaqt bo‘lmasa)">
            <input value={departNote} onChange={(e) => setDepartNote(e.target.value)} placeholder="Hozir / 13:00–14:00" className={inputClass} />
          </Field>
          <Field label="Bo‘sh joy">
            <select value={seats} onChange={(e) => setSeats(e.target.value)} className={inputClass}>
              <option value="">Ko‘rsatilmagan</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} ta
                </option>
              ))}
            </select>
          </Field>
          <Field label="Narx / 1 kishi (bo‘sh — kelishiladi)">
            <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150000" className={inputClass} />
          </Field>
          <Field label="Mashina">
            <input value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder="Gentra" className={inputClass} />
          </Field>
          <Field label="Haydovchi ismi">
            <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder={ad.authorName} className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Telefon(lar) * — vergul bilan">
              <input value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="+998901234567, +998911234567" className={inputClass} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted">Qulayliklar</span>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map((f) => {
                const on = features.includes(f)
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFeatures((prev) => (on ? prev.filter((x) => x !== f) : [...prev, f]))}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                      on ? 'bg-brand text-ink' : 'bg-canvas text-ink/70 hover:text-ink',
                    )}
                  >
                    {FEATURE_LABEL[f]}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Field label="Izoh (saytda ko‘rinadi)">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClass} h-auto py-2`} />
            </Field>
          </div>

          {error ? <p className="text-sm font-semibold text-red-500 sm:col-span-2">{error}</p> : null}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {live ? (
              <Button type="submit" disabled={save.isPending} className="flex-1">
                {save.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
              </Button>
            ) : (
              <>
                <Button type="submit" disabled={save.isPending} className="flex-1">
                  <Check className="h-4 w-4" /> {save.isPending ? 'Saqlanmoqda…' : 'Saqlash va saytga joylash (24 soat)'}
                </Button>
                <Button variant="outline" disabled={save.isPending} onClick={(e) => submit(e, false)}>
                  Faqat saqlash
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </Modal>
  )
}
