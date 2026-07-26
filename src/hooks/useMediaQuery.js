import { useEffect, useState } from 'react'

/**
 * Subscribe to a media query from JS.
 *
 * The pool's docked/undocked state has to be readable by the component, not
 * just by CSS — the toggle button changes its label and behaviour depending on
 * whether there is room to dock. Driving it from one source avoids the layout
 * and the control disagreeing at the breakpoint.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia?.(query).matches ?? false,
  )

  useEffect(() => {
    const list = window.matchMedia(query)
    // Re-read the list rather than trusting the event payload, and listen to
    // `resize` as well as `change`. A missed `change` event would leave the
    // control disagreeing with the layout — and the failure mode there is the
    // pool being unreachable, which is the bug this whole feature fixes.
    const sync = () => setMatches(list.matches)

    sync()
    list.addEventListener('change', sync)
    window.addEventListener('resize', sync)

    // A ResizeObserver on the root element catches viewport changes that never
    // surface as `change` or `resize` events — programmatic resizes and some
    // embedded/preview contexts. Without it the cached value can go stale, and
    // a stale value here strands the user with no reachable pool.
    const observer = new ResizeObserver(sync)
    observer.observe(document.documentElement)

    return () => {
      list.removeEventListener('change', sync)
      window.removeEventListener('resize', sync)
      observer.disconnect()
    }
  }, [query])

  return matches
}
