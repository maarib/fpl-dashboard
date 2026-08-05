import { useState } from 'react'
import { teamKitUrl } from '../lib/images'
import { statText } from '../lib/cardStat'
import { usePlayerPhoto } from '../hooks/usePlayerPhoto'
import CardMenu from './CardMenu'

/**
 * Squad card, photo-forward: a cut-out player photo bottom-anchored on a
 * coloured tile, then a white name bar and a coloured stat bar, the three
 * forming one rounded block.
 *
 * Photos come from the probe hook rather than a plain <img onError>, because
 * the CDN does not stock every player at every size and lazy-loaded images
 * often never fire the error event. Until the probe resolves — and for the
 * handful of players stocked at no size at all — the club kit stands in. Kits
 * exist for all 20 clubs, so that fallback never fails.
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
  positionLabel,
  benchOrder,
  onRemove,
  onSelect,
  selected,
  menuItems,
  menuOpen,
  isSwapTarget,
  swapPending,
}) {
  const [kitFailed, setKitFailed] = useState(false)
  const { url: photo } = usePlayerPhoto(player)
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
        selected ? 'fcard--selected' : '',
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
    >
      <div className="fcard__body">
        <div className="fcard__tile">
          {photo ? (
            <img className="fcard__photo" src={photo} alt="" decoding="async" />
          ) : kit && !kitFailed ? (
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

          {positionLabel && (
            <span className="fcard__pos">{positionLabel}</span>
          )}
        </div>

        <div className="fcard__name">{player.web_name}</div>
        <div className="fcard__stat">
          {statText({ metric, player, fixtures, teamsById, fromEvent })}
        </div>
      </div>

      {/* Badges sit outside the clipped body so they can overhang the card. */}
      <span className="fcard__status" aria-hidden="true">
        ⌄
      </span>

      {isCaptain && <span className="fcard__armband">C</span>}
      {isViceCaptain && (
        <span className="fcard__armband fcard__armband--vice">VC</span>
      )}

      {benchOrder != null && (
        <span className="fcard__order" aria-hidden="true">
          {benchOrder}
        </span>
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
      <div className="fcard__body">
        <div className="fcard__tile">
          <span className="fcard__plus">+</span>
        </div>
        <div className="fcard__name">{positionLabel}</div>
        <div className="fcard__stat">Add player</div>
      </div>
    </button>
  )
}
