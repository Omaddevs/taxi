// Access token lives only in memory — never persisted to localStorage/sessionStorage, so an
// XSS payload can't read it back out after the fact and it disappears on every page reload.
// The refresh token never reaches JS at all: it's an httpOnly cookie the browser attaches
// automatically (see lib/api.ts's tryRefresh + credentials: 'include').
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}
