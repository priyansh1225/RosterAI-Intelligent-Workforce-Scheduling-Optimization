const API = import.meta.env.VITE_API_BASE_URL || '/api'

export function csrfCookie() {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='))
    ?.split('=')[1]
}

export async function api(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  }
  const csrf = csrfCookie()
  if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(options.method || 'GET')) {
    headers['X-CSRFToken'] = decodeURIComponent(csrf)
  }

  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    const detail =
      body.detail ||
      Object.entries(body)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(' · ')
    const error = new Error(detail || `Request failed (${response.status})`)
    error.status = response.status
    error.body = body
    throw error
  }
  return body
}

export function listData(body) {
  return Array.isArray(body) ? body : body?.results || []
}

export function fmtDate(date, options = { month: 'short', day: 'numeric' }) {
  if (!date) return '—'
  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', options)
}

export function timeOf(value) {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function initials(name = '') {
  return (
    name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'RA'
  )
}

export function getTodayStr() {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function addDays(dateStr, days = 1) {
  const base = new Date(`${dateStr.slice(0, 10)}T12:00:00`)
  base.setDate(base.getDate() + Number(days))
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(base)
}

export function getTomorrowStr() {
  return addDays(getTodayStr(), 1)
}
