// Deploy pannum bodhu VITE_API_URL set pannunga (e.g. https://api.example.com)
export const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const WS_URL = API.replace(/^http/, 'ws') // http -> ws, https -> wss

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    // empty response
  }

  if (!res.ok) {
    let msg = 'Edho thappu aagiduchu'
    if (typeof data?.detail === 'string') msg = data.detail
    else if (Array.isArray(data?.detail)) msg = data.detail[0]?.msg || msg
    throw new Error(msg)
  }
  return data
}