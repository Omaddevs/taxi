import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { history as historyData, trips as tripsData, user as userData } from '../data/mock'
import { DEFAULT_LOCATION, polishLocationLabel } from '../lib/geocode'

const AppContext = createContext(null)
const LOCATION_KEY = 'taxiline-location'
const PLUS_KEY = 'taxiline-plus'

function loadPlusPlan() {
  try {
    const raw = localStorage.getItem(PLUS_KEY)
    if (raw && ['start', 'plus', 'premium'].includes(raw)) return raw
  } catch {
    /* ignore */
  }
  return null
}

function loadSavedLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (!raw) return DEFAULT_LOCATION
    const parsed = JSON.parse(raw)
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number' && parsed.label) {
      return { ...parsed, label: polishLocationLabel(parsed.label) }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCATION
}

export function AppProvider({ children }) {
  const [user] = useState(userData)
  const [search, setSearch] = useState({
    mode: 'passenger',
    from: 'Qashqadaryo, Qarshi shahri',
    fromRegion: 'Qashqadaryo',
    fromPlace: 'Qarshi shahri',
    to: 'Toshkent shahri, Yunusobod',
    toRegion: 'Toshkent shahri',
    toPlace: 'Yunusobod',
    date: '2026-05-22',
    time: '18:00',
    passengers: 1,
    luggage: "O'rta",
    service: 'all',
  })
  const [favorites, setFavorites] = useState(['t1'])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [booked, setBooked] = useState(null)
  const [history] = useState(historyData)
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [location, setLocation] = useState(loadSavedLocation)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [gpsFix, setGpsFix] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('idle')
  const [plusPlan, setPlusPlan] = useState(loadPlusPlan)

  useEffect(() => {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location))
  }, [location])

  useEffect(() => {
    if (plusPlan) localStorage.setItem(PLUS_KEY, plusPlan)
  }, [plusPlan])

  function requestUserLocation() {
    if (!navigator.geolocation) {
      setGpsStatus('unsupported')
      setGpsFix({ error: true, at: Date.now() })
      return
    }
    setGpsStatus('pending')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsStatus('granted')
        setGpsFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          at: Date.now(),
        })
      },
      (err) => {
        setGpsStatus(err.code === 1 ? 'denied' : 'error')
        setGpsFix({ error: true, code: err.code, at: Date.now() })
      },
      { enableHighAccuracy: true, timeout: 14000, maximumAge: 8000 },
    )
  }

  const value = useMemo(
    () => ({
      user,
      search,
      setSearch,
      favorites,
      toggleFavorite: (id) =>
        setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
      paymentMethod,
      setPaymentMethod,
      drawerOpen,
      setDrawerOpen,
      booked,
      bookTrip: (trip) => setBooked(trip),
      history,
      trips: tripsData,
      promoInput,
      setPromoInput,
      appliedPromo,
      setAppliedPromo,
      location,
      setLocation,
      locationPickerOpen,
      gpsFix,
      gpsStatus,
      requestUserLocation,
      openLocationPicker: () => {
        setGpsFix(null)
        setGpsStatus('pending')
        setLocationPickerOpen(true)
        requestUserLocation()
      },
      closeLocationPicker: () => setLocationPickerOpen(false),
      plusPlan,
      setPlusPlan,
    }),
    [user, search, favorites, paymentMethod, drawerOpen, booked, history, promoInput, appliedPromo, location, locationPickerOpen, gpsFix, gpsStatus, plusPlan],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
