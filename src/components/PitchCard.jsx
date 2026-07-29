import { useState } from 'react'
import { teamKitUrl } from '../lib/images'
import { statText } from '../lib/cardStat'
import CardMenu from './CardMenu'

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
  menuItems,
  menuOpen,
  isSwapTarget,
  swapPending,
}) {
  const [kitFailed, setKitFailed] = useState(false)
  const kit = teamKitUrl(team, isGoalkeeper)


  return (
    /* A div with a button role rather than a real <button>: the remove
       control is a button and nesting one inside another is invalid HTML,
       which React flags and assistive tech handles unpredictably. */
    <div
      className={[
        'fcard',
        onSelect ? 'fcard--interactive' : '',
        // Valid destinations are highlighted while a swap is pending, so the
        // user is not left guessing which cards will accept the move.
        isSwapTarget ? 'fcard--target' : '',
        swapPending && !isSwapTarget && !selected ? 'fcard--dimmed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
      title={`${player.first_name} ${player.second_name} — ${team?.name ?? ''}`}
      aria-haspopup={menuItems ? 'menu' : undefined}
      aria-expanded={menuItems ? Boolean(menuOpen) : undefined}
      style={selected ? { outline: '3px solid var(--focus-ring)', outlineOffset: 2, borderRadius: 10 } : undefined}
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

      {menuOpen && menuItems && (
        <CardMenu
          items={menuItems}
          onClose={menuOpen.close}
          label={`Actions for ${player.web_name}`}
        />
      )}
    </div>
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
