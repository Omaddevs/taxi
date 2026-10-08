import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, Heart, Loader2, MapPin, Navigation, PersonStanding, Search, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Circle, MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useApp } from '../context/AppContext'
import { useRecentTrips } from '../lib/queries'
import { DEFAULT_LOCATION, extractCity, formatAddress, reverseGeocode } from '../lib/geocode'
import { formatPlace, matchRegion } from '../data/uzbekistan'
import { BaseTiles } from '../components/map/BaseTiles'
import { GeoAskSheet, useMapGeo } from '../components/location/GeoAskSheet'
import { haversineKm } from '../lib/geo'
import { meLocationIcon } from '../lib/meMarker'
import { RegionPicker } from '../components/ui/SearchPickers'

// Xarita surilib to‘xtaganda markazdagi nuqtani "olib ketish" manzili qilib olamiz.
function CenterWatcher({ onMoveStart, onMoveEnd, onDragStart }) {
  const map = useMapEvents({
    movestart: onMoveStart,
    dragstart: onDragStart,
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
  brand: { solid: 'bg-brand', dot: 'bg-brand ring-4 ring-brand/20', hex: '#00c7d4' },
  women: { solid: 'bg-[#f5559a]', dot: 'bg-[#f5559a] ring-4 ring-[#f5559a]/20', hex: '#f5559a' },
}

// Pin counts as "on me" within this many metres of the GPS fix.
const ON_ME_M = 30

export default function TaxiMap({ women = false }) {
  const accent = women ? ACCENTS.women : ACCENTS.brand
  const { gpsFix, gpsStatus, location, requestUserLocation, search, setSearch } = useApp()
  const navigate = useNavigate()
  const { data: recentTrips = [] } = useRecentTrips(10)

  const hasGps = gpsFix && !gpsFix.error && Number.isFinite(gpsFix.lat)
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
  const [center, setCenter] = useState(null)
  const requestId = useRef(0)
  // Asks for location every time the taxi map opens (with our own explainer first), then keeps
  // watching so a coarse first fix sharpens as GPS locks on.
  const geo = useMapGeo()
  // Once the passenger drags the map themselves, GPS updates stop moving it.
  const userDragged = useRef(false)
  const lastFly = useRef(null)

  const update = (patch) => setSearch((s) => ({ ...s, ...patch }))

  // Qaysi xizmatdan kirilganini qidiruvga yozamiz — natijalar shunga qarab filtrlanadi.
  useEffect(() => {
    setSearch((s) => ({ ...s, service: women ? 'women' : 'all' }))
  }, [women, setSearch])

  // Follow the GPS until the passenger takes over: fly on the first fix, then again whenever a
  // clearly sharper or moved fix arrives (first fixes are often cell-tower guesses, ±500 m+).
  useEffect(() => {
    if (!hasGps || userDragged.current) return
    const prev = lastFly.current
    if (prev) {
      const movedM = haversineKm(prev, gpsFix) * 1000
      const sharper = gpsFix.accuracy && prev.accuracy && gpsFix.accuracy < prev.accuracy * 0.7
      if (!sharper && movedM < 40) return
    }
    lastFly.current = { lat: gpsFix.lat, lng: gpsFix.lng, accuracy: gpsFix.accuracy }
    setFlyTarget({ center: [gpsFix.lat, gpsFix.lng], at: Date.now() })
  }, [hasGps, gpsFix])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  const resolvePickup = async ({ lat, lng }) => {
    setMoving(false)
    setCenter({ lat, lng })
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
    userDragged.current = false
    // No permission yet (or it failed) — show the explainer, whose button triggers the browser prompt.
    if (!hasGps && gpsStatus !== 'pending') {
      geo.reopen()
      return
    }
    if (hasGps) setFlyTarget({ center: [gpsFix.lat, gpsFix.lng], at: Date.now() })
    lastFly.current = null
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

  const offMeM = hasGps && center ? haversineKm(center, gpsFix) * 1000 : Number.POSITIVE_INFINITY
  const onMe = offMeM <= ON_ME_M
  const meMarkerIcon = useMemo(() => meLocationIcon({ color: accent.hex }), [accent.hex])
  // Only nag while the pin still sits on the fuzzy fix — once moved, the passenger has chosen.
  const roughFix = hasGps && gpsFix.accuracy > 100 && onMe

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
          <CenterWatcher
            onMoveStart={() => setMoving(true)}
            onMoveEnd={resolvePickup}
            onDragStart={() => {
              userDragged.current = true
            }}
          />
          <FlyTo target={flyTarget} />
          {hasGps ? (
            <>
              {gpsFix.accuracy > 15 ? (
                <Circle
                  center={[gpsFix.lat, gpsFix.lng]}
                  radius={Math.min(gpsFix.accuracy, 1500)}
                  interactive={false}
                  pathOptions={{ color: accent.hex, weight: 1, opacity: 0.35, fillColor: accent.hex, fillOpacity: 0.1 }}
                />
              ) : null}
              {/* While the pickup pin stands on the passenger it already says so — no second card. */}
              {onMe ? null : <Marker position={[gpsFix.lat, gpsFix.lng]} icon={meMarkerIcon} interactive={false} />}
            </>
          ) : null}
        </MapContainer>
      </div>

      {/* Markazdagi "olib ketish" belgisi — xarita uning ostida suriladi. Pastki nuqta aynan xarita
          markazida turadi: manzil ham, buyurtma ham shu nuqtadan olinadi. */}
      <div className="pointer-events-none absolute bottom-1/2 left-1/2 z-[500] flex -translate-x-1/2 translate-y-[5px] flex-col items-center">
        <div
          className={`flex items-center gap-2.5 rounded-[18px] bg-white py-1.5 pl-1.5 pr-4 shadow-[0_10px_28px_rgba(16,42,67,0.22)] transition-transform duration-200 ${
            moving ? '-translate-y-3' : ''
          }`}
        >
          <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] text-white ${accent.solid}`}>
            <PersonStanding className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <span className="leading-tight">
            <span className="block text-[13px] font-semibold text-muted">Olib ketish</span>
            <span className="block whitespace-nowrap text-[16px] font-extrabold text-ink">
              {moving || resolving ? 'Aniqlanmoqda…' : onMe ? 'Turgan joyingiz' : 'Shu yerdan'}
            </span>
          </span>
        </div>
        <span className={`h-7 w-[3px] rounded-full bg-ink transition-transform duration-200 ${moving ? '-translate-y-3' : ''}`} />
        <span
          className={`h-2.5 w-2.5 rounded-full border-2 border-white bg-ink shadow-[0_1px_4px_rgba(0,0,0,0.35)] transition-all duration-200 ${
            moving ? 'scale-75 opacity-60' : ''
          }`}
        />
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

      {!notice && (gpsStatus === 'pending' || roughFix) ? (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(max(14px,env(safe-area-inset-top))+56px)] z-[600] flex justify-center px-4">
          <p className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-center text-[12px] font-semibold text-ink shadow-md">
            {gpsStatus === 'pending' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" /> Joylashuv aniqlanmoqda…
              </>
            ) : (
              <>Joylashuv taxminiy (±{Math.round(gpsFix.accuracy)} m). Pinni aniq joyga suring</>
            )}
          </p>
        </div>
      ) : null}

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
            {locating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Navigation className={`h-5 w-5 ${hasGps && onMe ? 'fill-brand text-brand' : ''}`} strokeWidth={2.2} />
            )}
          </button>
        </div>

        <section className="rounded-t-[28px] bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-10px_30px_rgba(16,42,67,0.08)]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

          {women ? (
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[#fde7f1] px-4 py-2.5 text-[13px] font-semibold text-[#c2185b]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Ayollar uchun Taxi · avval ayol haydovchilarga
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

      <GeoAskSheet
        open={geo.open}
        status={geo.status}
        onAllow={geo.allow}
        onSkip={geo.skip}
        text="Haydovchi sizni aynan turgan joyingizdan olib ketishi uchun joylashuvingiz kerak. U faqat buyurtma uchun ishlatiladi."
      />
    </div>
  )
}
