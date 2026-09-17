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

/**
 * A UEFA-style "how he scored" breakdown of a player's season points, derived
 * from their totals under the standard FPL scoring rules. The event lines are
 * exact; whatever the shown events don't account for (appearances, defensive
 * contribution, goals conceded nuances) is reconciled into a final line so the
 * breakdown always sums to the real total.
 */
export function pointsBreakdown(player, posShort) {
  const goalPts = { GKP: 6, DEF: 6, MID: 5, FWD: 4 }[posShort] ?? 4
  const csPts = { GKP: 4, DEF: 4, MID: 1, FWD: 0 }[posShort] ?? 0
  const n = (v) => Number(v) || 0

  const lines = []
  const add = (count, unit, label, points) => {
    if (count) lines.push({ label: `${count} ${label}`, points, unit })
  }

  add(n(player.goals_scored), 'goal', n(player.goals_scored) === 1 ? 'goal scored' : 'goals scored', n(player.goals_scored) * goalPts)
  add(n(player.assists), 'assist', n(player.assists) === 1 ? 'assist' : 'assists', n(player.assists) * 3)
  if (csPts) add(n(player.clean_sheets), 'cs', n(player.clean_sheets) === 1 ? 'clean sheet' : 'clean sheets', n(player.clean_sheets) * csPts)
  if (n(player.saves) >= 3) add(n(player.saves), 'save', 'saves', Math.floor(n(player.saves) / 3))
  add(n(player.penalties_saved), 'ps', 'penalties saved', n(player.penalties_saved) * 5)
  if (player.bonus) lines.push({ label: 'Bonus points', points: n(player.bonus) })
  add(n(player.yellow_cards), 'yc', n(player.yellow_cards) === 1 ? 'yellow card' : 'yellow cards', -n(player.yellow_cards))
  add(n(player.red_cards), 'rc', n(player.red_cards) === 1 ? 'red card' : 'red cards', -n(player.red_cards) * 3)
  add(n(player.own_goals), 'og', n(player.own_goals) === 1 ? 'own goal' : 'own goals', -n(player.own_goals) * 2)
  add(n(player.penalties_missed), 'pm', 'penalties missed', -n(player.penalties_missed) * 2)
  if (csPts) add(n(player.goals_conceded), 'gc', 'goals conceded', -Math.floor(n(player.goals_conceded) / 2))

  const accounted = lines.reduce((s, l) => s + l.points, 0)
  const rest = n(player.total_points) - accounted
  if (rest !== 0 || lines.length === 0) {
    lines.push({ label: 'Appearances & other', points: rest })
  }
  return lines
}
