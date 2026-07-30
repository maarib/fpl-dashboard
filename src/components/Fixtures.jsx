import { useMemo, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import { useSquad } from '../hooks/useSquad'
import {
  fdrStyle,
  fixtureFromTeamView,
  fixturesForTeamInEvent,
  summariseRun,
} from '../lib/fpl'
import { squadIds } from '../lib/squad'
import TeamBadge from './TeamBadge'

const WINDOWS = [3, 6, 10]

const SORTS = [
  { id: 'team', label: 'Team (A–Z)' },
  { id: 'easiest', label: 'Easiest run' },
  { id: 'hardest', label: 'Hardest run' },
]

export default function Fixtures() {
  const { teams, fixtures, teamsById, events, currentEvent, playersById } = useFpl()
  const { squad } = useSquad()

  const [windowSize, setWindowSize] = useState(6)
  const [sort, setSort] = useState('team')
  const [squadOnly, setSquadOnly] = useState(false)

  const gameweeks = useMemo(() => {
    const startId = currentEvent?.id ?? 1
    return events.filter((e) => e.id >= startId && e.id < startId + windowSize)
  }, [events, currentEvent, windowSize])

  /** Clubs represented in the saved squad — the bridge to My Team. */
  const ownedTeamIds = useMemo(() => {
    const ids = new Set()
    for (const playerId of squadIds(squad)) {
      const team = playersById.get(playerId)?.team
      if (team != null) ids.add(team)
    }
    return ids
  }, [squad, playersById])

  const rows = useMemo(() => {
    const built = teams.map((team) => {
      const cells = gameweeks.map((event) =>
        fixturesForTeamInEvent(fixtures, team.id, event.id).map((fixture) =>
          fixtureFromTeamView(fixture, team.id),
        ),
      )
      return { team, cells, ...summariseRun(cells), owned: ownedTeamIds.has(team.id) }
    })

    const visible = squadOnly ? built.filter((r) => r.owned) : built

    return [...visible].sort((a, b) => {
      if (sort === 'team') return a.team.name.localeCompare(b.team.name)
      // A team with no fixtures at all has no average; keep those last either
      // way rather than letting null sort as zero and look like an easy run.
      if (a.avgDifficulty == null) return 1
      if (b.avgDifficulty == null) return -1
      return sort === 'easiest'
        ? a.avgDifficulty - b.avgDifficulty
        : b.avgDifficulty - a.avgDifficulty
    })
  }, [teams, fixtures, gameweeks, sort, squadOnly, ownedTeamIds])

  const ownedCount = ownedTeamIds.size

  return (
    <section className="fdr">
      <div className="filters">
        <label className="field">
          <span className="field__label">Gameweeks</span>
          <select
            className="input input--narrow"
            value={windowSize}
            onChange={(e) => setWindowSize(Number(e.target.value))}
          >
            {WINDOWS.map((w) => (
              <option key={w} value={w}>
                Next {w}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Sort by</span>
          <select
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Show</span>
          <span className="fdr__toggle">
            <input
              type="checkbox"
              checked={squadOnly}
              disabled={ownedCount === 0}
              onChange={(e) => setSquadOnly(e.target.checked)}
            />
            My squad’s clubs only
          </span>
        </label>

        <p className="filters__count">
          {ownedCount === 0
            ? 'Build a squad in My Team to filter this grid to your clubs.'
            : `${ownedCount} club${ownedCount === 1 ? '' : 's'} in your squad · showing ${rows.length} of ${teams.length}`}
        </p>
      </div>

      <div className="fdr__legend">
        <span>Fixture difficulty</span>
        <span className="fdr__scale">
          {[1, 2, 3, 4, 5].map((d) => (
            <span key={d} className="fdr__swatch" style={fdrStyle(d)}>
              {d}
            </span>
          ))}
        </span>
        <span className="fdr__hint">
          1 = easiest, 5 = hardest · H = home, A = away · Avg is per match, so a
          blank lowers the match count rather than counting as an easy game
        </span>
      </div>

      <div className="table-scroll">
        <table className="table table--fdr">
          <thead>
            <tr>
              <th className="fdr__team-head">Team</th>
              {gameweeks.map((event) => (
                <th key={event.id} title={event.name}>
                  GW{event.id}
                </th>
              ))}
              <th title="Fixtures in this window">Games</th>
              <th title="Average difficulty per match">Avg</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ team, cells, matches, blanks, avgDifficulty, owned }) => (
              <tr key={team.id} className={owned ? 'fdr__row--owned' : undefined}>
                <th scope="row" className="fdr__team">
                  <TeamBadge team={team} className="badge--sm" />
                  <span>{team.short_name}</span>
                  {owned && (
                    <span className="fdr__owned" title="You own players from this club">
                      ●
                    </span>
                  )}
                </th>

                {cells.map((matchesInGw, index) => (
                  <td key={gameweeks[index].id} className="fdr__cell">
                    {matchesInGw.length === 0 ? (
                      <span className="fdr__chip fdr__chip--blank">BLANK</span>
                    ) : (
                      matchesInGw.map((match, i) => {
                        const opponent = teamsById.get(match.opponentId)
                        return (
                          <span
                            key={i}
                            className="fdr__chip"
                            style={fdrStyle(match.difficulty)}
                            title={`${opponent?.name} (${match.isHome ? 'home' : 'away'}) · difficulty ${match.difficulty}`}
                          >
                            <span className="fdr__opp">
                              {opponent?.short_name} ({match.isHome ? 'H' : 'A'})
                            </span>
                            <span className="fdr__diff">
                              <span className="sr-only">difficulty </span>
                              {match.difficulty}
                            </span>
                          </span>
                        )
                      })
                    )}
                  </td>
                ))}

                <td className="fdr__num">
                  {matches}
                  {blanks > 0 && (
                    <span className="fdr__blanks" title={`${blanks} blank gameweek(s)`}>
                      {' '}
                      −{blanks}
                    </span>
                  )}
                </td>
                <td className="fdr__num fdr__num--strong">
                  {avgDifficulty == null ? '—' : avgDifficulty.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="empty">No clubs to show. Add players in My Team first.</p>
        )}
      </div>
    </section>
  )
}
