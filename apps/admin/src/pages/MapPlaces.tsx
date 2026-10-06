import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, MapPin, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { Field, inputClass } from '../components/ui/Chart'
import { FilterPills } from '../components/ui/Filters'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { fileToImageDataUrl } from '../lib/image'
import { CATEGORY_COLOR, CATEGORY_LABEL, DEFAULT_CENTER, PLACE_CATEGORIES, parseCoordinates } from '../lib/mapPlaces'
import { formatDateTime } from '../lib/utils'
import type { MapPlaceCategory, MapPlacePrice, MapPlaceRow } from '../types'

const QUERY_KEY = ['admin-map-places']

function pinIcon(color: string, selected = false) {
  const size = selected ? 22 : 16
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>`,
  })
}

function Tiles() {
  return <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
}

// ---------------------------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------------------------

export default function MapPlaces() {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MapPlaceRow | null>(null)

  const { data: all = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<MapPlaceRow[]>('/admin/places'),
  })

  const places = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter((p) => {
      if (category && p.category !== category) return false
      if (status === 'active' && !p.active) return false
      if (status === 'hidden' && p.active) return false
      if (!q) return true
      return [p.name, p.brand, p.address, p.phone].some((v) => v?.toLowerCase().includes(q))
    })
  }, [all, category, status, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of all) c[p.category] = (c[p.category] || 0) + 1
    return c
  }, [all])

  const toggle = useMutation({
    mutationFn: (p: MapPlaceRow) => api.patch(`/admin/places/${p.id}`, { active: !p.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/places/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(place: MapPlaceRow) {
    setEditing(place)
    setModalOpen(true)
  }

  function onDelete(place: MapPlaceRow) {
    if (window.confirm(`"${place.name}" xaritadan butunlay o‘chirilsinmi?`)) remove.mutate(place.id)
  }

  const activeCount = all.filter((p) => p.active).length

  return (
    <div>
      <PageHeader
        title="Xarita joylari"
        subtitle={`Saytdagi Smart xaritada ko‘rinadigan joylar · ${activeCount} ta faol, ${all.length - activeCount} ta yashirin`}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Yangi joy
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <FilterPills
          value={category}
          onChange={setCategory}
          options={[
            { value: '', label: `Barchasi (${all.length})` },
            ...PLACE_CATEGORIES.map((c) => ({ value: c.value, label: `${c.label} (${counts[c.value] || 0})` })),
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nomi, brendi, manzili yoki telefoni bo‘yicha qidirish"
              className={`${inputClass} pl-9`}
            />
          </div>
          <FilterPills
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: 'Hammasi' },
              { value: 'active', label: 'Faol' },
              { value: 'hidden', label: 'Yashirin' },
            ]}
          />
        </div>
      </div>

      {/* isolate: Leaflet panes use z-index 400+, which would otherwise paint over the modal. */}
      <Card className="isolate mb-4 overflow-hidden">
        <div className="h-[360px]">
          <OverviewMap places={places} onSelect={openEdit} />
        </div>
      </Card>

      {isLoading ? (
        <SkeletonTable />
      ) : !places.length ? (
        <EmptyState
          icon={MapPin}
          title={all.length ? 'Mos joy topilmadi' : 'Hali joy qo‘shilmagan'}
          text={all.length ? 'Filtr yoki qidiruvni o‘zgartirib ko‘ring.' : '“Yangi joy” tugmasi orqali birinchi joyni qo‘shing.'}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Joy</th>
                <th className="px-4 py-3">Toifa</th>
                <th className="px-4 py-3">Manzil</th>
                <th className="px-4 py-3">Holati</th>
                <th className="px-4 py-3">Yangilangan</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {places.map((p) => (
                <tr key={p.id} className="hover:bg-canvas/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                          style={{ background: CATEGORY_COLOR[p.category] }}
                        >
                          <MapPin className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-ink">{p.name}</p>
                        <p className="truncate text-xs text-muted">{[p.brand, p.phone].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLOR[p.category] }} />
                      {CATEGORY_LABEL[p.category]}
                    </span>
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate text-ink">{p.address || '—'}</p>
                    <p className="text-xs text-muted">
                      {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {p.active ? <Badge tone="green">Faol</Badge> : <Badge tone="gray">Yashirin</Badge>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDateTime(p.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title={p.active ? 'Saytda yashirish' : 'Saytda ko‘rsatish'}
                        onClick={() => toggle.mutate(p)}
                        className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
                      >
                        {p.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        title="Tahrirlash"
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="O‘chirish"
                        onClick={() => onDelete(p)}
                        className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <PlaceModal key={editing?.id ?? 'new'} open={modalOpen} editing={editing} onClose={() => setModalOpen(false)} />
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Overview map
// ---------------------------------------------------------------------------------------------

function FitToPlaces({ places }: { places: MapPlaceRow[] }) {
  const map = useMap()
  useEffect(() => {
    if (!places.length) return
    if (places.length === 1) map.setView([places[0].lat, places[0].lng], 15)
    else map.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 15 })
  }, [places, map])
  return null
}

function OverviewMap({ places, onSelect }: { places: MapPlaceRow[]; onSelect: (p: MapPlaceRow) => void }) {
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={12} className="h-full w-full" attributionControl={false}>
      <Tiles />
      <FitToPlaces places={places} />
      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(p.active ? CATEGORY_COLOR[p.category] : '#9ca3af')}
          title={p.name}
          eventHandlers={{ click: () => onSelect(p) }}
        />
      ))}
    </MapContainer>
  )
}

// ---------------------------------------------------------------------------------------------
// Create / edit modal
// ---------------------------------------------------------------------------------------------

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function FollowPoint({ point }: { point: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    // The modal mounts the map before its box has its final size.
    const t = setTimeout(() => map.invalidateSize(), 120)
    return () => clearTimeout(t)
  }, [map])
  useEffect(() => {
    if (point) map.setView(point, Math.max(map.getZoom(), 15))
  }, [point, map])
  return null
}

function round(n: number) {
  return Math.round(n * 1e6) / 1e6
}

type PriceDraft = { title: string; price: string }

function PlaceModal({ open, editing, onClose }: { open: boolean; editing: MapPlaceRow | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState<MapPlaceCategory>(editing?.category ?? 'FUEL')
  const [name, setName] = useState(editing?.name ?? '')
  const [brand, setBrand] = useState(editing?.brand ?? '')
  const [address, setAddress] = useState(editing?.address ?? '')
  const [phone, setPhone] = useState(editing?.phone ?? '')
  const [hours, setHours] = useState(editing?.hours ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [imageUrl, setImageUrl] = useState(editing?.imageUrl ?? '')
  const [active, setActive] = useState(editing?.active ?? true)
  const [point, setPoint] = useState<[number, number] | null>(editing ? [editing.lat, editing.lng] : null)
  const [latText, setLatText] = useState(editing ? String(editing.lat) : '')
  const [lngText, setLngText] = useState(editing ? String(editing.lng) : '')
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const [prices, setPrices] = useState<PriceDraft[]>(
    (editing?.prices ?? []).map((p) => ({ title: p.title, price: String(p.price) })),
  )
  const [error, setError] = useState('')
  const [imageBusy, setImageBusy] = useState(false)

  function setCoords(lat: number, lng: number) {
    const next: [number, number] = [round(lat), round(lng)]
    setPoint(next)
    setLatText(String(next[0]))
    setLngText(String(next[1]))
  }

  function onCoordInput(which: 'lat' | 'lng', value: string) {
    if (which === 'lat') setLatText(value)
    else setLngText(value)
    const lat = Number(which === 'lat' ? value : latText)
    const lng = Number(which === 'lng' ? value : lngText)
    if (value.trim() && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      setPoint([lat, lng])
    }
  }

  function applyLink() {
    const coords = parseCoordinates(link)
    if (!coords) {
      setLinkError('Koordinata topilmadi. Google/Yandex xarita havolasini yoki "41.31, 69.27" ko‘rinishini kiriting.')
      return
    }
    setLinkError('')
    setLink('')
    setCoords(coords[0], coords[1])
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImageBusy(true)
    setError('')
    try {
      setImageUrl(await fileToImageDataUrl(file, 720))
    } catch {
      setError('Rasmni yuklab bo‘lmadi')
    } finally {
      setImageBusy(false)
    }
  }

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing ? api.patch(`/admin/places/${editing.id}`, payload) : api.post('/admin/places', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      onClose()
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Joy nomini kiriting')
    if (!point) return setError('Joylashuvni tanlang: xaritani bosing, havola qo‘ying yoki koordinata kiriting')

    const cleanPrices: MapPlacePrice[] = []
    for (const row of prices) {
      if (!row.title.trim() && !row.price.trim()) continue
      const price = Number(row.price.replace(/\s/g, ''))
      if (!row.title.trim() || !Number.isInteger(price) || price < 0) {
        return setError('Narxlar qatorida nom va butun son (so‘m) bo‘lishi kerak')
      }
      cleanPrices.push({ title: row.title.trim(), price })
    }

    mutation.mutate({
      category,
      name: name.trim(),
      brand: brand.trim(),
      address: address.trim(),
      phone: phone.trim(),
      hours: hours.trim(),
      description: description.trim(),
      imageUrl,
      lat: point[0],
      lng: point[1],
      prices: cleanPrices,
      active,
    })
  }

  return (
    <Modal open={open} wide title={editing ? 'Joyni tahrirlash' : 'Yangi joy qo‘shish'} onClose={onClose}>
      <form onSubmit={onSubmit} className="max-h-[78vh] space-y-3 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Toifa">
            <select value={category} onChange={(e) => setCategory(e.target.value as MapPlaceCategory)} className={inputClass}>
              {PLACE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nomi *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Masalan, UzOil Chilonzor" />
          </Field>
          <Field label="Brend (ixtiyoriy)">
            <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} placeholder="UzOil, Lukoil, TaxiLine EV…" />
          </Field>
          <Field label="Telefon (ixtiyoriy)">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+998 90 123 45 67" />
          </Field>
          <Field label="Manzil (ixtiyoriy)">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} placeholder="Chilonzor tumani, Bunyodkor ko‘chasi 12" />
          </Field>
          <Field label="Ish vaqti (ixtiyoriy)">
            <input value={hours} onChange={(e) => setHours(e.target.value)} className={inputClass} placeholder="08:00–22:00 yoki 24/7" />
          </Field>
        </div>

        <Field label="Joylashuv * — xaritani bosing yoki nuqtani suring">
          <div className="space-y-2">
            <div className="isolate h-[260px] overflow-hidden rounded-xl border border-line">
              <MapContainer center={point ?? DEFAULT_CENTER} zoom={point ? 16 : 12} className="h-full w-full" attributionControl={false}>
                <Tiles />
                <ClickToPick onPick={setCoords} />
                <FollowPoint point={point} />
                {point ? (
                  <Marker
                    position={point}
                    draggable
                    icon={pinIcon(CATEGORY_COLOR[category], true)}
                    eventHandlers={{
                      dragend: (e) => {
                        const ll = (e.target as L.Marker).getLatLng()
                        setCoords(ll.lat, ll.lng)
                      },
                    }}
                  />
                ) : null}
              </MapContainer>
            </div>
            <div className="flex gap-2">
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyLink()
                  }
                }}
                className={inputClass}
                placeholder="Google yoki Yandex xarita havolasi, yoki 41.3111, 69.2797"
              />
              <Button type="button" variant="outline" onClick={applyLink} disabled={!link.trim()}>
                Qo‘llash
              </Button>
            </div>
            {linkError ? <p className="text-xs font-semibold text-red-500">{linkError}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <input value={latText} onChange={(e) => onCoordInput('lat', e.target.value)} className={inputClass} placeholder="Kenglik (lat)" inputMode="decimal" />
              <input value={lngText} onChange={(e) => onCoordInput('lng', e.target.value)} className={inputClass} placeholder="Uzunlik (lng)" inputMode="decimal" />
            </div>
          </div>
        </Field>

        <Field label="Tavsif (ixtiyoriy)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            placeholder="Qo‘shimcha ma’lumot: xizmatlar, chegirmalar, kirish joyi…"
          />
        </Field>

        <Field label="Narxlar (ixtiyoriy) — so‘mda">
          <div className="space-y-2">
            {prices.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={row.title}
                  onChange={(e) => setPrices((list) => list.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))}
                  className={inputClass}
                  placeholder="AI-92, Metan, 1 kWh, Kompleks yuvish…"
                />
                <input
                  value={row.price}
                  onChange={(e) => setPrices((list) => list.map((r, j) => (j === i ? { ...r, price: e.target.value } : r)))}
                  className={`${inputClass} max-w-[150px]`}
                  placeholder="10500"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setPrices((list) => list.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-lg px-2 text-muted hover:bg-canvas hover:text-red-500"
                  aria-label="Narxni olib tashlash"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {prices.length < 20 ? (
              <button
                type="button"
                onClick={() => setPrices((list) => [...list, { title: '', price: '' }])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Narx qo‘shish
              </button>
            ) : null}
          </div>
        </Field>

        <Field label="Rasm (ixtiyoriy)">
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-16 w-24 shrink-0 rounded-lg border border-line object-cover" />
            ) : (
              <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-muted">
                <MapPin className="h-5 w-5" />
              </span>
            )}
            <div className="space-y-1.5">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas">
                <Upload className="h-3.5 w-3.5" />
                {imageBusy ? 'Yuklanmoqda…' : 'Rasm tanlash'}
                <input type="file" accept="image/*" className="hidden" onChange={onFileChange} disabled={imageBusy} />
              </label>
              {imageUrl ? (
                <button type="button" onClick={() => setImageUrl('')} className="block text-xs font-semibold text-muted hover:text-red-500">
                  Rasmni olib tashlash
                </button>
              ) : null}
            </div>
          </div>
        </Field>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand,#e11d48)]" />
          Saytdagi xaritada ko‘rsatish
        </label>

        {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
        <Button type="submit" disabled={mutation.isPending || imageBusy} className="w-full">
          {mutation.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
        </Button>
      </form>
    </Modal>
  )
}
