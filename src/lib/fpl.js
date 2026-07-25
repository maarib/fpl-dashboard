/** Helpers for shaping raw FPL API data. */

/** now_cost is in tenths of a million. */
export const formatPrice = (nowCost) => `£${(nowCost / 10).toFixed(1)}m`

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
