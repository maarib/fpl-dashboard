import { formatPrice, nextFixtureForTeam } from './fpl'

/**
 * The single metric shown on every squad card, driven by the stat dropdown.
 * Lives here rather than beside a component so the pitch and list views can
 * share it without breaking fast refresh.
 */
export function statText({ metric, player, fixtures, teamsById, fromEvent }) {
  switch (metric) {
    case 'points':
      return `${player.total_points} pts`
    case 'form':
      return player.form
    case 'price':
      return formatPrice(player.now_cost)
    case 'fixture':
    default: {
      const next = nextFixtureForTeam(fixtures, player.team, fromEvent)
      if (!next) return 'No fixture'
      const opponent = teamsById.get(next.opponentId)
      return `${opponent?.short_name ?? '?'} (${next.isHome ? 'H' : 'A'})`
    }
  }
}
