/**
 * Primary club colours, keyed by the FPL three-letter short name.
 *
 * The bootstrap data has no team colour, so the club identity that carries the
 * redesign — the tinted avatar disc, the featured hero glow — comes from here.
 * Chosen for recognisability and to read as a disc behind a cut-out photo, not
 * to be an exact brand hex. Unknown clubs fall back to a warm neutral.
 */
const CLUB_COLORS = {
  ARS: '#ef0107',
  AVL: '#7a003c',
  BOU: '#da291c',
  BRE: '#e30613',
  BHA: '#0057b8',
  BUR: '#6c1d45',
  CHE: '#034694',
  CRY: '#1b458f',
  EVE: '#003399',
  FUL: '#1a1a1a',
  HUL: '#f5a12d',
  IPS: '#3a64a3',
  LEE: '#1d428a',
  LEI: '#003090',
  LIV: '#c8102e',
  MCI: '#6cabdd',
  MUN: '#da291c',
  NEW: '#1a1a1a',
  NFO: '#dd0000',
  SHU: '#ee2737',
  SOU: '#d71920',
  SUN: '#eb172b',
  TOT: '#132257',
  WHU: '#7a263a',
  WOL: '#fdb913',
}

const FALLBACK = '#6e6a62'

export function clubColor(shortName) {
  return CLUB_COLORS[shortName?.toUpperCase()] ?? FALLBACK
}
