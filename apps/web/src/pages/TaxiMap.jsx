import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, Heart, Loader2, MapPin, Navigation, PersonStanding, Search, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useApp } from '../context/AppContext'
import { useRecentTrips } from '../lib/queries'
import { DEFAULT_LOCATION, extractCity, formatAddress, reverseGeocode } from '../lib/geocode'
import { formatPlace, matchRegion } from '../data/uzbekistan'
import { BaseTiles } from '../components/map/BaseTiles'
import { RegionPicker } from '../components/ui/SearchPickers'

// Xarita surilib to‘xtaganda markazdagi nuqtani "olib ketish" manzili qilib olamiz.
function CenterWatcher({ onMoveStart, onMoveEnd }) {
  const map = useMapEvents({
    movestart: onMoveStart,
    moveend: () => onMoveEnd(map.getCenter()),
  })
  useEffect(() => {
    onMoveEnd(map.getCenter())
    // Faqat birinchi render uchun — boshlang‘ich markaz manzilini aniqlaymiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])
  return null
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target.center, Math.max(map.getZoom(), 17), { duration: 0.8 })
  }, [map, target])
  return null
}

// `women` — "Ayollar uchun Taxi": xuddi shu xarita, lekin pushti rangda va qidiruv ayol haydovchilarga cheklanadi.
const ACCENTS = {
  brand: { solid: 'bg-brand', dot: 'bg-brand ring-4 ring-brand/20' },
  women: { solid: 'bg-[#f5559a]', dot: 'bg-[#f5559a] ring-4 ring-[#f5559a]/20' },
}

export default function TaxiMap({ women = false }) {
  const accent = women ? ACCENTS.women : ACCENTS.brand
  const { gpsFix, location, requestUserLocation, search, setSearch } = useApp()
  const navigate = useNavigate()
  const { data: recentTrips = [] } = useRecentTrips(10)

  const hasGps = gpsFix && !gpsFix.error && Number.isFinite(gpsFix.lat)
  const hasLocation =
    Boolean(location?.label) && !(location.lat === DEFAULT_LOCATION.lat && location.lng === DEFAULT_LOCATION.lng)
  // Faqat birinchi renderdagi markaz — keyin xaritani foydalanuvchi o‘zi suradi.
  const [initialCenter] = useState(() =>
    hasGps ? [gpsFix.lat, gpsFix.lng] : [location.lat ?? DEFAULT_LOCATION.lat, location.lng ?? DEFAULT_LOCATION.lng],
  )

  const [moving, setMoving] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [flyTarget, setFlyTarget] = useState(null)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState('')
  const [picker, setPicker] = useState(null)
  const requestId = useRef(0)

  const update = (patch) => setSearch((s) => ({ ...s, ...patch }))

  // Qaysi xizmatdan kirilganini qidiruvga yozamiz — natijalar shunga qarab filtrlanadi.
  useEffect(() => {
    setSearch((s) => ({ ...s, service: women ? 'women' : 'all' }))
  }, [women, setSearch])

  // GPS hali olinmagan bo‘lsa — sahifa ochilganda bir marta so‘raymiz.
  useEffect(() => {
    if (!hasGps && !hasLocation) requestUserLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // GPS keyinroq kelsa — xaritani yo‘lovchi turgan joyga olib boramiz.
  const gpsKey = hasGps ? `${gpsFix.lat},${gpsFix.lng}` : ''
  const flewToGps = useRef(false)
  useEffect(() => {
    if (!gpsKey || flewToGps.current) return
    flewToGps.current = true
    setFlyTarget({ center: [gpsFix.lat, gpsFix.lng], at: Date.now() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsKey])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  const resolvePickup = async ({ lat, lng }) => {
    setMoving(false)
    const id = ++requestId.current
    setResolving(true)
    try {
      const data = await reverseGeocode(lat, lng)
      if (id !== requestId.current) return
      const label = formatAddress(data)
      const region = matchRegion(data?.address?.state, extractCity(data), label)
      if (!region) {
        setNotice('Bu joy hududini aniqlab bo‘lmadi.')
        return
      }
      update({ fromRegion: region, fromPlace: label, from: formatPlace(region, label) })
    } catch {
      if (id === requestId.current) setNotice('Manzilni aniqlab bo‘lmadi.')
    } finally {
      if (id === requestId.current) setResolving(false)
    }
  }

  const showMyLocation = async () => {
    if (locating) return
    setLocating(true)
    const result = await requestUserLocation()
    setLocating(false)
    if (!result.ok) {
      setNotice(
        result.status === 'denied'
          ? 'Joylashuvga ruxsat berilmagan. Brauzer sozlamalaridan ruxsat bering.'
          : 'Joylashuvni aniqlab bo‘lmadi. GPS yoqilganini tekshiring.',
      )
    }
  }

  // requestUserLocation gpsFix'ni yangilaydi — "joriy joylashuv" bosilganda shunga uchamiz.
  const lastFixAt = useRef(gpsFix?.at)
  useEffect(() => {
    if (!hasGps || gpsFix.at === lastFixAt.current) return
    lastFixAt.current = gpsFix.at
    if (flewToGps.current) setFlyTarget({ center: [gpsFix.lat, gpsFix.lng], at: gpsFix.at })
  }, [hasGps, gpsFix])

  const destinations = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const trip of recentTrips) {
      if (!trip.to || seen.has(trip.to)) continue
      seen.add(trip.to)
      list.push(trip)
      if (list.length === 3) break
    }
    return list
  }, [recentTrips])

  const pickRecent = (trip) => {
    const region = matchRegion(trip.to)
    if (!region) {
      setPicker('to')
      return
    }
    update({ toRegion: region, toPlace: trip.to, to: trip.to })
    navigate('/ride')
  }

  const headerText = moving || resolving ? 'Aniqlanmoqda…' : search.fromPlace || 'Manzilni tanlang'

  return (
    <div className="relative isolate h-svh overflow-hidden bg-canvas lg:h-[calc(100svh-7rem)] lg:rounded-2xl">
      <div className="absolute inset-0">
        <MapContainer
          center={initialCenter}
          zoom={17}
          zoomControl={false}
          attributionControl={false}
          className="home-map h-full w-full"
        >
          <BaseTiles />
          <CenterWatcher onMoveStart={() => setMoving(true)} onMoveEnd={resolvePickup} />
          <FlyTo target={flyTarget} />
        </MapContainer>
      </div>

      {/* Markazdagi "olib ketish" belgisi — xarita uning ostida suriladi. */}
      <div className="pointer-events-none absolute left-1/2 top-[calc(50%-110px)] z-[500] flex -translate-x-1/2 flex-col items-center">
        <div
          className={`flex items-center gap-2 rounded-2xl bg-white py-1.5 pl-1.5 pr-3.5 shadow-[0_8px_24px_rgba(16,42,67,0.18)] transition-transform ${
            moving ? '-translate-y-2' : ''
          }`}
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${accent.solid}`}>
            <PersonStanding className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <span className="leading-tight">
            <span className="block text-[12px] text-muted">Olib ketish</span>
            <span className="block text-[15px] font-bold text-ink">Shu yerdan</span>
          </span>
        </div>
        <span className={`h-6 w-0.5 bg-ink transition-transform ${moving ? '-translate-y-2' : ''}`} />
        <span className="h-2 w-2 rounded-full bg-ink/40" />
      </div>

      <header className="absolute inset-x-0 top-0 z-[600] flex justify-center px-16 pt-[max(14px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setPicker('from')}
          className="flex max-w-full items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 shadow-[0_6px_20px_rgba(16,42,67,0.12)] backdrop-blur"
        >
          <span className={`h-3 w-3 shrink-0 rounded-full ${accent.dot}`} />
          <span className="truncate text-[17px] font-extrabold text-ink">{headerText}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </button>
      </header>

      {notice ? (
        <div
          role="alert"
          className="absolute inset-x-4 top-[calc(max(14px,env(safe-area-inset-top))+56px)] z-[600] rounded-2xl bg-ink/90 px-4 py-3 text-center text-[13px] font-medium text-white shadow-lg"
        >
          {notice}
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-[600]">
        <div className="flex items-end justify-between px-4 pb-3">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_rgba(16,42,67,0.14)]"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={showMyLocation}
            disabled={locating}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_rgba(16,42,67,0.14)]"
            aria-label="Joriy joylashuv"
          >
            {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" strokeWidth={2.2} />}
          </button>
        </div>

        <section className="rounded-t-[28px] bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-10px_30px_rgba(16,42,67,0.08)]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

          {women ? (
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[#fde7f1] px-4 py-2.5 text-[13px] font-semibold text-[#c2185b]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Ayollar uchun Taxi · faqat ayol haydovchilar
            </div>
          ) : null}

          <div className="flex h-14 items-center gap-3 rounded-2xl bg-canvas pl-4 pr-2">
            <Search className="h-5 w-5 shrink-0 text-ink" strokeWidth={2.4} />
            <button type="button" onClick={() => setPicker('to')} className="min-w-0 flex-1 text-center">
              <span className="block truncate text-[16px] font-bold text-ink">Qayerga?</span>
            </button>
            <Link
              to="/favorites"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink shadow-sm"
              aria-label="Sevimlilar"
            >
              <Heart className="h-5 w-5" />
            </Link>
          </div>

          {destinations.length ? (
            <ul className="mt-1 divide-y divide-line">
              {destinations.map((trip) => (
                <li key={trip.id}>
                  <button type="button" onClick={() => pickRecent(trip)} className="flex w-full items-center gap-3 py-3 text-left">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-canvas text-muted">
                      <MapPin className="h-5 w-5 fill-slate-400 text-white" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-medium text-ink">{trip.to}</span>
                      {trip.from ? <span className="block truncate text-[13px] text-muted">{trip.from}</span> : null}
                    </span>
                    <span className="shrink-0 text-[13px] text-muted">{trip.date}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <RegionPicker
        variant="headless"
        kind="from"
        label="Qayerdan"
        forceSheet
        region={search.fromRegion}
        place={search.fromPlace}
        onChange={({ region, place, label, lat, lng }) => {
          update({ fromRegion: region, fromPlace: place, from: label })
          if (Number.isFinite(lat)) setFlyTarget({ center: [lat, lng], at: Date.now() })
        }}
        open={picker === 'from'}
        onToggle={() => setPicker((cur) => (cur === 'from' ? null : 'from'))}
        onClose={() => setPicker(null)}
      />
      <RegionPicker
        variant="headless"
        kind="to"
        label="Qayerga"
        forceSheet
        region={search.toRegion}
        place={search.toPlace}
        origin={search.fromRegion ? { region: search.fromRegion, place: search.fromPlace } : null}
        onEditOrigin={() => setPicker('from')}
        onChange={({ region, place, label }) => {
          update({ toRegion: region, toPlace: place, to: label })
          navigate('/ride')
        }}
        open={picker === 'to'}
        onToggle={() => setPicker((cur) => (cur === 'to' ? null : 'to'))}
        onClose={() => setPicker(null)}
      />
    </div>
  )
}
