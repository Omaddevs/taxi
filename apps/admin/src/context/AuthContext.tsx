import { createContext, useContext, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { clearSession, getStoredUser, setSession, type AdminUser } from '../lib/tokens'

interface AuthContextValue {
  user: AdminUser | null
  login: (phone: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface LoginResponse {
  user: AdminUser
  accessToken: string
  refreshToken: string
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(getStoredUser)

  async function login(phone: string, password: string) {
    const data = await api.post<LoginResponse>('/admin/auth/login', { phone, password })
    if (!['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'].includes(data.user.role)) {
      throw new Error('Bu hisob operator paneliga kira olmaydi')
    }
    setSession(data.accessToken, data.refreshToken, data.user)
    setUser(data.user)
  }

  function logout() {
    clearSession()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
