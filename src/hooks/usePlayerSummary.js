import { useEffect, useState } from 'react'
import { fetchPlayerSummary } from '../api/fpl'

/**
 * Per-player detail from /element-summary/. Cached per player id for the life
 * of the page, so reopening a panel is instant and browsing a list doesn't
 * refetch the same player repeatedly.
 */
const cache = new Map()

function load(playerId) {
  if (!cache.has(playerId)) {
    cache.set(
      playerId,
      fetchPlayerSummary(playerId).catch((err) => {
        // Don't cache the rejection — a later open should retry.
        cache.delete(playerId)
        throw err
      }),
    )
  }
  return cache.get(playerId)
}

export function usePlayerSummary(playerId) {
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    if (playerId == null) return
    let cancelled = false
    setState({ loading: true, error: null, data: null })

    load(playerId)
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, data })
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, error, data: null })
      })

    return () => {
      cancelled = true
    }
  }, [playerId])

  return state
}
