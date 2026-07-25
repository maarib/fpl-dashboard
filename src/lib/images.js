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

const KIT_CDN = 'https://fantasy.premierleague.com/dist/img/shirts/standard'

/**
 * Playing kit, as used on the official pitch view. Keyed off team.code like
 * the badges; keepers get the `_1` variant. All 20 clubs have both variants
 * at 110 and 220, so unlike player photos this needs no size fallback.
 */
export function teamKitUrl(team, isGoalkeeper = false, size = 220) {
  if (!team?.code) return null
  return `${KIT_CDN}/shirt_${team.code}${isGoalkeeper ? '_1' : ''}-${size}.png`
}
