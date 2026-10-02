import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Coins, Home, Loader2, LocateFixed, Map as MapIcon, Menu, Navigation, Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useApp } from '../../context/AppContext'
import { api } from '../../lib/api'
import { BaseTiles } from '../map/BaseTiles'

const userPulseIcon = L.divIcon({
  className: 'user-pulse',
  iconSize: [120, 120],
  iconAnchor: [60, 60],
  html: '<span class="user-pulse-ring"></span><span class="user-pulse-halo"></span><span class="user-pulse-dot"></span>',
})

function formatAmount(value) {
  return new Intl.NumberFormat('uz-UZ').format(value || 0).replace(/[, ]/g, ' ')
}

// Markaz o‘zgarsa (GPS aniqlandi yoki manzil tanlandi) xaritani silliq suramiz.
// `recenter` — "joriy joylashuv" bosilganda koordinata o‘zgarmagan bo‘lsa ham qaytib kelish uchun.
function FollowCenter({ center, recenter }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), recenter ? 17 : 16), { duration: 0.8 })
  }, [map, center, recenter])
  return null
}

function HomeMap({ center, recenter }) {
  return (
    <MapContainer
      center={center}
      zoom={16}
      zoomControl={false}
      attributionControl={false}
      className="home-map h-full w-full"
    >
      <BaseTiles />
      <Marker position={center} icon={userPulseIcon} interactive={false} />
      <FollowCenter center={center} recenter={recenter} />
    </MapContainer>
  )
}

export function MobileHome() {
  const { user, setDrawerOpen, location, gpsFix, openLocationPicker, requestUserLocation } = useApp()
  const navigate = useNavigate()
  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: () => api.get('/wallet') })

  const hasGps = gpsFix && !gpsFix.error && Number.isFinite(gpsFix.lat)
  const lat = hasGps ? gpsFix.lat : location.lat
  const lng = hasGps ? gpsFix.lng : location.lng
  const center = useMemo(() => [lat, lng], [lat, lng])
  const [recenter, setRecenter] = useState(0)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')

  useEffect(() => {
    if (!locError) return
    const t = setTimeout(() => setLocError(''), 4000)
    return () => clearTimeout(t)
  }, [locError])

  const showMyLocation = async () => {
    if (locating) return
    setLocError('')
    setLocating(true)
    const result = await requestUserLocation()
    setLocating(false)
    if (result.ok) {
      setRecenter((n) => n + 1)
      return
    }
    setLocError(
      result.status === 'denied'
        ? 'Joylashuvga ruxsat berilmagan. Brauzer sozlamalaridan ruxsat bering.'
        : result.status === 'unsupported'
          ? 'Qurilmangiz joylashuvni aniqlay olmaydi.'
          : 'Joylashuvni aniqlab bo‘lmadi. GPS yoqilganini tekshiring.',
    )
  }

  const balance = wallet?.balance ?? user?.balance ?? 0

  return (
    <div className="relative flex min-h-svh flex-col bg-white">
      <section className="relative min-h-[300px] flex-1">
        <div className="absolute inset-0">
          <HomeMap center={center} recenter={recenter} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand shadow-[0_6px_20px_rgba(16,42,67,0.14)]"
            aria-label="Menyu"
          >
            <Menu className="h-6 w-6" strokeWidth={2.4} />
          </button>

          <Link
            to="/wallet"
            className="pointer-events-auto absolute left-1/2 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-brand pl-1.5 pr-4 text-white shadow-[0_8px_22px_rgba(18,165,148,0.35)]"
            aria-label="Hamyon"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Wallet className="h-4 w-4" />
            </span>
            <span className="text-[17px] font-extrabold tracking-tight">{formatAmount(balance)}</span>
            <Coins className="h-4 w-4 opacity-90" />
          </Link>

          <span className="h-12 w-12" />
        </div>

        {locError ? (
          <div
            role="alert"
            className="absolute inset-x-4 top-[calc(max(14px,env(safe-area-inset-top))+60px)] z-20 rounded-2xl bg-ink/90 px-4 py-3 text-center text-[13px] font-medium text-white shadow-lg"
          >
            {locError}
          </div>
        ) : null}

        <div className="absolute bottom-10 right-4 z-10 flex flex-col gap-3">
          <button
            type="button"
            onClick={showMyLocation}
            disabled={locating}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand shadow-[0_6px_20px_rgba(16,42,67,0.14)]"
            aria-label="Joriy joylashuv"
          >
            {locating ? (
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.4} />
            ) : (
              <LocateFixed className="h-5 w-5" strokeWidth={2.4} />
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand shadow-[0_6px_20px_rgba(16,42,67,0.14)]"
            aria-label="Xarita"
          >
            <Navigation className="h-5 w-5 fill-brand" strokeWidth={2} />
          </button>
        </div>
      </section>

      <section className="relative z-20 -mt-6 rounded-t-[28px] bg-white px-4 pb-28 pt-2.5 shadow-[0_-10px_30px_rgba(16,42,67,0.08)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

        <div className="relative space-y-2">
          <span className="pointer-events-none absolute bottom-[34px] left-[21px] top-[34px] w-0.5 rounded-full bg-slate-300" />

          <div className="flex items-center gap-3 rounded-2xl bg-[#f5f7f9] py-3 pl-4 pr-3">
            <span className="relative z-10 h-3.5 w-3.5 shrink-0 rounded-full bg-brand ring-4 ring-brand/15" />
            <button type="button" onClick={() => navigate('/ride')} className="min-w-0 flex-1 text-left">
              <span className="block text-[15px] font-bold text-ink">Qayerga boramiz?</span>
              <span className="block truncate text-[13px] text-muted">Manzilni kiriting</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/ride')}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-semibold text-brand shadow-sm"
            >
              <MapIcon className="h-4 w-4" /> Xarita
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-[#f5f7f9] py-3 pl-4 pr-3">
            <span className="relative z-10 h-3.5 w-3.5 shrink-0 rounded-full bg-slate-400 ring-4 ring-slate-300/40" />
            <button type="button" onClick={openLocationPicker} className="min-w-0 flex-1 text-left">
              <span className="block text-[15px] font-bold text-ink">Qayerdan olamiz?</span>
              <span className="block truncate text-[13px] text-muted">{location.label || 'Joriy manzil'}</span>
            </button>
            <button
              type="button"
              onClick={openLocationPicker}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-semibold text-brand shadow-sm"
            >
              <Home className="h-4 w-4 fill-brand" /> Uy
            </button>
          </div>
        </div>

      </section>
    </div>
  )
}
