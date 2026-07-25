/** Squad-building rules for the My XI planner. */

/** Squad quota per element_type: 2 GK, 5 DEF, 5 MID, 3 FWD. */
export const SQUAD_SHAPE = { 1: 2, 2: 5, 3: 5, 4: 3 }

/** Budget in tenths of a million, matching now_cost. */
export const BUDGET = 1000

export const MAX_PER_CLUB = 3

/** Legal FPL formations, as DEF-MID-FWD. */
export const FORMATIONS = [
  '3-4-3',
  '3-5-2',
  '4-3-3',
  '4-4-2',
  '4-5-1',
  '5-2-3',
  '5-3-2',
  '5-4-1',
]

export const DEFAULT_FORMATION = '4-4-2'

/** Starters per element_type for a formation string. */
export function parseFormation(formation) {
  const [def, mid, fwd] = formation.split('-').map(Number)
  return { 1: 1, 2: def, 3: mid, 4: fwd }
}

/**
 * A squad is a map of element_type -> fixed-length array of player ids (or
 * null). Order is meaningful: the first N of each position start, where N
 * comes from the formation, and the remainder sit on the bench. Swapping a
 * bench player with a starter is just a swap within that position's array.
 */
export const emptySquad = () => ({
  1: Array(SQUAD_SHAPE[1]).fill(null),
  2: Array(SQUAD_SHAPE[2]).fill(null),
  3: Array(SQUAD_SHAPE[3]).fill(null),
  4: Array(SQUAD_SHAPE[4]).fill(null),
})

export const squadIds = (squad) =>
  Object.values(squad).flat().filter(Boolean)

export const squadCount = (squad) => squadIds(squad).length

/** Total cost in tenths. */
export function squadCost(squad, playersById) {
  return squadIds(squad).reduce(
    (total, id) => total + (playersById.get(id)?.now_cost ?? 0),
    0,
  )
}

/** How many players are already picked from each club. */
export function clubCounts(squad, playersById) {
  const counts = new Map()
  for (const id of squadIds(squad)) {
    const teamId = playersById.get(id)?.team
    if (teamId != null) counts.set(teamId, (counts.get(teamId) ?? 0) + 1)
  }
  return counts
}

/**
 * Why a player can't go into a given slot, or null if they can.
 * `slot` is { pos, index }.
 */
export function rejectionReason(player, squad, playersById, slot) {
  if (player.element_type !== slot.pos) return 'Wrong position'
  if (squadIds(squad).includes(player.id)) return 'Already in squad'

  const outgoing = squad[slot.pos][slot.index]
  const outgoingCost = outgoing ? (playersById.get(outgoing)?.now_cost ?? 0) : 0
  const spend = squadCost(squad, playersById) - outgoingCost + player.now_cost
  if (spend > BUDGET) return 'Over budget'

  const counts = clubCounts(squad, playersById)
  const outgoingTeam = outgoing ? playersById.get(outgoing)?.team : null
  const already =
    (counts.get(player.team) ?? 0) - (outgoingTeam === player.team ? 1 : 0)
  if (already >= MAX_PER_CLUB) return `Max ${MAX_PER_CLUB} per club`

  return null
}

/** Which formations the current squad could legally switch to. */
export function availableFormations(squad) {
  const filled = (pos) => squad[pos].filter(Boolean).length
  return FORMATIONS.filter((formation) => {
    const need = parseFormation(formation)
    return [1, 2, 3, 4].every((pos) => filled(pos) >= need[pos])
  })
}

/** Split a position's array into starters and bench for a formation. */
export function splitByFormation(squad, formation) {
  const need = parseFormation(formation)
  const starters = {}
  const bench = {}
  for (const pos of [1, 2, 3, 4]) {
    starters[pos] = squad[pos].slice(0, need[pos])
    bench[pos] = squad[pos].slice(need[pos])
  }
  return { starters, bench }
}

/** Metrics the per-card stat toggle can display. */
export const STAT_METRICS = [
  { id: 'fixture', label: 'Next Opponent' },
  { id: 'points', label: 'Total Pts' },
  { id: 'form', label: 'Form' },
  { id: 'price', label: 'Price' },
]
