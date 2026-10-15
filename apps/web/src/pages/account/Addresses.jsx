import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Briefcase, House, MapPin, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { AccountScreen, PrimaryButton, Sheet } from '../../components/account/AccountKit'
import { useApp } from '../../context/AppContext'
import { api } from '../../lib/api'
import { t } from '../../i18n'

// Menu → Manzillar: home, work and any number of named places, stored on the server
// (/saved-places). An address is picked on the app's location picker map; a named place then
// asks for its name.

const KIND_ICON = { HOME: House, WORK: Briefcase, OTHER: Bookmark }
const KIND_TITLE = { HOME: 'Uy', WORK: 'Ish' }

function AddRow({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-4 text-left transition active:bg-black/[0.03]">
      <Icon className="h-6 w-6 shrink-0 text-muted/60" fill="currentColor" strokeWidth={1.5} />
      <span className="flex min-w-0 flex-1 items-center border-b border-line/80 py-[18px]">
        <span className="flex-1 text-[17px] text-ink">{t(label)}</span>
        <Plus className="h-6 w-6 text-muted/60" strokeWidth={1.8} />
      </span>
    </button>
  )
}

function PlaceRow({ place, onMenu }) {
  const Icon = KIND_ICON[place.kind]
  const title = place.kind === 'OTHER' ? place.title || place.address : t(KIND_TITLE[place.kind])
  return (
    <div className="flex items-center gap-4">
      <Icon className="h-6 w-6 shrink-0 text-muted/60" fill="currentColor" strokeWidth={1.5} />
      <div className="flex min-w-0 flex-1 items-center border-b border-line/80 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] text-ink">{title}</p>
          {title !== place.address ? <p className="truncate text-[14px] text-muted">{place.address}</p> : null}
        </div>
        <button type="button" onClick={onMenu} aria-label={t('Amallar')} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted transition active:bg-canvas">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export default function Addresses() {
  const queryClient = useQueryClient()
  const { openLocationPicker } = useApp()
  const [naming, setNaming] = useState(null) // { id?, title, address, lat, lng } — the name sheet
  const [menuFor, setMenuFor] = useState(null) // place whose ⋮ menu is open
  const [error, setError] = useState('')

  const { data: places = [], isLoading } = useQuery({ queryKey: ['saved-places'], queryFn: () => api.get('/saved-places') })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['saved-places'] })
  const onError = (err) => setError(err?.message || t('Saqlab bo‘lmadi'))

  const create = useMutation({ mutationFn: (body) => api.post('/saved-places', body), onSuccess: refresh, onError })
  const update = useMutation({ mutationFn: ({ id, ...body }) => api.patch(`/saved-places/${id}`, body), onSuccess: refresh, onError })
  const remove = useMutation({ mutationFn: (id) => api.delete(`/saved-places/${id}`), onSuccess: refresh, onError })

  const home = places.find((p) => p.kind === 'HOME')
  const work = places.find((p) => p.kind === 'WORK')
  const others = places.filter((p) => p.kind === 'OTHER')

  function pick(title, initial, onPick) {
    setError('')
    openLocationPicker({
      title: t(title),
      initial: initial?.lat != null ? { lat: initial.lat, lng: initial.lng, label: initial.address } : undefined,
      onPick: (loc) => onPick({ address: loc.label, lat: loc.lat ?? null, lng: loc.lng ?? null }),
    })
  }

  const addKind = (kind) => pick(kind === 'HOME' ? 'Uy manzili' : 'Ish manzili', null, (loc) => create.mutate({ kind, ...loc }))
  const addOther = () => pick('Yangi manzil', null, (loc) => setNaming({ ...loc, title: '' }))

  function saveName(e) {
    e.preventDefault()
    const title = naming.title.trim() || null
    if (naming.id) update.mutate({ id: naming.id, title })
    else create.mutate({ kind: 'OTHER', title, address: naming.address, lat: naming.lat, lng: naming.lng })
    setNaming(null)
  }

  return (
    <AccountScreen title="Mening manzillarim" large>
      <div className="-mt-1">
        <AddRow icon={Bookmark} label="Manzil qo‘shish" onClick={addOther} />
        {home ? <PlaceRow place={home} onMenu={() => setMenuFor(home)} /> : <AddRow icon={House} label="Uy manzilini qo‘shish" onClick={() => addKind('HOME')} />}
        {work ? <PlaceRow place={work} onMenu={() => setMenuFor(work)} /> : <AddRow icon={Briefcase} label="Ish manzilini qo‘shish" onClick={() => addKind('WORK')} />}
        {others.map((p) => (
          <PlaceRow key={p.id} place={p} onMenu={() => setMenuFor(p)} />
        ))}
      </div>

      {isLoading ? <p className="py-6 text-center text-[14px] text-muted">{t('Yuklanmoqda…')}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-600">{error}</p> : null}
      {!isLoading && !places.length ? (
        <div className="mt-6 flex items-start gap-3 rounded-[22px] bg-canvas px-4 py-4">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-dark" />
          <p className="text-[14px] leading-5 text-muted">{t('Tez-tez boradigan joylaringizni saqlang — buyurtma berishda bir bosishda tanlanadi.')}</p>
        </div>
      ) : null}

      <Sheet open={Boolean(naming)} title={naming?.id ? 'Nomini o‘zgartirish' : 'Manzil nomi'} onClose={() => setNaming(null)}>
        {naming ? (
          <form onSubmit={saveName}>
            <p className="mb-3 truncate px-1 text-[14px] text-muted">{naming.address}</p>
            <input
              autoFocus
              value={naming.title}
              maxLength={60}
              onChange={(e) => setNaming((n) => ({ ...n, title: e.target.value }))}
              placeholder={t('Masalan: Onamning uyi, Sport zal')}
              className="mb-4 h-14 w-full rounded-[18px] bg-canvas px-4 text-[16px] text-ink outline-none ring-brand/40 placeholder:text-muted focus:ring-2"
            />
            <PrimaryButton type="submit">{t('Saqlash')}</PrimaryButton>
          </form>
        ) : null}
      </Sheet>

      <Sheet open={Boolean(menuFor)} title={menuFor ? (menuFor.kind === 'OTHER' ? menuFor.title || t('Manzil') : t(KIND_TITLE[menuFor.kind])) : ''} onClose={() => setMenuFor(null)}>
        {menuFor ? (
          <div className="overflow-hidden rounded-[22px] bg-canvas">
            {menuFor.kind === 'OTHER' ? (
              <SheetAction
                icon={Pencil}
                label="Nomini o‘zgartirish"
                onClick={() => {
                  setNaming({ id: menuFor.id, title: menuFor.title || '', address: menuFor.address })
                  setMenuFor(null)
                }}
              />
            ) : null}
            <SheetAction
              icon={MapPin}
              label="Manzilni o‘zgartirish"
              onClick={() => {
                const place = menuFor
                setMenuFor(null)
                pick('Manzilni o‘zgartirish', place, (loc) => update.mutate({ id: place.id, ...loc }))
              }}
            />
            <SheetAction
              icon={Trash2}
              label="O‘chirish"
              danger
              onClick={() => {
                remove.mutate(menuFor.id)
                setMenuFor(null)
              }}
            />
          </div>
        ) : null}
      </Sheet>
    </AccountScreen>
  )
}

function SheetAction({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-4 pl-4 text-left transition active:bg-black/[0.04]">
      <Icon className={`h-5 w-5 shrink-0 ${danger ? 'text-red-500' : 'text-ink'}`} />
      <span className={`flex-1 border-b border-line/80 py-4 text-[16px] group-last:border-b-0 ${danger ? 'text-red-500' : 'text-ink'}`}>{t(label)}</span>
    </button>
  )
}
