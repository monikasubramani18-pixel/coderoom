// Set VITE_API_URL when deploying (e.g. https://api.example.com)
export const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
// http -> ws, https -> wss
export const WS_URL = API.replace(/^http/, 'ws')

function extractErrorMessage(data) {
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.detail)) return data.detail[0]?.msg || 'Invalid input'
  return 'Something went wrong. Please try again.'
}

export async function api(path, { method = 'GET', body, token } = {}) {
  let response
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?')
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    // Empty body (e.g. 204 No Content)
  }

  if (!response.ok) throw new Error(extractErrorMessage(data))
  return data
}
