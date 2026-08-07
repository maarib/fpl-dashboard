import { useRef } from 'react'
import { useModalFocus } from '../hooks/useModalFocus'
import { useScrollLock } from '../hooks/useScrollLock'
import PlayerPool from './PlayerPool'

/**
 * The player pool as an overlay, for screens with no room to dock it beside
 * the pitch. Its own component rather than a branch inside SquadBuilder so it
 * can hold the modal hooks — they cannot be called from inside a conditional.
 */
export default function PoolDrawer({ squad, onAdd, onRemove, onClose }) {
  const panelRef = useRef(null)

  useScrollLock()
  useModalFocus(panelRef, onClose)

  return (
    <div
      className="pool-drawer"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="pool-drawer__panel"
        id="player-pool"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Player selection"
      >
        <button
          type="button"
          className="pool-drawer__close"
          onClick={onClose}
          aria-label="Close player selection"
        >
          ×
        </button>
        <PlayerPool squad={squad} onAdd={onAdd} onRemove={onRemove} />
      </aside>
    </div>
  )
}
