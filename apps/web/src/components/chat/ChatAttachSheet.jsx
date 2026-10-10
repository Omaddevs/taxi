import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, useMap, useMapEvents } from 'react-leaflet'
import { Check, LoaderCircle, LocateFixed, MapPin, Navigation, X } from 'lucide-react'
import { BaseTiles } from '../map/BaseTiles'
import { reverseGeocode } from '../../lib/geocode'
import { useApp } from '../../context/AppContext'
import 'leaflet/dist/leaflet.css'
import { t } from '../../i18n'

function MapSync({ center }) {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 80)
    return () => clearTimeout(timer)
  }, [map])
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], Math.max(map.getZoom(), 16))
  }, [center?.lat, center?.lng, map])
  return null
}

function MapClick({ onIdle }) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter()
      onIdle(c.lat, c.lng)
    },
  })
  return null
}

export function ChatAttachSheet({ onClose, onSendLocation }) {
  const { gpsFix, watchUserLocation } = useApp()
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const start = gpsFix?.lat ? { lat: gpsFix.lat, lng: gpsFix.lng } : { lat: 41.3111, lng: 69.2797 }
  const [draft, setDraft] = useState(start)
  const [label, setLabel] = useState('')
  const geoTimer = useRef(0)

  useEffect(() => {
    watchUserLocation?.()
  }, [watchUserLocation])

  async function resolveLabel(lat, lng) {
    try {
      const place = await reverseGeocode(lat, lng)
      return place?.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }
  }

  async function sendMine() {
    setError('')
    const pos = gpsFix?.lat
      ? { lat: gpsFix.lat, lng: gpsFix.lng }
      : await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error(t('GPS mavjud emas')))
            return
          }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => reject(new Error(t('Joylashuv ruxsati berilmadi'))),
            { enableHighAccuracy: true, timeout: 8000 },
          )
        }).catch((err) => {
          setError(err.message)
          return null
        })
    if (!pos) return
    setBusy(true)
    const name = await resolveLabel(pos.lat, pos.lng)
    setBusy(false)
    onSendLocation({ lat: pos.lat, lng: pos.lng, locationLabel: name })
    onClose()
  }

  async function confirmPick() {
    setBusy(true)
    const name = label || (await resolveLabel(draft.lat, draft.lng))
    setBusy(false)
    onSendLocation({ lat: draft.lat, lng: draft.lng, locationLabel: name })
    onClose()
  }

  async function onIdle(lat, lng) {
    setDraft({ lat, lng })
    clearTimeout(geoTimer.current)
    geoTimer.current = setTimeout(async () => {
      const name = await resolveLabel(lat, lng)
      setLabel(name)
    }, 400)
  }

  if (picking) {
    return createPortal(
      <div className="fixed inset-0 z-[12000] flex flex-col bg-white">
        <header className="flex items-center gap-2 px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            aria-label={t('Orqaga')}
          >
            <X className="h-5 w-5" />
          </button>
          <p className="min-w-0 flex-1 truncate font-extrabold">{t('Xaritadan tanlang')}</p>
        </header>
        <div className="relative min-h-0 flex-1">
          <MapContainer
            center={[draft.lat, draft.lng]}
            zoom={16}
            className="h-full w-full"
            zoomControl={false}
          >
            <BaseTiles />
            <MapSync center={draft} />
            <MapClick onIdle={onIdle} />
          </MapContainer>
          <span className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full text-brand">
            <MapPin className="h-10 w-10 fill-brand drop-shadow" />
          </span>
          <p className="absolute inset-x-4 bottom-24 rounded-2xl bg-white/95 px-3 py-2 text-center text-xs font-semibold shadow">
            {label || t('Xaritani siljiting')}
          </p>
        </div>
        <div className="flex gap-2 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => gpsFix?.lat && setDraft({ lat: gpsFix.lat, lng: gpsFix.lng })}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line"
            aria-label="GPS"
          >
            <LocateFixed className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={confirmPick}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-sm font-extrabold text-white"
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t('Yuborish')}
          </button>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[11000]">
      <button type="button" className="absolute inset-0 bg-ink/45" aria-label={t('Yopish')} onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <p className="mb-3 text-base font-extrabold">{t('Lokatsiya yuborish')}</p>
        {error ? <p className="mb-2 text-sm font-semibold text-red-500">{t(error)}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={sendMine}
          className="flex w-full items-center gap-3 rounded-2xl bg-canvas px-3 py-3 text-left"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
          </span>
          <span>
            <span className="block text-sm font-extrabold">{t('Mening joylashuvim')}</span>
            <span className="block text-xs text-muted">{t('GPS orqali yuborish')}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-canvas px-3 py-3 text-left"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <MapPin className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-extrabold">{t('Xaritadan tanlash')}</span>
            <span className="block text-xs text-muted">{t('Belgilab yuborish')}</span>
          </span>
        </button>
      </div>
    </div>,
    document.body,
  )
}
