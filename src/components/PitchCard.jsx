import { useState } from 'react'
import { teamKitUrl } from '../lib/images'
import { statText } from '../lib/cardStat'

/**
 * Squad card in the official pitch-view idiom: playing kit on a translucent
 * tile, then a white name bar and a grey stat bar forming one rounded block.
 */
export default function PitchCard({
  player,
  team,
  isGoalkeeper,
  metric,
  fixtures,
  teamsById,
  fromEvent,
  isCaptain,
  isViceCaptain,
  onRemove,
  onSelect,
  selected,
}) {
  const [kitFailed, setKitFailed] = useState(false)
  const kit = teamKitUrl(team, isGoalkeeper)

  const Tag = onSelect ? 'button' : 'div'

  return (
    <Tag
      type={onSelect ? 'button' : undefined}
      className={`fcard${onSelect ? ' fcard--interactive' : ''}`}
      onClick={onSelect}
      title={`${player.first_name} ${player.second_name} — ${team?.name ?? ''}`}
      style={selected ? { outline: '3px solid #04f5ff', outlineOffset: 2, borderRadius: 10 } : undefined}
    >
      <div className="fcard__tile">
        {kit && !kitFailed ? (
          <img
            className="fcard__kit"
            src={kit}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setKitFailed(true)}
          />
        ) : (
          <span className="fcard__kit--fallback">{team?.short_name ?? '—'}</span>
        )}

        <span className="fcard__status" aria-hidden="true">
          ⌄
        </span>

        {isCaptain && <span className="fcard__armband">C</span>}
        {isViceCaptain && (
          <span className="fcard__armband fcard__armband--vice">VC</span>
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

      <div className="fcard__labels">
        <div className="fcard__name">{player.web_name}</div>
        <div className="fcard__stat">
          {statText({ metric, player, fixtures, teamsById, fromEvent })}
        </div>
      </div>
    </Tag>
  )
}

/** Dashed placeholder for an unfilled squad slot. */
export function EmptyCard({ positionLabel, onClick }) {
  return (
    <button type="button" className="fcard fcard--empty" onClick={onClick}>
      <div className="fcard__tile">
        <span className="fcard__plus">+</span>
      </div>
      <div className="fcard__labels">
        <div className="fcard__name">{positionLabel}</div>
        <div className="fcard__stat">Add player</div>
      </div>
    </button>
  )
}
