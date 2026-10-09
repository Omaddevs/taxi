import { api } from './api'

// "Google orqali kirish" — Google Identity Services, authorization-code popup flow. The page
// gets a one-time code which the API swaps for the profile (server/src/modules/auth/google.ts),
// so no Google token ever lives in the browser. The client id comes from the API at runtime,
// so turning Google on/off or rotating keys needs no rebuild of the site.

const GIS_SRC = 'https://accounts.google.com/gsi/client'
let configPromise = null
let scriptPromise = null

export function getGoogleConfig() {
  if (!configPromise) {
    configPromise = api.get('/auth/google/config').catch((err) => {
      configPromise = null
      throw err
    })
  }
  return configPromise
}

function loadScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const el = document.createElement('script')
      el.src = GIS_SRC
      el.async = true
      el.defer = true
      el.onload = () => resolve()
      el.onerror = () => {
        scriptPromise = null
        reject(new Error('Google xizmatini yuklab bo‘lmadi. Internetni tekshiring'))
      }
      document.head.appendChild(el)
    })
  }
  return scriptPromise
}

export class GoogleCancelled extends Error {}

/** Opens Google's account chooser; resolves with the authorization code. */
export async function requestGoogleCode() {
  const config = await getGoogleConfig()
  if (!config?.enabled || !config.clientId) throw new Error('Google orqali kirish hozircha yoqilmagan')
  await loadScript()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: config.clientId,
      scope: 'openid email profile',
      ux_mode: 'popup',
      select_account: true,
      callback: (response) => {
        if (response?.code) resolve(response.code)
        else reject(new Error(response?.error_description || 'Google orqali kirish bekor qilindi'))
      },
      error_callback: (err) => {
        // Closing the popup is the user's choice, not an error worth a red message.
        if (err?.type === 'popup_closed') reject(new GoogleCancelled())
        else if (err?.type === 'popup_failed_to_open') reject(new Error('Brauzer oynani to‘sib qo‘ydi — qalqib chiquvchi oynalarga ruxsat bering'))
        else reject(new Error('Google oynasini ochib bo‘lmadi'))
      },
    })
    client.requestCode()
  })
}

// Between "Google said who you are" and "phone confirmed": the signed ticket from the API.
const PENDING_KEY = 'taxiline-google-pending'

export function savePendingGoogle(data) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...data, savedAt: Date.now() }))
  } catch {
    // Private mode — the page still has it in router state.
  }
}

export function readPendingGoogle() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null')
    // The ticket itself lives 15 minutes server-side; don't offer a stale one.
    if (!raw || Date.now() - raw.savedAt > 14 * 60_000) return null
    return raw
  } catch {
    return null
  }
}

export function clearPendingGoogle() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // ignore
  }
}
