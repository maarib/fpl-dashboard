import { useEffect } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * The keyboard half of a modal dialog: move focus in on open, keep Tab inside
 * it, close on Escape, and put focus back where it came from on close.
 *
 * `aria-modal="true"` describes the dialog to assistive tech but does nothing
 * to the Tab order, so the cycle has to be closed by hand — otherwise Tab
 * walks straight out into the page behind, which is still fully interactive.
 *
 * Restoring focus matters as much as trapping it: without it, dismissing the
 * dialog drops focus at the top of the document and a keyboard user loses
 * their place in whatever they opened it from.
 *
 * @param containerRef ref to the element with role="dialog"
 * @param onClose called on Escape
 */
export function useModalFocus(containerRef, onClose) {
  useEffect(() => {
    const previouslyFocused = document.activeElement
    const container = containerRef.current

    // The close button is first in the markup of both dialogs, so this lands
    // on it. Falling back to the container keeps focus inside even if a
    // dialog ever renders with nothing focusable in it.
    const first = container?.querySelector(FOCUSABLE)
    if (first) first.focus()
    else container?.focus?.()

    return () => previouslyFocused?.focus?.()
    // Mount/unmount only: re-running would steal focus mid-interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = containerRef.current?.querySelectorAll(FOCUSABLE)
      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [containerRef, onClose])
}
