import { useState } from 'react'
import { playerPhotoUrl } from '../lib/images'

/**
 * Player mugshot from the PL CDN, falling back to initials when the photo is
 * missing (new signings often have no asset for a week or two).
 */
export default function PlayerPhoto({ player, className = '' }) {
  const [failedCode, setFailedCode] = useState(null)
  const src = playerPhotoUrl(player)
  const broken = !src || failedCode === player?.code

  if (broken) {
    const initials = (player?.web_name ?? '?')
      .split(/[\s-]/)
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

    return (
      <span className={`photo photo--fallback ${className}`} aria-hidden="true">
        {initials}
      </span>
    )
  }

  return (
    <img
      className={`photo ${className}`}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailedCode(player.code)}
    />
  )
}
