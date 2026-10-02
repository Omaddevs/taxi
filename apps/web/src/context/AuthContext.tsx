import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler } from '../lib/api'
import { clearAccessToken, setAccessToken } from '../lib/tokens'
import { disconnectSocket } from '../lib/socket'

export interface AuthUser {
  id: string
  name: string | null
  phone: string
  role: string
  [key: string]: unknown
}

type AuthStatus = 'checking' | 'checking-telegram' | 'authed' | 'guest'

interface AuthContextValue {
  authUser: AuthUser | null
  status: AuthStatus
  requestOtp: (phone: string, extras?: Record<string, unknown>) => Promise<{ phone: string; otpRequestId: string }>
  verifyOtp: (phone: string, code: string, extras?: Record<string, unknown>) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// The taxiline-bot WebApp button opens this app with `?tgc=<one-time-code>` so the same
// Telegram user is logged in here without asking for OTP again.
function getTelegramLoginCode(): string | null {
  if (typeof window === 'undefined') return null
  const fromQuery = new URLSearchParams(window.location.search).get('tgc')
  if (fromQuery) return fromQuery
  return (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param || null
}

function stripTelegramLoginCode(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.searchParams.has('tgc')) return
  url.searchParams.delete('tgc')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  // The access token lives only in memory, so it's always gone on a fresh page load — every
  // mount has to ask the server (via the httpOnly refresh cookie) whether a session still exists.
  const [status, setStatus] = useState<AuthStatus>(() => (getTelegramLoginCode() ? 'checking-telegram' : 'checking'))

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthUser(null)
      setStatus('guest')
      disconnectSocket()
    })
  }, [])

  useEffect(() => {
    if (status !== 'checking-telegram') return
    const code = getTelegramLoginCode()
    api
      .post<{ accessToken: string; user: AuthUser }>('/auth/telegram-exchange', { code })
      .then((data) => {
        setAccessToken(data.accessToken)
        setAuthUser(data.user)
        setStatus('authed')
      })
      .catch(() => setStatus('checking'))
      .finally(stripTelegramLoginCode)
  }, [status])

  useEffect(() => {
    if (status !== 'checking') return
    api
      .get<AuthUser>('/users/me')
      .then((user) => {
        setAuthUser(user)
        setStatus('authed')
      })
      .catch(() => {
        clearAccessToken()
        setStatus('guest')
      })
  }, [status])

  async function requestOtp(phone: string, extras: Record<string, unknown> = {}) {
    return api.post<{ phone: string; otpRequestId: string }>('/auth/otp/request', { phone, ...extras })
  }

  async function verifyOtp(phone: string, code: string, extras: Record<string, unknown> = {}) {
    const data = await api.post<{ accessToken: string; user: AuthUser }>('/auth/otp/verify', {
      phone,
      code,
      ...extras,
    })
    setAccessToken(data.accessToken)
    setAuthUser(data.user)
    setStatus('authed')
    return data.user
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // Best-effort revocation — the cookie/local state clears below regardless.
    }
    clearAccessToken()
    disconnectSocket()
    setAuthUser(null)
    setStatus('guest')
  }

  return (
    <AuthContext.Provider value={{ authUser, status, requestOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
