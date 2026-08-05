import { useEffect, useState } from 'react'
import { playerPhotoUrl } from '../lib/images'

/**
 * The CDN stocks 250x250 for most players but not all — roughly one in six of
 * the top scorers 403 at that size while existing at 110x140.
 *
 * An `onError` handler on the rendered <img> is not a reliable way to detect
 * this: with loading="lazy" the element can sit at complete=false and never
 * fire the event at all. So we probe with a detached Image (which does report
 * failure reliably) and only render a URL we know resolves. Results are cached
 * per player code for the life of the page, so each photo is probed once and
 * the subsequent real load is a cache hit.
 */
const RESOLVED = new Map() // code -> url | null
const PENDING = new Map() // code -> Promise

const probe = (url) =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })

async function resolveFirstAvailable(player, sizes) {
  for (const size of sizes) {
    const url = playerPhotoUrl(player, size)
    if (url && (await probe(url))) return url
  }
  return null
}

export function usePlayerPhoto(player, sizes = ['250x250', '110x140']) {
  const code = player?.code
  const [, forceRender] = useState(0)

  useEffect(() => {
    if (!code || RESOLVED.has(code)) return
    let cancelled = false

    let pending = PENDING.get(code)
    if (!pending) {
      pending = resolveFirstAvailable(player, sizes)
      PENDING.set(code, pending)
    }

    pending.then((url) => {
      RESOLVED.set(code, url)
      PENDING.delete(code)
      if (!cancelled) forceRender((n) => n + 1)
    })

    return () => {
      cancelled = true
    }
    // `sizes` is a stable literal per call site; keying on code is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return { url: RESOLVED.get(code) ?? null, ready: RESOLVED.has(code) }
}
