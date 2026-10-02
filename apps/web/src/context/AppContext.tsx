import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18next from 'i18next'
import { DEFAULT_LOCATION, polishLocationLabel, type SavedLocation } from '../lib/geocode'
import { api } from '../lib/api'
import { avatarOrFallback } from '../lib/adapters'
import { useAuth, type AuthUser } from './AuthContext'

type Language = 'uz' | 'ru' | 'en'
type Theme = 'light' | 'dark'
type GpsStatus = 'idle' | 'pending' | 'granted' | 'denied' | 'timeout' | 'error' | 'unsupported'
type PlusPlan = 'start' | 'plus' | 'premium' | null

interface GpsFix {
  lat?: number
  lng?: number
  accuracy?: number
  at: number
  error?: boolean
  code?: number
}

interface SearchState {
  mode: string
  from: string
  fromRegion: string
  fromPlace: string
  to: string
  toRegion: string
  toPlace: string
  date: string
  time: string
  passengers: number
  luggage: string
  gender: string
  seat: string
  car: string
  service: string
}

interface AppUser extends AuthUser {
  avatar: string
}

export interface LocationPickerRequest {
  title?: string
  initial?: SavedLocation | null
  onPick: (loc: SavedLocation) => void
}

interface AppContextValue {
  user: AppUser | null
  search: SearchState
  setSearch: React.Dispatch<React.SetStateAction<SearchState>>
  favorites: any[]
  favoriteIds: Set<string>
  toggleFavorite: (id: string) => void
  paymentMethod: string
  setPaymentMethod: React.Dispatch<React.SetStateAction<string>>
  drawerOpen: boolean
  setDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>
  location: SavedLocation
  setLocation: React.Dispatch<React.SetStateAction<SavedLocation>>
  locationPickerOpen: boolean
  gpsFix: GpsFix | null
  gpsStatus: GpsStatus
  requestUserLocation: () => Promise<{ ok: boolean; status: GpsStatus }>
  queryGeoPermission: () => Promise<string>
  watchUserLocation: () => void
  stopWatchingLocation: () => void
  locationPickerRequest: LocationPickerRequest | null
  openLocationPicker: (request?: LocationPickerRequest | unknown) => void
  closeLocationPicker: () => void
  plusPlan: PlusPlan
  setPlusPlan: React.Dispatch<React.SetStateAction<PlusPlan>>
  language: Language
  setLanguage: React.Dispatch<React.SetStateAction<Language>>
  theme: Theme
  setTheme: React.Dispatch<React.SetStateAction<Theme>>
  notifsEnabled: boolean
  setNotifsEnabled: React.Dispatch<React.SetStateAction<boolean>>
  autoAccept: boolean
  setAutoAccept: React.Dispatch<React.SetStateAction<boolean>>
  workRegions: string[]
  setWorkRegions: React.Dispatch<React.SetStateAction<string[]>>
}

const AppContext = createContext<AppContextValue | null>(null)
const LOCATION_KEY = 'taxiline-location'
const PLUS_KEY = 'taxiline-plus'
const LANG_KEY = 'taxiline-lang'
const THEME_KEY = 'taxiline-theme'
const NOTIFS_KEY = 'taxiline-notifs'
const AUTO_ACCEPT_KEY = 'taxiline-auto-accept'
const REGIONS_KEY = 'taxiline-work-regions'

function loadLanguage(): Language {
  try {
    const raw = localStorage.getItem(LANG_KEY)
    if (raw && ['uz', 'ru', 'en'].includes(raw)) return raw as Language
  } catch {
    /* ignore */
  }
  return 'uz'
}

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch {
    /* ignore */
  }
  return fallback
}

function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function loadWorkRegions(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(REGIONS_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function loadPlusPlan(): PlusPlan {
  try {
    const raw = localStorage.getItem(PLUS_KEY)
    if (raw && ['start', 'plus', 'premium'].includes(raw)) return raw as PlusPlan
  } catch {
    /* ignore */
  }
  return null
}

function loadSavedLocation(): SavedLocation {
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

export function AppProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth()
  const authed = authStatus === 'authed'
  const queryClient = useQueryClient()

  const { data: rawUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<AuthUser>('/users/me'),
    enabled: authed,
    staleTime: 30_000,
  })

  const { data: favoriteOffers = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<any[]>('/favorites'),
    enabled: authed,
    staleTime: 15_000,
  })

  const [pendingFavorites, setPendingFavorites] = useState<Record<string, boolean>>({})

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      liked ? api.delete(`/favorites/${id}`) : api.post(`/favorites/${id}`),
    onMutate: ({ id, liked }: { id: string; liked: boolean }) => {
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

  const user = useMemo<AppUser | null>(() => {
    if (!rawUser) return null
    return {
      ...rawUser,
      avatar: avatarOrFallback(rawUser.avatarUrl as string | undefined, rawUser.name || rawUser.phone),
    }
  }, [rawUser])

  const favoriteIds = useMemo(() => {
    const set = new Set<string>(favoriteOffers.map((o: any) => o.id))
    for (const [id, liked] of Object.entries(pendingFavorites)) {
      if (liked) set.add(id)
      else set.delete(id)
    }
    return set
  }, [favoriteOffers, pendingFavorites])

  const [search, setSearch] = useState<SearchState>({
    mode: 'passenger',
    from: 'Samarqand, Samarqand shahri',
    fromRegion: 'Samarqand',
    fromPlace: 'Samarqand shahri',
    to: 'Toshkent shahri, Yunusobod',
    toRegion: 'Toshkent shahri',
    toPlace: 'Yunusobod',
    date: '2026-05-22',
    time: '18:00',
    passengers: 1,
    luggage: "O'rta",
    gender: '',
    seat: '',
    car: '',
    service: 'all',
  })
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [location, setLocation] = useState<SavedLocation>(loadSavedLocation)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  // Set when a screen (e.g. Cargo) opens the picker to choose an arbitrary address instead of
  // the user's own location — confirm then hands the pick to onPick and leaves `location` alone.
  const [locationPickerRequest, setLocationPickerRequest] = useState<LocationPickerRequest | null>(null)
  const [gpsFix, setGpsFix] = useState<GpsFix | null>(null)
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle')
  const [plusPlan, setPlusPlan] = useState<PlusPlan>(loadPlusPlan)
  const [language, setLanguage] = useState<Language>(loadLanguage)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [notifsEnabled, setNotifsEnabled] = useState(() => loadBool(NOTIFS_KEY, true))
  const [autoAccept, setAutoAccept] = useState(() => loadBool(AUTO_ACCEPT_KEY, false))
  const [workRegions, setWorkRegions] = useState<string[]>(loadWorkRegions)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language)
    document.documentElement.lang = language
    if (i18next.language !== language) i18next.changeLanguage(language)
  }, [language])

  useEffect(() => {
    const rawLang = (rawUser as any)?.language
    if (rawLang && ['uz', 'ru', 'en'].includes(rawLang)) {
      setLanguage(rawLang)
    }
  }, [rawUser?.id, (rawUser as any)?.language])

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

  const applyPosition = useCallback((pos: GeolocationPosition) => {
    setGpsStatus('granted')
    setGpsFix({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      at: Date.now(),
    })
  }, [])

  const queryGeoPermission = useCallback(async (): Promise<string> => {
    if (!navigator.geolocation) return 'unsupported'
    try {
      if (!navigator.permissions?.query) return 'unknown'
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
      return result.state
    } catch {
      return 'unknown'
    }
  }, [])

  const requestUserLocation = useCallback(() => {
    return new Promise<{ ok: boolean; status: GpsStatus }>((resolve) => {
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
          const status: GpsStatus = err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'error'
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
    watchIdRef.current = navigator.geolocation.watchPosition(applyPosition, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 12000,
      timeout: 20000,
    })
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
    let perm: PermissionStatus | undefined
    if (!navigator.permissions?.query) return undefined
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
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

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      search,
      setSearch,
      favorites: favoriteOffers,
      favoriteIds,
      toggleFavorite: (id: string) => toggleFavoriteMutation.mutate({ id, liked: favoriteIds.has(id) }),
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
      openLocationPicker: (request?: LocationPickerRequest | unknown) => {
        // Also wired straight to onClick, so ignore anything that isn't a real request object.
        setLocationPickerRequest(
          request && typeof (request as LocationPickerRequest).onPick === 'function'
            ? (request as LocationPickerRequest)
            : null,
        )
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

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
