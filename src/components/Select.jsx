import { CaretDown, Check } from '@phosphor-icons/react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * A dropdown built on the ARIA listbox pattern, replacing the native select.
 *
 * The menu is portalled to the body and positioned from the trigger's rect
 * rather than absolutely positioned inside a wrapper. Several of these live in
 * scrolling panels — the player pool's filter row sits above an overflowing
 * list — and an in-flow menu gets clipped by the first ancestor with overflow
 * set. Fixed positioning sidesteps that entirely, at the cost of having to
 * close on scroll, which is what native selects do anyway.
 *
 * Values keep their type. A native select hands back a string no matter what
 * you put in, so call sites had to remember to coerce; here `onChange` is
 * called with the value the option was created from.
 *
 * Note the trade-off on touch: a native select opens the OS picker, which is
 * genuinely better with a thumb. This keeps the same custom menu everywhere
 * for consistency — worth revisiting if it feels wrong on a phone.
 */
export default function Select({
  value,
  onChange,
  options,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  id,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const typeahead = useRef({ query: '', timer: 0 })
  const generatedId = useId()
  const listId = `${id ?? generatedId}-listbox`

  const selectedIndex = options.findIndex((o) => Object.is(o.value, value))
  const selected = options[selectedIndex]

  const position = () => {
    const el = triggerRef.current
    if (el) setRect(el.getBoundingClientRect())
  }

  const openMenu = () => {
    position()
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  const closeMenu = ({ refocus = true } = {}) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  const commit = (index) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    closeMenu()
  }

  // Focus moves into the list so the arrow keys are unambiguous; the visually
  // active option is announced via aria-activedescendant rather than by moving
  // focus onto each one.
  useLayoutEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocPointer = (e) => {
      if (listRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      closeMenu({ refocus: false })
    }
    // Any scroll or resize invalidates the menu's position. Closing is both
    // simpler and less disorienting than chasing the trigger around.
    const onScrollOrResize = () => closeMenu({ refocus: false })
    document.addEventListener('pointerdown', onDocPointer, true)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('pointerdown', onDocPointer, true)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  const step = (from, delta) => {
    const n = options.length
    for (let i = 1; i <= n; i += 1) {
      const next = (from + delta * i + n * i) % n
      if (!options[next].disabled) return next
    }
    return from
  }

  const edge = (fromEnd) => {
    const order = fromEnd ? [...options.keys()].reverse() : [...options.keys()]
    return order.find((i) => !options[i].disabled) ?? 0
  }

  const onTriggerKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openMenu()
    }
  }

  const onListKey = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => step(i, 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => step(i, -1))
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(edge(false))
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(edge(true))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        commit(activeIndex)
        break
      case 'Escape':
        e.preventDefault()
        closeMenu()
        break
      case 'Tab':
        // Tabbing away commits nothing and closes, as a native select does.
        closeMenu({ refocus: false })
        break
      default: {
        if (e.key.length !== 1) return
        const t = typeahead.current
        window.clearTimeout(t.timer)
        t.query += e.key.toLowerCase()
        t.timer = window.setTimeout(() => {
          t.query = ''
        }, 500)
        const match = options.findIndex(
          (o) => !o.disabled && String(o.label).toLowerCase().startsWith(t.query),
        )
        if (match >= 0) setActiveIndex(match)
      }
    }
  }

  return (
    <>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`select__trigger ${className}`.trim()}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKey}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      >
        <span className="select__value">{selected?.label ?? ''}</span>
        <CaretDown className="select__chev" size={14} weight="bold" aria-hidden="true" />
      </button>

      {open &&
        rect &&
        createPortal(
          <ul
            id={listId}
            ref={listRef}
            className="select__menu"
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-activedescendant={`${listId}-opt-${activeIndex}`}
            onKeyDown={onListKey}
            style={{
              left: rect.left,
              width: rect.width,
              // Flip above the trigger when the space below cannot hold the
              // menu but the space above can.
              ...(window.innerHeight - rect.bottom < 200 && rect.top > 200
                ? { bottom: window.innerHeight - rect.top + 4 }
                : { top: rect.bottom + 4 }),
            }}
          >
            {options.map((option, i) => (
              <li
                key={String(option.value)}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === selectedIndex}
                aria-disabled={option.disabled || undefined}
                data-active={i === activeIndex}
                className="select__option"
                onMouseEnter={() => !option.disabled && setActiveIndex(i)}
                onClick={() => commit(i)}
              >
                <span className="select__option-label">{option.label}</span>
                {i === selectedIndex && (
                  <Check className="select__tick" size={14} weight="bold" aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  )
}
