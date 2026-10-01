import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_FORMATION,
  FORMATIONS,
  SQUAD_SHAPE,
  emptySquad,
  startingIds,
} from '../lib/squad'

const STORAGE_KEY = 'fpl-dashboard:my-xi'

/** The chips that snapshot the squad so they can be committed or reverted. */
const CHIPS = ['wildcard', 'freehit']
const asId = (v) => (Number.isInteger(v) ? v : null)

/** Rebuild a valid squad shape from untrusted data; unknown entries drop to null. */
function coerceSquad(raw) {
  const squad = emptySquad()
  for (const pos of [1, 2, 3, 4]) {
    const saved = raw?.[pos]
    if (!Array.isArray(saved)) continue
    for (let i = 0; i < SQUAD_SHAPE[pos]; i += 1) {
      squad[pos][i] = asId(saved[i])
    }
  }
  return squad
}

/** A snapshot of the whole squad, taken when a chip is played. */
function cloneState(s) {
  return {
    formation: s.formation,
    squad: coerceSquad(s.squad),
    captain: s.captain,
    viceCaptain: s.viceCaptain,
  }
}

/** Re-validate whatever came out of localStorage; never trust its shape. */
function hydrate(raw) {
  const fallback = {
    formation: DEFAULT_FORMATION,
    squad: emptySquad(),
    captain: null,
    viceCaptain: null,
    chip: null,
    backup: null,
  }
  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw)
    const formation = FORMATIONS.includes(parsed?.formation)
      ? parsed.formation
      : DEFAULT_FORMATION

    const chip = CHIPS.includes(parsed?.chip) ? parsed.chip : null
    const b = chip ? parsed?.backup : null
    const backup = b
      ? {
          formation: FORMATIONS.includes(b.formation) ? b.formation : DEFAULT_FORMATION,
          squad: coerceSquad(b.squad),
          captain: asId(b.captain),
          viceCaptain: asId(b.viceCaptain),
        }
      : null

    return sanitize({
      formation,
      squad: coerceSquad(parsed?.squad),
      captain: asId(parsed?.captain),
      viceCaptain: asId(parsed?.viceCaptain),
      chip,
      backup,
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
      chip: null,
      backup: null,
    })
  }, [])

  /**
   * Chips. Playing one snapshots the whole squad so the move can be undone:
   * Wildcard is a permanent rebuild (commit keeps it), Free Hit is a one-week
   * team (revert restores the saved squad). Only one chip is active at a time.
   */
  const activateChip = useCallback((chip) => {
    setState((s) => (s.chip ? s : { ...s, chip, backup: cloneState(s) }))
  }, [])

  /** Discard the chip's changes and restore the pre-chip squad. */
  const revertChip = useCallback(() => {
    setState((s) =>
      s.backup
        ? sanitize({ ...s.backup, chip: null, backup: null })
        : { ...s, chip: null, backup: null },
    )
  }, [])

  /** Keep the current squad and clear the chip (commit). */
  const endChip = useCallback(() => {
    setState((s) => ({ ...s, chip: null, backup: null }))
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
    chip: state.chip,
    setFormation,
    setSlot,
    clearSlot,
    swapSlots,
    reset,
    replaceAll,
    setCaptain,
    setViceCaptain,
    activateChip,
    revertChip,
    endChip,
  }
}
