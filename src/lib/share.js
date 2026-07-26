import { FORMATIONS, SQUAD_SHAPE, emptySquad } from './squad'

/**
 * Squad sharing via the URL, with no backend.
 *
 * A squad is 15 player ids and a formation, which is small enough to carry in
 * a link. That keeps sharing independent of the accounts epic (#12) — it works
 * signed out, on a static host, and the link contains nothing but public ids.
 *
 * Format: `v1.<formation>.<ids>` where ids are joined with `-` in fixed
 * position order (2 GK, 5 DEF, 5 MID, 3 FWD). Empty slots encode as `0`, so
 * the position of every id is implied and needs no separators per group.
 */
const VERSION = 'v1'
export const SHARE_PARAM = 'squad'

const ORDER = [1, 2, 3, 4]

export function encodeSquad({ formation, squad }) {
  const ids = ORDER.flatMap((pos) =>
    Array.from({ length: SQUAD_SHAPE[pos] }, (_, i) => squad[pos][i] ?? 0),
  )
  return `${VERSION}.${formation}.${ids.join('-')}`
}

/**
 * Parse a shared squad. Returns null for anything malformed — this is
 * attacker-controllable input, so every field is checked rather than trusted.
 */
export function decodeSquad(raw) {
  if (typeof raw !== 'string') return null

  const parts = raw.split('.')
  if (parts.length !== 3) return null

  const [version, formation, idList] = parts
  if (version !== VERSION) return null
  if (!FORMATIONS.includes(formation)) return null

  const ids = idList.split('-').map((n) => Number.parseInt(n, 10))
  const expected = ORDER.reduce((total, pos) => total + SQUAD_SHAPE[pos], 0)
  if (ids.length !== expected) return null
  if (ids.some((id) => !Number.isInteger(id) || id < 0)) return null

  const squad = emptySquad()
  let cursor = 0
  for (const pos of ORDER) {
    for (let i = 0; i < SQUAD_SHAPE[pos]; i += 1) {
      const id = ids[cursor++]
      squad[pos][i] = id === 0 ? null : id
    }
  }

  return { formation, squad }
}

/** Absolute link to the current page carrying a squad. */
export function shareUrl(state) {
  const url = new URL(window.location.href)
  url.searchParams.set(SHARE_PARAM, encodeSquad(state))
  return url.toString()
}

/** Read a shared squad out of the current URL, if there is a valid one. */
export function readSharedSquad() {
  const raw = new URLSearchParams(window.location.search).get(SHARE_PARAM)
  return raw ? decodeSquad(raw) : null
}

/** Drop the share param without adding a history entry. */
export function clearSharedSquad() {
  const url = new URL(window.location.href)
  url.searchParams.delete(SHARE_PARAM)
  window.history.replaceState({}, '', url)
}
