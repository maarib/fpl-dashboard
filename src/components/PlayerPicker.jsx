import { useMemo, useRef, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import { useModalFocus } from '../hooks/useModalFocus'
import { useScrollLock } from '../hooks/useScrollLock'
import { formatPrice } from '../lib/fpl'
import { rejectionReason } from '../lib/squad'
import PlayerPhoto from './PlayerPhoto'

/**
 * Slide-over list of candidates for one squad slot. Players that would break
 * a rule stay visible but disabled, with the reason shown — more useful than
 * hiding them, since it explains why an obvious pick isn't allowed.
 */
export default function PlayerPicker({ slot, squad, onPick, onClose }) {
  const { players, positionsById, teamsById, playersById } = useFpl()
  const [search, setSearch] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const panelRef = useRef(null)
  // This dialog exists to be typed into, so focus lands on the search field
  // rather than the close button.
  const searchRef = useRef(null)

  useScrollLock()
  useModalFocus(panelRef, onClose, searchRef)

  const position = positionsById.get(slot.pos)

  const candidates = useMemo(() => {
    const query = search.trim().toLowerCase()
    const cap = maxPrice ? Number(maxPrice) * 10 : Infinity

    return players
      .filter((p) => p.element_type === slot.pos)
      .filter((p) => p.now_cost <= cap)
      .filter((p) => {
        if (!query) return true
        return `${p.first_name} ${p.second_name} ${p.web_name}`
          .toLowerCase()
          .includes(query)
      })
      .map((p) => ({ player: p, reason: rejectionReason(p, squad, playersById, slot) }))
      .sort((a, b) => {
        // Selectable players first, then by points.
        if (!a.reason !== !b.reason) return a.reason ? 1 : -1
        return b.player.total_points - a.player.total_points
      })
  }, [players, slot, squad, playersById, search, maxPrice])

  return (
    <div
      className="picker-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="picker"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Choose a ${position?.singular_name}`}
      >
        <div className="picker__head">
          <h3>Choose a {position?.singular_name}</h3>
          <button type="button" className="picker__close" onClick={onClose} aria-label="Close">
            ×
          </button>
          <div className="picker__filters">
            {/* Focused by useModalFocus rather than autoFocus, so the two
                cannot race for it. */}
            <input
              className="input"
              type="search"
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              ref={searchRef}
            />
            <input
              className="input"
              type="number"
              step="0.1"
              min="0"
              placeholder="Max £m"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              style={{ maxWidth: 110 }}
            />
          </div>
        </div>

        <div className="picker__list">
          {candidates.map(({ player, reason }) => (
            <button
              key={player.id}
              type="button"
              className="picker__row"
              disabled={Boolean(reason)}
              onClick={() => onPick(player)}
            >
              <PlayerPhoto player={player} />
              <span className="picker__row-main">
                <span className="picker__row-name">{player.web_name}</span>
                <span className="picker__row-sub">
                  {teamsById.get(player.team)?.short_name}
                  {reason ? <> · <span className="picker__reason">{reason}</span></> : null}
                </span>
              </span>
              <span className="picker__row-stats">
                <span className="picker__row-price">{formatPrice(player.now_cost)}</span>
                <span className="picker__row-pts">{player.total_points} pts</span>
              </span>
            </button>
          ))}

          {candidates.length === 0 && <p className="empty">No players match.</p>}
        </div>
      </aside>
    </div>
  )
}
