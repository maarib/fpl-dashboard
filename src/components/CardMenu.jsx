import { useEffect, useRef } from 'react'

/**
 * Actions for one squad card.
 *
 * Substituting, captaincy and (later) player detail all need somewhere to live
 * on a card. Giving them one menu rather than three bespoke gestures is what
 * makes them discoverable — the previous two-tap swap was explained only by a
 * sentence above the pitch, which nobody reads.
 */
export default function CardMenu({ items, onClose, label = 'Player actions' }) {
  const ref = useRef(null)

  useEffect(() => {
    // Focus the first enabled item so the menu is immediately operable by
    // keyboard, not just reachable.
    const first = ref.current?.querySelector('button:not(:disabled)')
    first?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

      event.preventDefault()
      const buttons = [...(ref.current?.querySelectorAll('button:not(:disabled)') ?? [])]
      if (buttons.length === 0) return
      const current = buttons.indexOf(document.activeElement)
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const next = (current + delta + buttons.length) % buttons.length
      buttons[next].focus()
    }

    const node = ref.current
    node?.addEventListener('keydown', onKey)
    return () => node?.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="cardmenu"
      ref={ref}
      role="menu"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={`cardmenu__item${item.danger ? ' cardmenu__item--danger' : ''}`}
          disabled={item.disabled}
          title={item.reason}
          onClick={() => {
            item.onSelect()
            onClose()
          }}
        >
          <span className="cardmenu__label">{item.label}</span>
          {/* Say why an action is unavailable rather than just greying it
              out — a disabled control with no explanation reads as broken. */}
          {item.disabled && item.reason && (
            <span className="cardmenu__reason">{item.reason}</span>
          )}
        </button>
      ))}
    </div>
  )
}
