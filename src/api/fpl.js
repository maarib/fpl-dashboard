export const API_BASE = 'https://fpl-api-proxy.maarib.workers.dev'

async function get(path) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`)
  } catch {
    throw Object.assign(new Error('Network request failed — check your connection.'), { path })
  }

  if (!res.ok) {
    const message =
      res.status === 404
        ? 'Not found (404) — the FPL API has no data for that request.'
        : `Request failed (${res.status} ${res.statusText}).`
    throw Object.assign(new Error(message), { status: res.status, path })
  }

  return res.json()
}

export const fetchBootstrap = () => get('/bootstrap-static/')
export const fetchFixtures = () => get('/fixtures/')
export const fetchEntry = (managerId) => get(`/entry/${managerId}/`)

/** Per-player detail: past seasons, upcoming fixtures, per-gameweek history. */
export const fetchPlayerSummary = (playerId) => get(`/element-summary/${playerId}/`)
export const fetchPicks = (managerId, gameweek) =>
  get(`/entry/${managerId}/event/${gameweek}/picks/`)
