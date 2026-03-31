const STORAGE_KEY = 'blb_admin'

export function isAdmin() {
  return sessionStorage.getItem(STORAGE_KEY) === 'true'
}

export function login(password) {
  const correct = import.meta.env.VITE_ADMIN_PASSWORD
  if (password === correct) {
    sessionStorage.setItem(STORAGE_KEY, 'true')
    return true
  }
  return false
}

export function logout() {
  sessionStorage.removeItem(STORAGE_KEY)
}
