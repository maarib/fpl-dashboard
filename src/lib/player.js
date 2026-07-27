/** Presentation helpers for a single player. */

/**
 * FPL status codes. Availability is the one thing on a player that can change
 * a decision outright, and until now the app showed it nowhere — an injured
 * player looked identical to a fit one.
 */
const STATUS = {
  a: { label: 'Available', tone: 'ok' },
  d: { label: 'Doubtful', tone: 'warn' },
  i: { label: 'Injured', tone: 'bad' },
  s: { label: 'Suspended', tone: 'bad' },
  u: { label: 'Unavailable', tone: 'bad' },
  n: { label: 'Ineligible', tone: 'bad' },
}

export const availability = (player) => ({
  ...(STATUS[player.status] ?? { label: 'Unknown', tone: 'warn' }),
  news: player.news?.trim() || null,
  chance: player.chance_of_playing_next_round,
  isConcern: player.status !== 'a',
})

/**
 * Rank within position, which is far more useful than the overall rank —
 * being the 4th best defender for points per game means something; being 4th
 * of all 558 players mixes goalkeepers in with forwards.
 */
export function positionRanks(player, positionLabel, positionTotal) {
  const entries = [
    { key: 'points_per_game_rank_type', label: 'Points per game' },
    { key: 'form_rank_type', label: 'Form' },
    { key: 'ict_index_rank_type', label: 'ICT index' },
    { key: 'selected_rank_type', label: 'Ownership' },
    { key: 'now_cost_rank_type', label: 'Price' },
  ]

  return entries
    .filter((e) => Number.isInteger(player[e.key]) && player[e.key] > 0)
    .map((e) => ({
      label: e.label,
      rank: player[e.key],
      total: positionTotal,
      positionLabel,
      // Top decile is worth calling out; it is the quick read on a stat block.
      strong: positionTotal > 0 && player[e.key] <= Math.max(3, positionTotal * 0.1),
    }))
}

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
export { ordinal }

/** Set-piece duties, which the official site buries and FPL managers live on. */
export function setPieces(player) {
  const duties = [
    { label: 'Penalties', order: player.penalties_order },
    { label: 'Direct free kicks', order: player.direct_freekicks_order },
    { label: 'Corners & indirect', order: player.corners_and_indirect_freekicks_order },
  ]
  return duties.filter((d) => Number.isInteger(d.order) && d.order > 0)
}

/** Season-long price movement, in tenths like now_cost. */
export const priceChange = (player) => player.cost_change_start ?? 0
