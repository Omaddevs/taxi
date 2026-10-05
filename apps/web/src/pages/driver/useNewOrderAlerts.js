import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useApp } from '../../context/AppContext'
import { filterByWorkRegions, mergeDriverOrders } from './orders'

const POLL_MS = 5000
const SEEN_KEY = 'taxiline-seen-orders'
const VOICE_URL = '/sounds/new-order.mp3' // "Haydovchi, yangi mijoz!"

function loadSeen() {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY)
    const list = raw ? JSON.parse(raw) : null
    return Array.isArray(list) ? new Set(list) : null
  } catch {
    return null
  }
}

function saveSeen(seen) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-300)))
  } catch {
    /* private mode — alerts still work for this page view */
  }
}

// Short two-tone chime before the voice, generated in the browser (no extra file to load).
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    ;[880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + 0.34)
    })
    setTimeout(() => ctx.close().catch(() => {}), 1200)
  } catch {
    /* audio not available */
  }
}

/**
 * Watches the driver's incoming orders (bot orders + website bookings) on every driver page and,
 * when a new one arrives, plays the "Haydovchi, yangi mijoz!" voice, vibrates, shows an in-app
 * banner and — when the tab is in the background — a system notification.
 */
export function useNewOrderAlerts() {
  const { notifsEnabled, workRegions } = useApp()
  const seenRef = useRef(loadSeen())
  const audioRef = useRef(null)
  const [alert, setAlert] = useState(null)
  const [soundBlocked, setSoundBlocked] = useState(false)

  const { data: bookings } = useQuery({
    queryKey: ['driver-bookings'],
    queryFn: () => api.get('/bookings?role=driver'),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
  })
  const { data: botOrders } = useQuery({
    queryKey: ['driver-bot-orders'],
    queryFn: () => api.get('/bot-orders/driver'),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
  })

  const playVoice = useCallback(() => {
    if (!audioRef.current) audioRef.current = new Audio(VOICE_URL)
    const audio = audioRef.current
    audio.currentTime = 0
    return audio.play().then(
      () => setSoundBlocked(false),
      () => setSoundBlocked(true), // autoplay blocked until the driver taps the page once
    )
  }, [])

  useEffect(() => {
    if (bookings === undefined || botOrders === undefined) return
    const pending = filterByWorkRegions(mergeDriverOrders(bookings, botOrders), workRegions).filter(
      (o) => o.status === 'PENDING',
    )

    // First load of this tab: what is already waiting isn't "new" — only alert on arrivals.
    if (!seenRef.current) {
      seenRef.current = new Set(pending.map((o) => o.id))
      saveSeen(seenRef.current)
      return
    }

    const fresh = pending.filter((o) => !seenRef.current.has(o.id))
    if (!fresh.length) return
    fresh.forEach((o) => seenRef.current.add(o.id))
    saveSeen(seenRef.current)

    const newest = fresh[0]
    setAlert({ order: newest, count: fresh.length, at: Date.now() })
    if (!notifsEnabled) return

    playChime()
    setTimeout(() => playVoice(), 450)
    navigator.vibrate?.([250, 120, 250])

    if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const n = new Notification('TaxiLine — yangi mijoz!', {
          body: `${newest.from} → ${newest.to}${fresh.length > 1 ? ` (+${fresh.length - 1})` : ''}`,
          icon: '/logo.png',
          tag: 'taxiline-new-order',
          renotify: true,
        })
        n.onclick = () => {
          window.focus()
          window.location.assign(`/driver/orders/${newest.id}`)
          n.close()
        }
      } catch {
        /* some mobile browsers only allow notifications from a service worker */
      }
    }
  }, [bookings, botOrders, workRegions, notifsEnabled, playVoice])

  // Banner disappears by itself after a while.
  useEffect(() => {
    if (!alert) return undefined
    const t = setTimeout(() => setAlert(null), 20000)
    return () => clearTimeout(t)
  }, [alert])

  const dismiss = useCallback(() => setAlert(null), [])
  const enableSound = useCallback(() => {
    playVoice()
  }, [playVoice])

  return { alert, dismiss, soundBlocked, enableSound }
}
