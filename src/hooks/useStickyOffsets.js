import { useEffect } from 'react'

/**
 * Publishes the height of the sticky chrome as CSS variables, so anything that
 * has to sit below it can offset itself in CSS.
 *
 * These cannot be constants. The top bar wraps to two rows below 720px, and
 * the filter row rewraps at practically every width and changes height per
 * view — a hardcoded offset would leave the table header either overlapping
 * the filters or floating below them.
 *
 * Observing the body rather than the two elements directly means this also
 * survives switching tabs, where the filter row is unmounted and a different
 * one takes its place.
 */
export function useStickyOffsets() {
  useEffect(() => {
    const root = document.documentElement

    const measure = () => {
      for (const [selector, prop] of [
        ['.topbar', '--topbar-h'],
        ['.filters', '--filters-h'],
      ]) {
        const el = document.querySelector(selector)
        const next = `${Math.round(el?.getBoundingClientRect().height ?? 0)}px`
        // Only write on change: a ResizeObserver that always writes can drive
        // itself in a loop.
        if (root.style.getPropertyValue(prop) !== next) {
          root.style.setProperty(prop, next)
        }
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
}
