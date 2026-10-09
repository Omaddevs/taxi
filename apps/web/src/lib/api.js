import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokens'

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

let refreshPromise = null
let onUnauthorized = null

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

async function tryRefresh() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false
        const data = await res.json()
        setTokens(data.accessToken, data.refreshToken)
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

async function request(path, options = {}, retry = true) {
  const token = getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) return request(path, options, false)
    clearTokens()
    onUnauthorized?.()
    throw new ApiError(401, 'Session expired')
  }

  if (res.status === 204) return undefined

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    // A Google account without a phone tried something that needs one — PhoneRequiredDialog
    // (mounted once in App) listens for this and asks for the number.
    if (body?.error?.code === 'PHONE_REQUIRED' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taxiline:phone-required', { detail: { message: body.error.message } }))
    }
    throw new ApiError(res.status, body?.error?.message ?? 'Xatolik yuz berdi', body?.error?.code)
  }

  return body
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: (path, body) => request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
