import { createContext, useContext, useEffect, useState } from 'react'
import { api, setUnauthorizedHandler } from '../lib/api'
import { clearTokens, getAccessToken, setTokens } from '../lib/tokens'
import { disconnectSocket } from '../lib/socket'

const AuthContext = createContext(null)

// The taxiline-bot WebApp button opens this app with `?tgc=<one-time-code>` so the same
// Telegram user is logged in here without asking for OTP again.
function getTelegramLoginCode() {
  if (typeof window === 'undefined') return null
  const fromQuery = new URLSearchParams(window.location.search).get('tgc')
  if (fromQuery) return fromQuery
  return window.Telegram?.WebApp?.initDataUnsafe?.start_param || null
}

function stripTelegramLoginCode() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.searchParams.has('tgc')) return
  url.searchParams.delete('tgc')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null)
  const [status, setStatus] = useState(() => {
    if (getTelegramLoginCode()) return 'checking-telegram'
    return getAccessToken() ? 'checking' : 'guest'
  })

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
      .post('/auth/telegram-exchange', { code })
      .then((data) => {
        setTokens(data.accessToken, data.refreshToken)
        setAuthUser(data.user)
        setStatus('authed')
      })
      .catch(() => {
        setStatus(getAccessToken() ? 'checking' : 'guest')
      })
      .finally(stripTelegramLoginCode)
  }, [status])

  useEffect(() => {
    if (status !== 'checking') return
    api
      .get('/users/me')
      .then((user) => {
        setAuthUser(user)
        setStatus('authed')
      })
      .catch(() => {
        clearTokens()
        setStatus('guest')
      })
  }, [status])

  async function requestOtp(phone, extras = {}) {
    // Returns { phone, otpRequestId } — the id lets the Telegram-tap fast path (see Login.jsx)
    // poll for completion without ever exposing the phone number itself as the lookup key.
    return api.post('/auth/otp/request', { phone, ...extras })
  }

  async function verifyOtp(phone, code, extras = {}) {
    const data = await api.post('/auth/otp/verify', { phone, code, ...extras })
    setTokens(data.accessToken, data.refreshToken)
    setAuthUser(data.user)
    setStatus('authed')
    return data.user
  }

  // While pending, returns { pending: true, code } — `code` autofills the input the moment
  // Telegram (or SMS) has actually delivered it, no typing required to at least see it. Once
  // the code has been confirmed — either typed into this same form (verifyOtp) or tapped in
  // Telegram (bot -> /bot/otp-confirm) — returns { pending: false } and logs in exactly like
  // verifyOtp does. Meant to be called on an interval while the code screen is up.
  async function pollOtp(otpRequestId) {
    const data = await api.get(`/auth/otp/poll?otpRequestId=${encodeURIComponent(otpRequestId)}`)
    if (data.pending) return { pending: true, code: data.code || null }
    setTokens(data.accessToken, data.refreshToken)
    setAuthUser(data.user)
    setStatus('authed')
    return { pending: false, user: data.user }
  }

  function applySession(data) {
    setTokens(data.accessToken, data.refreshToken)
    setAuthUser(data.user)
    setStatus('authed')
    return data.user
  }

  // Google popup code → { status: 'ok', user } (logged in, no code asked) or
  // { status: 'not_registered', ticket, profile } (no account with this Google yet).
  async function googleSignIn(code) {
    const data = await api.post('/auth/google', { code })
    if (data.status === 'ok') return { status: 'ok', user: applySession(data) }
    return data
  }

  // Google registration: name/email/photo come from Google, only the phone is asked — no code.
  async function googleRegister(ticket, phone) {
    return applySession(await api.post('/auth/google/register', { ticket, phone }))
  }

  function logout() {
    clearTokens()
    disconnectSocket()
    setAuthUser(null)
    setStatus('guest')
  }

  return (
    <AuthContext.Provider
      value={{ authUser, status, requestOtp, verifyOtp, pollOtp, googleSignIn, googleRegister, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
