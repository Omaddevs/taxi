export function isDriverUser(user) {
  if (!user) return false
  if (user.role === 'DRIVER') return true
  if (user.driver?.approved) return true
  return false
}

export function isDriverRole(role, driver) {
  return isDriverUser({ role, driver })
}

export function homePathForRole(roleOrUser, driver) {
  if (roleOrUser && typeof roleOrUser === 'object') {
    return isDriverUser(roleOrUser) ? '/driver' : '/'
  }
  return isDriverUser({ role: roleOrUser, driver }) ? '/driver' : '/'
}
