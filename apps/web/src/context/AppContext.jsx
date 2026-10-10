import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DEFAULT_LOCATION, polishLocationLabel } from '../lib/geocode'
import { api } from '../lib/api'
import { avatarOrFallback } from '../lib/adapters'
import { useAuth } from './AuthContext'
import { getLanguage, isSupportedLanguage, setI18nLanguage } from '../i18n'

const AppContext = createContext(null)
const LOCATION_KEY = 'taxiline-location'
const PLUS_KEY = 'taxiline-plus'
const LANG_KEY = 'taxiline-lang'
const THEME_KEY = 'taxiline-theme'
const NOTIFS_KEY = 'taxiline-notifs'
const AUTO_ACCEPT_KEY = 'taxiline-auto-accept'
const REGIONS_KEY = 'taxiline-work-regions'

function loadLanguage() {
  return getLanguage()
}

function loadBool(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch {
    /* ignore */
  }
  return fallback
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function loadWorkRegions() {
  try {
    const raw = JSON.parse(localStorage.getItem(REGIONS_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
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

const pad2 = (n) => String(n).padStart(2, '0')

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function nowHHMM() {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
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
  const { status: authStatus } = useAuth()
  const authed = authStatus === 'authed'
  const queryClient = useQueryClient()

  const { data: rawUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me'),
    enabled: authed,
    staleTime: 30_000,
  })

  const { data: favoriteOffers = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/favorites'),
    enabled: authed,
    staleTime: 15_000,
  })

  const [pendingFavorites, setPendingFavorites] = useState({})

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, liked }) => (liked ? api.delete(`/favorites/${id}`) : api.post(`/favorites/${id}`)),
    onMutate: ({ id, liked }) => {
      setPendingFavorites((prev) => ({ ...prev, [id]: !liked }))
    },
    onError: (_err, { id }) => {
      setPendingFavorites((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] }).then(() => {
        setPendingFavorites((prev) => {
          if (!(id in prev)) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
      })
    },
  })

  const user = useMemo(() => {
    if (!rawUser) return null
    return {
      ...rawUser,
      avatar: avatarOrFallback(rawUser.avatarUrl, rawUser.name || rawUser.phone),
    }
  }, [rawUser])

  const favoriteIds = useMemo(() => {
    const set = new Set(favoriteOffers.map((o) => o.id))
    for (const [id, liked] of Object.entries(pendingFavorites)) {
      if (liked) set.add(id)
      else set.delete(id)
    }
    return set
  }, [favoriteOffers, pendingFavorites])

  const [search, setSearch] = useState({
    mode: 'passenger',
    from: '',
    fromRegion: '',
    fromPlace: '',
    to: '',
    toRegion: '',
    toPlace: '',
    date: todayIso(),
    time: nowHHMM(),
    passengers: 1,
    luggage: "O'rta",
    gender: '',
    seat: '',
    car: '',
    service: 'all',
  })
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [location, setLocation] = useState(loadSavedLocation)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  // Set when a screen (e.g. Cargo) opens the picker to choose an arbitrary address instead of
  // the user's own location — confirm then hands the pick to onPick and leaves `location` alone.
  const [locationPickerRequest, setLocationPickerRequest] = useState(null)
  const [gpsFix, setGpsFix] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('idle')
  const [plusPlan, setPlusPlan] = useState(loadPlusPlan)
  const [language, setLanguage] = useState(loadLanguage)
  // t() o‘qiydigan til render paytida yangilanadi — pastdagi daraxt shu renderdayoq yangi tilni ko‘radi.
  setI18nLanguage(language)
  const [theme, setTheme] = useState(loadTheme)
  const [notifsEnabled, setNotifsEnabled] = useState(() => loadBool(NOTIFS_KEY, true))
  const [autoAccept, setAutoAccept] = useState(() => loadBool(AUTO_ACCEPT_KEY, false))
  const [workRegions, setWorkRegions] = useState(loadWorkRegions)
  const watchIdRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language)
  }, [language])

  useEffect(() => {
    if (isSupportedLanguage(rawUser?.language)) {
      setLanguage(rawUser.language)
    }
  }, [rawUser?.id, rawUser?.language])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    localStorage.setItem(NOTIFS_KEY, notifsEnabled ? '1' : '0')
  }, [notifsEnabled])

  useEffect(() => {
    localStorage.setItem(AUTO_ACCEPT_KEY, autoAccept ? '1' : '0')
  }, [autoAccept])

  useEffect(() => {
    localStorage.setItem(REGIONS_KEY, JSON.stringify(workRegions))
  }, [workRegions])

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
      favorites: favoriteOffers,
      favoriteIds,
      toggleFavorite: (id) => toggleFavoriteMutation.mutate({ id, liked: favoriteIds.has(id) }),
      paymentMethod,
      setPaymentMethod,
      drawerOpen,
      setDrawerOpen,
      location,
      setLocation,
      locationPickerOpen,
      locationPickerRequest,
      gpsFix,
      gpsStatus,
      requestUserLocation,
      queryGeoPermission,
      watchUserLocation,
      stopWatchingLocation,
      openLocationPicker: (request) => {
        // Also wired straight to onClick, so ignore anything that isn't a real request object.
        setLocationPickerRequest(request && typeof request.onPick === 'function' ? request : null)
        setLocationPickerOpen(true)
        if (gpsStatus === 'granted') return
        requestUserLocation()
      },
      closeLocationPicker: () => setLocationPickerOpen(false),
      plusPlan,
      setPlusPlan,
      language,
      setLanguage,
      theme,
      setTheme,
      notifsEnabled,
      setNotifsEnabled,
      autoAccept,
      setAutoAccept,
      workRegions,
      setWorkRegions,
    }),
    [
      user,
      search,
      favoriteOffers,
      favoriteIds,
      toggleFavoriteMutation,
      paymentMethod,
      drawerOpen,
      location,
      locationPickerOpen,
      locationPickerRequest,
      gpsFix,
      gpsStatus,
      requestUserLocation,
      queryGeoPermission,
      watchUserLocation,
      stopWatchingLocation,
      plusPlan,
      language,
      theme,
      notifsEnabled,
      autoAccept,
      workRegions,
    ],
  )

  // Til almashganda butun ilova qayta quriladi, shunda har bir t('…') yangi tilda chiqadi.
  // Server ma’lumotlari react-query keshida, manzil esa URL’da qoladi — hech narsa yo‘qolmaydi.
  return (
    <AppContext.Provider value={value}>
      <Fragment key={language}>{children}</Fragment>
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
