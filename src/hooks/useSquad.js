import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_FORMATION,
  FORMATIONS,
  SQUAD_SHAPE,
  emptySquad,
} from '../lib/squad'

const STORAGE_KEY = 'fpl-dashboard:my-xi'

/** Re-validate whatever came out of localStorage; never trust its shape. */
function hydrate(raw) {
  const fallback = { formation: DEFAULT_FORMATION, squad: emptySquad() }
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
    return { formation, squad }
  } catch {
    return fallback
  }
}

/** My XI squad state, persisted across refreshes. */
export function useSquad() {
  const [state, setState] = useState(() => hydrate(localStorage.getItem(STORAGE_KEY)))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const setFormation = useCallback((formation) => {
    setState((s) => ({ ...s, formation }))
  }, [])

  const setSlot = useCallback((pos, index, playerId) => {
    setState((s) => {
      const squad = { ...s.squad, [pos]: [...s.squad[pos]] }
      squad[pos][index] = playerId
      return { ...s, squad }
    })
  }, [])

  const clearSlot = useCallback((pos, index) => {
    setState((s) => {
      const squad = { ...s.squad, [pos]: [...s.squad[pos]] }
      squad[pos][index] = null
      return { ...s, squad }
    })
  }, [])

  /** Swap two entries within a position — how bench/start changes happen. */
  const swapSlots = useCallback((pos, a, b) => {
    setState((s) => {
      const list = [...s.squad[pos]]
      ;[list[a], list[b]] = [list[b], list[a]]
      return { ...s, squad: { ...s.squad, [pos]: list } }
    })
  }, [])

  const reset = useCallback(() => {
    setState({ formation: DEFAULT_FORMATION, squad: emptySquad() })
  }, [])

  /** Replace the whole squad at once — used when importing a shared link. */
  const replaceAll = useCallback((next) => {
    setState({
      formation: FORMATIONS.includes(next.formation)
        ? next.formation
        : DEFAULT_FORMATION,
      squad: {
        1: [...next.squad[1]],
        2: [...next.squad[2]],
        3: [...next.squad[3]],
        4: [...next.squad[4]],
      },
    })
  }, [])

  return {
    formation: state.formation,
    squad: state.squad,
    setFormation,
    setSlot,
    clearSlot,
    swapSlots,
    reset,
    replaceAll,
  }
}
