import { useEffect, useState } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Offline banner + "yangi versiya tayyor" toast. Lives once near the app root so it
// is visible across every route, including full-bleed screens like /driver and /sos.
export function PwaStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error) => console.error('Service worker registration failed:', error),
  })

  useEffect(() => {
    const goOnline = () => setIsOffline(false)
    const goOffline = () => setIsOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (!isOffline && !needRefresh) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      {isOffline ? (
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          <WifiOff className="h-4 w-4 shrink-0" />
          Internet aloqasi yo‘q — ba’zi ma’lumotlar yangilanmasligi mumkin
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            updateServiceWorker(true)
            setNeedRefresh(false)
          }}
          className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
        >
          <RefreshCw className="h-4 w-4 shrink-0" />
          Yangi versiya tayyor — yangilash uchun bosing
        </button>
      )}
    </div>
  )
}
