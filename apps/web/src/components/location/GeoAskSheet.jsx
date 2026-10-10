import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LoaderCircle, LocateFixed, MapPin, Navigation, ShieldAlert } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { t } from '../../i18n'

export function useMapGeo(enabled = true) {
  const { gpsStatus, requestUserLocation, queryGeoPermission, watchUserLocation, stopWatchingLocation } = useApp()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setOpen(false)
      return undefined
    }
    let cancelled = false
    ;(async () => {
      const perm = await queryGeoPermission()
      if (cancelled) return
      if (perm === 'granted' || gpsStatus === 'granted') {
        const res = await requestUserLocation()
        if (cancelled) return
        if (res.ok) {
          watchUserLocation()
          setOpen(false)
        } else {
          setOpen(true)
        }
        return
      }
      setOpen(true)
    })()
    return () => {
      cancelled = true
      stopWatchingLocation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  useEffect(() => {
    if (!enabled || gpsStatus !== 'granted') return
    setOpen(false)
    watchUserLocation()
  }, [enabled, gpsStatus, watchUserLocation])

  async function allow() {
    const res = await requestUserLocation()
    if (res.ok) {
      watchUserLocation()
      setOpen(false)
    }
  }

  return {
    open,
    status: gpsStatus,
    allow,
    skip: () => setOpen(false),
    reopen: () => setOpen(true),
  }
}

// `text` swaps the default (places-map) explanation for a screen-specific one, e.g. taxi pickup.
export function GeoAskSheet({ open, status, onAllow, onSkip, text }) {
  if (!open) return null

  const pending = status === 'pending'
  const denied = status === 'denied'
  const error = status === 'error' || status === 'timeout'
  const unsupported = status === 'unsupported'

  return createPortal(
    <div className="fixed inset-0 z-[11000] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-md rounded-t-2xl bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 shadow-[0_-16px_50px_rgba(28,28,40,0.22)] sm:mb-8 sm:rounded-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
          {pending ? <LoaderCircle className="h-8 w-8 animate-spin" /> : denied || error || unsupported ? <ShieldAlert className="h-8 w-8" /> : <LocateFixed className="h-8 w-8" />}
        </div>

        <h2 className="mt-4 text-center text-xl font-extrabold">
          {pending
            ? t('Joylashuv aniqlanmoqda…')
            : denied
              ? t('Joylashuvga ruxsat berilmadi')
              : unsupported
                ? t('Brauzer joylashuvni qo‘llab-quvvatlamaydi')
                : error
                  ? t('Joylashuv olinmadi')
                  : t('Joylashuvni yoqing')}
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-muted">
          {pending
            ? t('Brauzer oynasida “Ruxsat berish” ni bosing. Bu yaqin xizmatlarni aniq ko‘rsatadi.')
            : denied
              ? t('Brauzer sozlamalarida ushbu sayt uchun Joylashuv ni yoqing, so‘ng qayta urinib ko‘ring.')
              : unsupported
                ? t('Xaritadan saqlangan manzil atrofini ko‘rsatamiz. Manzilni qo‘lda tanlashingiz mumkin.')
                : error
                  ? t('Signal zaif bo‘lishi mumkin. Qayta urinib ko‘ring yoki saqlangan manzildan davom eting.')
                  : text || t('Yaqin shahobcha, moyka, parking va oshxonani xaritada to‘g‘ri belgilash uchun geolokatsiya kerak.')}
        </p>

        {!text && !pending && !denied && !error && !unsupported ? (
          <ul className="mt-4 space-y-2.5 rounded-2xl bg-canvas px-4 py-3 text-sm font-semibold">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand" /> {t('Yaqinlar yashil, uzoqlar alohida rangda')}
            </li>
            <li className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-brand" /> {t('Yo‘nalish aniqroq hisoblanadi')}
            </li>
            <li className="flex items-center gap-2">
              <LocateFixed className="h-4 w-4 text-brand" /> {t('Siz xaritada ko‘k nuqta bo‘lib chiqasiz')}
            </li>
          </ul>
        ) : null}

        {denied ? (
          <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-800">
            {t('Chrome: qulf belgisini bosing → Sayt sozlamalari → Joylashuv → Ruxsat. Keyin “Qayta urinish”.')}
          </p>
        ) : null}

        <div className="mt-5 space-y-2">
          {unsupported ? null : (
            <button
              type="button"
              disabled={pending}
              onClick={onAllow}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-70"
            >
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {pending ? t('Kuting…') : denied || error ? t('Qayta urinish') : t('Joylashuvni yoqish')}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={onSkip}
            className="flex h-11 w-full items-center justify-center rounded-2xl bg-canvas text-sm font-bold text-ink disabled:opacity-50"
          >
            {t('Saqlangan manzildan davom etish')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
