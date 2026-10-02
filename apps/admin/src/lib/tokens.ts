export interface AdminUser {
  id: string
  phone: string
  name: string | null
  role: PanelRole
  staffKind?: StaffKind | null
  verified: boolean
}

export type PanelRole = 'ADMIN' | 'SALES_OPERATOR' | 'SUPPORT_OPERATOR'
export type StaffKind = 'ADMIN' | 'SALES' | 'SUPPORT'

const ACCESS_KEY = 'taxiline-admin-access'
const REFRESH_KEY = 'taxiline-admin-refresh'
const USER_KEY = 'taxiline-admin-user'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function getStoredUser(): AdminUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    return null
  }
}

export function setSession(accessToken: string, refreshToken: string, user: AdminUser) {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function setAccessToken(accessToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken)
}

export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem(ACCESS_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}
