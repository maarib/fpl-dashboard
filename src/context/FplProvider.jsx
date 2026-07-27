import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchBootstrap, fetchFixtures } from '../api/fpl'
import { resolveCurrentEvent } from '../lib/fpl'
import { FplContext } from './FplContext'

// Module-level promise cache: the two static datasets are fetched exactly once
// per page load, no matter how many times the provider mounts (StrictMode
// double-mounts in dev) or how often the user switches tabs.
let bootstrapPromise = null
let fixturesPromise = null

const loadBootstrap = () => (bootstrapPromise ??= fetchBootstrap())
const loadFixtures = () => (fixturesPromise ??= fetchFixtures())

export function FplProvider({ children }) {
  const [bootstrap, setBootstrap] = useState(null)
  const [fixtures, setFixtures] = useState(null)
  const [error, setError] = useState(null)
  // Bumping this re-runs the load. The caches are already cleared on failure,
  // so a retry genuinely refetches rather than replaying the rejection.
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    bootstrapPromise = null
    fixturesPromise = null
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    Promise.all([loadBootstrap(), loadFixtures()])
      .then(([boot, fix]) => {
        if (cancelled) return
        setBootstrap(boot)
        setFixtures(fix)
      })
      .catch((err) => {
        if (cancelled) return
        // Let a later attempt retry rather than caching the rejection forever.
        bootstrapPromise = null
        fixturesPromise = null
        setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  const value = useMemo(() => {
    if (!bootstrap || !fixtures) {
      return { loading: !error, error, retry, bootstrap: null, fixtures: null }
    }

    const teamsById = new Map(bootstrap.teams.map((t) => [t.id, t]))
    const positionsById = new Map(bootstrap.element_types.map((t) => [t.id, t]))
    const playersById = new Map(bootstrap.elements.map((p) => [p.id, p]))

    return {
      loading: false,
      error: null,
      retry,
      bootstrap,
      fixtures,
      players: bootstrap.elements,
      teams: bootstrap.teams,
      positions: bootstrap.element_types,
      events: bootstrap.events,
      currentEvent: resolveCurrentEvent(bootstrap.events),
      teamsById,
      positionsById,
      playersById,
    }
  }, [bootstrap, fixtures, error, retry])

  return <FplContext.Provider value={value}>{children}</FplContext.Provider>
}
