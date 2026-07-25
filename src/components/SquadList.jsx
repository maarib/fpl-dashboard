import { teamKitUrl } from '../lib/images'
import { statText } from '../lib/cardStat'

const GROUPS = [
  { pos: 1, label: 'Goalkeepers' },
  { pos: 2, label: 'Defenders' },
  { pos: 3, label: 'Midfielders' },
  { pos: 4, label: 'Forwards' },
]

function Row({ entry, metric, fixtures, teamsById, fromEvent, onRemove, onAdd }) {
  if (!entry.player) {
    return (
      <button type="button" className="srow srow--empty" onClick={onAdd}>
        <span className="srow__main">
          <span className="srow__name">Empty slot — add a player</span>
        </span>
      </button>
    )
  }

  const { player, team, isGoalkeeper, isBench, isCaptain, isViceCaptain } = entry
  const kit = teamKitUrl(team, isGoalkeeper)

  return (
    <div className="srow">
      {kit && <img className="srow__kit" src={kit} alt="" loading="lazy" />}
      <span className="srow__main">
        <span className="srow__name">
          {player.web_name}
          {isCaptain ? ' (C)' : ''}
          {isViceCaptain ? ' (V)' : ''}
        </span>
        <span className="srow__sub">
          {team?.short_name} · {isBench ? 'Bench' : 'Starting'}
        </span>
      </span>
      <span className="srow__stat">
        {statText({ metric, player, fixtures, teamsById, fromEvent })}
      </span>
      {onRemove && (
        <button
          type="button"
          className="srow__action"
          aria-label={`Remove ${player.web_name}`}
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </div>
  )
}

/**
 * List counterpart to the pitch, grouped by position. Takes the same entry
 * shape both modes already build, so it stays in step with the pitch.
 */
export default function SquadList({
  entries,
  metric,
  fixtures,
  teamsById,
  fromEvent,
}) {
  return (
    <div className="squad-list">
      {GROUPS.map(({ pos, label }) => {
        const group = entries.filter((e) => e.pos === pos)
        if (group.length === 0) return null
        return (
          <div className="squad-list__group" key={pos}>
            <div className="squad-list__head">
              <span>{label}</span>
              <span>{group.filter((e) => e.player && !e.isBench).length} starting</span>
            </div>
            <div className="squad-list__rows">
              {group.map((entry, index) => (
                <Row
                  key={entry.player?.id ?? `empty-${pos}-${index}`}
                  entry={entry}
                  metric={metric}
                  fixtures={fixtures}
                  teamsById={teamsById}
                  fromEvent={fromEvent}
                  onRemove={entry.onRemove}
                  onAdd={entry.onAdd}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
