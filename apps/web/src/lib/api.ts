import { clearAccessToken, getAccessToken, setAccessToken } from './tokens'

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

let refreshPromise: Promise<boolean> | null = null
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn
}

// The refresh token itself never touches JS — it rides along as an httpOnly cookie, so this
// just asks the server "is there a valid session cookie?" and gets a fresh access token back.
async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) return false
        const data = await res.json()
        setAccessToken(data.accessToken)
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

async function request<T = any>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) return request(path, options, false)
    clearAccessToken()
    onUnauthorized?.()
    throw new ApiError(401, 'Session expired')
  }

  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? 'Xatolik yuz berdi', body?.error?.code)
  }

  return body
}

export const api = {
  get: <T = any>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
}
