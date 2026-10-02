export interface RoleUser {
  role?: string | null
  driver?: { approved?: boolean } | null
}

export function isDriverUser(user: RoleUser | null | undefined): boolean {
  if (!user) return false
  if (user.role === 'DRIVER') return true
  if (user.driver?.approved) return true
  return false
}

export function isDriverRole(role: string | null | undefined, driver: RoleUser['driver']): boolean {
  return isDriverUser({ role, driver })
}

export function homePathForRole(roleOrUser: RoleUser | string | null | undefined, driver?: RoleUser['driver']): string {
  if (roleOrUser && typeof roleOrUser === 'object') {
    return isDriverUser(roleOrUser) ? '/driver' : '/'
  }
  return isDriverUser({ role: roleOrUser, driver }) ? '/driver' : '/'
}
