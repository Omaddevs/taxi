import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { history as historyData, trips as tripsData, user as userData } from '../data/mock'
import { DEFAULT_LOCATION, polishLocationLabel } from '../lib/geocode'

const AppContext = createContext(null)
const LOCATION_KEY = 'taxiline-location'
const PLUS_KEY = 'taxiline-plus'
const LANG_KEY = 'taxiline-lang'

function loadLanguage() {
  try {
    const raw = localStorage.getItem(LANG_KEY)
    if (raw && ['uz', 'ru', 'en'].includes(raw)) return raw
  } catch {
    /* ignore */
  }
  return 'uz'
}

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
  const [language, setLanguage] = useState(loadLanguage)
  const watchIdRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language)
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location))
  }, [location])

  useEffect(() => {
    if (plusPlan) localStorage.setItem(PLUS_KEY, plusPlan)
  }, [plusPlan])

  const applyPosition = useCallback((pos) => {
    setGpsStatus('granted')
    setGpsFix({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      at: Date.now(),
    })
  }, [])

  const queryGeoPermission = useCallback(async () => {
    if (!navigator.geolocation) return 'unsupported'
    try {
      if (!navigator.permissions?.query) return 'unknown'
      const result = await navigator.permissions.query({ name: 'geolocation' })
      return result.state
    } catch {
      return 'unknown'
    }
  }, [])

  const requestUserLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsStatus('unsupported')
        setGpsFix({ error: true, at: Date.now() })
        resolve({ ok: false, status: 'unsupported' })
        return
      }
      setGpsStatus('pending')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyPosition(pos)
          resolve({ ok: true, status: 'granted' })
        },
        (err) => {
          const status = err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'error'
          setGpsStatus(status)
          setGpsFix({ error: true, code: err.code, at: Date.now() })
          resolve({ ok: false, status })
        },
        { enableHighAccuracy: true, timeout: 16000, maximumAge: 4000 },
      )
    })
  }, [applyPosition])

  const watchUserLocation = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current != null) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      applyPosition,
      () => {},
      { enableHighAccuracy: true, maximumAge: 12000, timeout: 20000 },
    )
  }, [applyPosition])

  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current == null) return
    navigator.geolocation.clearWatch(watchIdRef.current)
    watchIdRef.current = null
  }, [])

  useEffect(() => {
    return () => stopWatchingLocation()
  }, [stopWatchingLocation])

  useEffect(() => {
    let perm
    if (!navigator.permissions?.query) return undefined
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        perm = result
        perm.onchange = () => {
          if (result.state === 'granted') requestUserLocation()
        }
      })
      .catch(() => {})
    return () => {
      if (perm) perm.onchange = null
    }
  }, [requestUserLocation])

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
      queryGeoPermission,
      watchUserLocation,
      stopWatchingLocation,
      openLocationPicker: () => {
        setLocationPickerOpen(true)
        if (gpsStatus === 'granted') return
        requestUserLocation()
      },
      closeLocationPicker: () => setLocationPickerOpen(false),
      plusPlan,
      setPlusPlan,
      language,
      setLanguage,
    }),
    [user, search, favorites, paymentMethod, drawerOpen, booked, history, promoInput, appliedPromo, location, locationPickerOpen, gpsFix, gpsStatus, plusPlan, language, requestUserLocation, queryGeoPermission, watchUserLocation, stopWatchingLocation],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
