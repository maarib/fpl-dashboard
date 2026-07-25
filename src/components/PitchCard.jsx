import { usePlayerPhoto } from '../hooks/usePlayerPhoto'
import { formatPrice, nextFixtureForTeam } from '../lib/fpl'
import TeamBadge from './TeamBadge'

/** The stat shown in the card's bottom bar, per the pitch-wide toggle. */
function statText({ metric, player, fixtures, teamsById, fromEvent }) {
  switch (metric) {
    case 'points':
      return `${player.total_points} pts`
    case 'form':
      return `Form ${player.form}`
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

/** Large photo-forward card: photo, badge accent, name bar, stat bar. */
export default function PitchCard({
  player,
  team,
  metric,
  fixtures,
  teamsById,
  fromEvent,
  isCaptain,
  isViceCaptain,
  onRemove,
  onSelect,
}) {
  const { url: src, ready } = usePlayerPhoto(player)

  const initials = (player.web_name ?? '?')
    .split(/[\s-]/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className={`fcard${onSelect ? ' fcard--interactive' : ''}`}
      onClick={onSelect}
      title={`${player.first_name} ${player.second_name} — ${team?.name ?? ''}`}
    >
      <div className="fcard__frame">
        {src && (
          <img
            className="fcard__photo"
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
          />
        )}
        {ready && !src && (
          <span className="fcard__photo--fallback" aria-hidden="true">
            {initials}
          </span>
        )}

        <TeamBadge team={team} className="fcard__badge" size={100} />

        {isCaptain && <span className="fcard__armband">C</span>}
        {isViceCaptain && (
          <span className="fcard__armband fcard__armband--vice">V</span>
        )}

        {onRemove && (
          <button
            type="button"
            className="fcard__remove"
            aria-label={`Remove ${player.web_name}`}
            onClick={(event) => {
              event.stopPropagation()
              onRemove()
            }}
          >
            ×
          </button>
        )}
      </div>

      <div className="fcard__name">{player.web_name}</div>
      <div className="fcard__stat">
        {statText({ metric, player, fixtures, teamsById, fromEvent })}
      </div>
    </div>
  )
}

/** Dashed placeholder for an unfilled squad slot. */
export function EmptyCard({ positionLabel, onClick }) {
  return (
    <button type="button" className="fcard fcard--empty" onClick={onClick}>
      <span className="fcard__plus">+</span>
      <span className="fcard__pos">{positionLabel}</span>
    </button>
  )
}
