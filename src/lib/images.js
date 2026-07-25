const CDN = 'https://resources.premierleague.com/premierleague'

/**
 * Player mugshot. Uses player.code (the PL asset id), not player.id.
 * `size` is a CDN directory: '110x140' for table rows, '250x250' for the
 * large photo-forward pitch cards.
 */
export function playerPhotoUrl(player, size = '110x140') {
  if (!player?.code) return null
  return `${CDN}/photos/players/${size}/p${player.code}.png`
}

/** Club badge. Uses team.code (the PL asset id), NOT team.id. */
export function teamBadgeUrl(team, size = 50) {
  if (!team?.code) return null
  return `${CDN}/badges/${size}/t${team.code}.png`
}
