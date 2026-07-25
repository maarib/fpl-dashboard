const CDN = 'https://resources.premierleague.com/premierleague'

/** Player mugshot. Uses player.code (the PL asset id), not player.id. */
export function playerPhotoUrl(player) {
  if (!player?.code) return null
  return `${CDN}/photos/players/110x140/p${player.code}.png`
}

/** Club badge. Uses team.code (the PL asset id), NOT team.id. */
export function teamBadgeUrl(team) {
  if (!team?.code) return null
  return `${CDN}/badges/50/t${team.code}.png`
}
