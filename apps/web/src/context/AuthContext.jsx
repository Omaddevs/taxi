import { createContext, useContext, useEffect, useState } from 'react'
import { api, setUnauthorizedHandler } from '../lib/api'
import { clearTokens, getAccessToken, setTokens } from '../lib/tokens'
import { disconnectSocket } from '../lib/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null)
  const [status, setStatus] = useState(getAccessToken() ? 'checking' : 'guest')

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthUser(null)
      setStatus('guest')
      disconnectSocket()
    })
  }, [])

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

  async function requestOtp(phone) {
    await api.post('/auth/otp/request', { phone })
  }

  async function verifyOtp(phone, code) {
    const data = await api.post('/auth/otp/verify', { phone, code })
    setTokens(data.accessToken, data.refreshToken)
    setAuthUser(data.user)
    setStatus('authed')
  }

  function logout() {
    clearTokens()
    disconnectSocket()
    setAuthUser(null)
    setStatus('guest')
  }

  return (
    <AuthContext.Provider value={{ authUser, status, requestOtp, verifyOtp, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
