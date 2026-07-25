import { useState } from 'react'
import { teamBadgeUrl } from '../lib/images'

/** Club badge from the PL CDN, falling back to the team's short name. */
export default function TeamBadge({ team, className = '' }) {
  const [failedCode, setFailedCode] = useState(null)
  const src = teamBadgeUrl(team)
  const broken = !src || failedCode === team?.code

  if (broken) {
    return (
      <span className={`badge badge--fallback ${className}`} title={team?.name}>
        {team?.short_name ?? '—'}
      </span>
    )
  }

  return (
    <img
      className={`badge ${className}`}
      src={src}
      alt={team.name}
      title={team.name}
      loading="lazy"
      decoding="async"
      onError={() => setFailedCode(team.code)}
    />
  )
}
