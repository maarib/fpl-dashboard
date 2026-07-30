/** Helpers for shaping raw FPL API data. */

/**
 * now_cost is in tenths of a million. The sign goes outside the currency
 * symbol — an overspent bank should read "-£17.0m", not "£-17.0m".
 */
export const formatPrice = (nowCost) =>
  `${nowCost < 0 ? '-' : ''}£${Math.abs(nowCost / 10).toFixed(1)}m`

export const toNumber = (value) => {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * The gameweek to treat as "now": the live one, else the next unfinished one,
 * else the first. During pre-season nothing is current, so this lands on GW1.
 */
export function resolveCurrentEvent(events = []) {
  return (
    events.find((e) => e.is_current) ??
    events.find((e) => e.is_next) ??
    events.find((e) => !e.finished) ??
    events[0] ??
    null
  )
}

/** Fixtures for `teamId` in a given gameweek — an array, since doubles exist. */
export function fixturesForTeamInEvent(fixtures, teamId, event) {
  return fixtures.filter(
    (f) => f.event === event && (f.team_h === teamId || f.team_a === teamId),
  )
}

/** Normalises a fixture into the row-team's point of view. */
export function fixtureFromTeamView(fixture, teamId) {
  const isHome = fixture.team_h === teamId
  return {
    opponentId: isHome ? fixture.team_a : fixture.team_h,
    isHome,
    difficulty: isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty,
    kickoffTime: fixture.kickoff_time,
  }
}

/** The soonest upcoming fixture for a team, from `fromEvent` onwards. */
export function nextFixtureForTeam(fixtures, teamId, fromEvent) {
  const upcoming = fixtures
    .filter(
      (f) =>
        f.event != null &&
        f.event >= fromEvent &&
        !f.finished &&
        (f.team_h === teamId || f.team_a === teamId),
    )
    .sort((a, b) => a.event - b.event)

  return upcoming[0] ? fixtureFromTeamView(upcoming[0], teamId) : null
}

/**
 * Summarise a run of fixtures for one team.
 *
 * Two cases need a stated rule rather than a silent one:
 *
 * - A **blank** gameweek is not difficulty 0. Having no fixture is bad for
 *   points but it is not an *easy* fixture, so folding it into the average as
 *   zero would rank a blank as the best possible week. Blanks are counted and
 *   reported separately instead.
 * - A **double** contributes both fixtures. Averaging by match rather than by
 *   gameweek keeps "how hard are these games" separate from "how many games
 *   are there", which is a different question and usually a desirable one.
 *
 * So: average difficulty per match, plus the match and blank counts, rather
 * than one opaque score that conflates all three.
 */
export function summariseRun(cells) {
  let matches = 0
  let totalDifficulty = 0
  let blanks = 0

  for (const gameweek of cells) {
    if (gameweek.length === 0) {
      blanks += 1
      continue
    }
    for (const match of gameweek) {
      matches += 1
      totalDifficulty += match.difficulty ?? 0
    }
  }

  return {
    matches,
    blanks,
    totalDifficulty,
    avgDifficulty: matches > 0 ? totalDifficulty / matches : null,
  }
}

/** Fixture difficulty colours, easy (1) through hard (5). */
export const FDR_COLORS = {
  1: { bg: '#00e07b', fg: '#04291b' },
  2: { bg: '#a1e86b', fg: '#213207' },
  3: { bg: '#e4e4e8', fg: '#3b3b45' },
  4: { bg: '#ff5a5f', fg: '#3d0308' },
  5: { bg: '#80072d', fg: '#ffd9e2' },
}

export const fdrStyle = (difficulty) => {
  const c = FDR_COLORS[difficulty] ?? { bg: '#2c2340', fg: '#b9b0c9' }
  return { background: c.bg, color: c.fg }
}
