import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_FORMATION,
  FORMATIONS,
  SQUAD_SHAPE,
  emptySquad,
  startingIds,
} from '../lib/squad'

const STORAGE_KEY = 'fpl-dashboard:my-xi'

/** Re-validate whatever came out of localStorage; never trust its shape. */
function hydrate(raw) {
  const fallback = {
    formation: DEFAULT_FORMATION,
    squad: emptySquad(),
    captain: null,
    viceCaptain: null,
  }
  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw)
    const formation = FORMATIONS.includes(parsed?.formation)
      ? parsed.formation
      : DEFAULT_FORMATION

    const squad = emptySquad()
    for (const pos of [1, 2, 3, 4]) {
      const saved = parsed?.squad?.[pos]
      if (!Array.isArray(saved)) continue
      for (let i = 0; i < SQUAD_SHAPE[pos]; i += 1) {
        const id = saved[i]
        squad[pos][i] = Number.isInteger(id) ? id : null
      }
    }
    const id = (v) => (Number.isInteger(v) ? v : null)
    return sanitize({
      formation,
      squad,
      captain: id(parsed?.captain),
      viceCaptain: id(parsed?.viceCaptain),
    })
  } catch {
    return fallback
  }
}

/**
 * Armbands are only meaningful on a starting player, and captain and vice
 * cannot be the same person. Rather than validating at every call site, every
 * mutation passes through here — so benching your captain, removing them, or
 * changing formation cannot leave a stale armband behind.
 */
function sanitize(state) {
  const starters = startingIds(state.squad, state.formation)
  let { captain, viceCaptain } = state

  if (captain != null && !starters.has(captain)) captain = null
  if (viceCaptain != null && !starters.has(viceCaptain)) viceCaptain = null
  if (captain != null && captain === viceCaptain) viceCaptain = null

  return { ...state, captain, viceCaptain }
}

/** My XI squad state, persisted across refreshes. */
export function useSquad() {
  const [state, setState] = useState(() => hydrate(localStorage.getItem(STORAGE_KEY)))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const setFormation = useCallback((formation) => {
    setState((s) => sanitize({ ...s, formation }))
  }, [])

  const setSlot = useCallback((pos, index, playerId) => {
    setState((s) => {
      const squad = { ...s.squad, [pos]: [...s.squad[pos]] }
      squad[pos][index] = playerId
      return sanitize({ ...s, squad })
    })
  }, [])

  const clearSlot = useCallback((pos, index) => {
    setState((s) => {
      const squad = { ...s.squad, [pos]: [...s.squad[pos]] }
      squad[pos][index] = null
      return sanitize({ ...s, squad })
    })
  }, [])

  /** Swap two entries within a position — how bench/start changes happen. */
  const swapSlots = useCallback((pos, a, b) => {
    setState((s) => {
      const list = [...s.squad[pos]]
      ;[list[a], list[b]] = [list[b], list[a]]
      return sanitize({ ...s, squad: { ...s.squad, [pos]: list } })
    })
  }, [])

  const reset = useCallback(() => {
    setState({
      formation: DEFAULT_FORMATION,
      squad: emptySquad(),
      captain: null,
      viceCaptain: null,
    })
  }, [])

  /**
   * Assign the armband. Promoting the vice-captain swaps the two rather than
   * leaving the vice slot empty — that is what the official game does, and
   * clearing it would silently cost you your backup.
   */
  const setCaptain = useCallback((playerId) => {
    setState((s) =>
      sanitize({
        ...s,
        captain: playerId,
        viceCaptain: s.viceCaptain === playerId ? s.captain : s.viceCaptain,
      }),
    )
  }, [])

  const setViceCaptain = useCallback((playerId) => {
    setState((s) =>
      sanitize({
        ...s,
        viceCaptain: playerId,
        captain: s.captain === playerId ? s.viceCaptain : s.captain,
      }),
    )
  }, [])

  /** Replace the whole squad at once — used when importing a shared link. */
  const replaceAll = useCallback((next) => {
    setState(() => sanitize({
      formation: FORMATIONS.includes(next.formation)
        ? next.formation
        : DEFAULT_FORMATION,
      squad: {
        1: [...next.squad[1]],
        2: [...next.squad[2]],
        3: [...next.squad[3]],
        4: [...next.squad[4]],
      },
      captain: null,
      viceCaptain: null,
    }))
  }, [])

  return {
    formation: state.formation,
    squad: state.squad,
    captain: state.captain,
    viceCaptain: state.viceCaptain,
    setFormation,
    setSlot,
    clearSlot,
    swapSlots,
    reset,
    replaceAll,
    setCaptain,
    setViceCaptain,
  }
}
