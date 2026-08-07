import { useEffect } from 'react'

/**
 * Holds the page still while a modal is open, so dismissing it returns you
 * where you were rather than somewhere further down the page.
 *
 * Counted rather than a plain set/restore: if two modals are ever open at
 * once, the first to close would otherwise hand scrolling back while the
 * second is still up. The original value is captured once, when the count
 * goes from zero, and put back only when it returns to zero.
 */
let locks = 0
let previousOverflow = ''

export function useScrollLock() {
  useEffect(() => {
    if (locks === 0) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    locks += 1

    return () => {
      locks -= 1
      if (locks === 0) document.body.style.overflow = previousOverflow
    }
  }, [])
}
