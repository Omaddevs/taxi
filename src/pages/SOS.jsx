import { useEffect, useState } from 'react'
import { ArrowLeft, MapPin, Phone, Plus, Share2, Trash2, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { googleMapsUrl } from '../lib/geo'

const CONTACTS_KEY = 'taxiline-sos-contacts'

const DEFAULT_CONTACTS = [
  { id: 't1', name: 'Onam', phone: '+998 90 111 22 33' },
  { id: 't2', name: 'Otabek do‘st', phone: '+998 91 555 44 33' },
]

function loadContacts() {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_CONTACTS
}

export default function SOS() {
  const navigate = useNavigate()
  const { gpsFix, gpsStatus, requestUserLocation, location } = useApp()
  const [phase, setPhase] = useState('idle')
  const [hold, setHold] = useState(0)
  const [contacts, setContacts] = useState(loadContacts)
  const [showContacts, setShowContacts] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })

  const coords =
    gpsFix && !gpsFix.error && typeof gpsFix.lat === 'number'
      ? { lat: gpsFix.lat, lng: gpsFix.lng }
      : location?.lat
        ? { lat: location.lat, lng: location.lng }
        : null

  useEffect(() => {
    requestUserLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'sending') return
    const t = setTimeout(() => setPhase('sent'), 1400)
    return () => clearTimeout(t)
  }, [phase])

  function persist(next) {
    setContacts(next)
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(next))
  }

  function startHold() {
    if (phase === 'sending' || phase === 'sent') return
    const started = Date.now()
    const tick = setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / 1800) * 100)
      setHold(p)
      if (p >= 100) {
        clearInterval(tick)
        trigger()
      }
    }, 40)
    const stop = () => {
      clearInterval(tick)
      setHold(0)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  function trigger() {
    setHold(0)
    try {
      navigator.vibrate?.([200, 80, 200])
    } catch {
      /* ignore */
    }
    requestUserLocation()
    setPhase('sending')
  }

  const shareText = coords
    ? `SOS! Menga yordam kerak. TaxiLine.\nJoylashuv: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}\n${googleMapsUrl(coords.lat, coords.lng)}`
    : 'SOS! Menga yordam kerak. TaxiLine.'

  async function shareSos() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'SOS — TaxiLine', text: shareText })
        return
      }
    } catch {
      return
    }
    try {
      await navigator.clipboard.writeText(shareText)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#1a0b10] px-5 py-6 text-white">
      <button type="button" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold text-white/70">Favqulodda holat</p>
        <h1 className="mt-2 text-2xl font-extrabold">
          {phase === 'sent' ? 'Joylashuv yuborildi' : phase === 'sending' ? 'Yuborilmoqda…' : 'Yordam chaqirish'}
        </h1>
        <button
          type="button"
          onPointerDown={startHold}
          onClick={() => {
            if (phase === 'idle') trigger()
          }}
          className="sos-pulse relative mt-10 flex h-44 w-44 items-center justify-center rounded-full bg-red-500 text-4xl font-black tracking-widest"
        >
          {hold > 0 ? (
            <span className="absolute inset-2 rounded-full border-4 border-white/40" style={{ clipPath: `inset(${100 - hold}% 0 0 0)` }} />
          ) : null}
          SOS
        </button>
        <p className="mt-8 max-w-xs text-sm text-white/70">
          {phase === 'sent'
            ? 'Ishonchli kontaktlar va 24/7 yordam xizmati sizning joylashuvingizni oldi. Qo‘ng‘iroq qiling yoki ulashing.'
            : 'Tugmani bosing yoki 2 soniya ushlab turing. Geolokatsiya ishonchli kontaktlarga yuboriladi.'}
        </p>
        {gpsStatus === 'pending' ? <p className="mt-3 text-xs font-semibold text-amber-200">Joylashuv aniqlanmoqda…</p> : null}
        {coords ? (
          <p className="mt-2 text-xs text-white/50">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {coords ? (
          <a
            href={googleMapsUrl(coords.lat, coords.lng)}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 text-sm font-bold"
          >
            <MapPin className="h-4 w-4" /> Joylashuvim
          </a>
        ) : (
          <button
            type="button"
            onClick={requestUserLocation}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 text-sm font-bold"
          >
            <MapPin className="h-4 w-4" /> Joylashuvim
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowContacts(true)}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 text-sm font-bold"
        >
          <Users className="h-4 w-4" /> Kontaktlar
        </button>
        <a href="tel:101" className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-extrabold text-red-600">
          <Phone className="h-4 w-4" /> 101 — O‘t
        </a>
        <a href="tel:103" className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-extrabold text-red-600">
          <Phone className="h-4 w-4" /> 103 — Tez yordam
        </a>
        <button
          type="button"
          onClick={shareSos}
          className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-extrabold"
        >
          <Share2 className="h-4 w-4" /> Holatni ulashish
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="col-span-2 text-center text-xs font-semibold text-white/60">
          WhatsApp orqali yuborish
        </a>
      </div>

      {showContacts ? (
        <div className="fixed inset-0 z-[140]">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Yopish" onClick={() => setShowContacts(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[#2a1218] px-4 pb-8 pt-3">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
            <p className="text-lg font-extrabold">Ishonchli kontaktlar</p>
            <div className="mt-3 space-y-2">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{c.name}</p>
                    <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="text-xs text-white/70">
                      {c.phone}
                    </a>
                  </div>
                  <a href={`sms:${c.phone.replace(/\s/g, '')}?body=${encodeURIComponent(shareText)}`} className="text-xs font-bold">
                    SMS
                  </a>
                  <button type="button" aria-label="O‘chirish" onClick={() => persist(contacts.filter((x) => x.id !== c.id))}>
                    <Trash2 className="h-4 w-4 text-white/50" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ism"
                className="h-11 rounded-2xl bg-white/10 px-3 text-sm outline-none"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Telefon"
                className="h-11 rounded-2xl bg-white/10 px-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!form.name || !form.phone) return
                  persist([...contacts, { id: `t${Date.now()}`, name: form.name, phone: form.phone }])
                  setForm({ name: '', phone: '' })
                }}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
