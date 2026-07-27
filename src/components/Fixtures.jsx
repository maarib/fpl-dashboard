import { useMemo } from 'react'
import { useFpl } from '../hooks/useFpl'
import { fdrStyle, fixtureFromTeamView, fixturesForTeamInEvent } from '../lib/fpl'
import TeamBadge from './TeamBadge'

const WINDOW = 6

export default function Fixtures() {
  const { teams, fixtures, teamsById, events, currentEvent } = useFpl()

  const gameweeks = useMemo(() => {
    const startId = currentEvent?.id ?? 1
    return events.filter((e) => e.id >= startId && e.id < startId + WINDOW)
  }, [events, currentEvent])

  const grid = useMemo(() => {
    const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name))
    return sortedTeams.map((team) => ({
      team,
      cells: gameweeks.map((event) =>
        fixturesForTeamInEvent(fixtures, team.id, event.id).map((fixture) =>
          fixtureFromTeamView(fixture, team.id),
        ),
      ),
    }))
  }, [teams, fixtures, gameweeks])

  return (
    <section className="fdr">
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
          1 = easiest, 5 = hardest · H = home, A = away
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
            </tr>
          </thead>
          <tbody>
            {grid.map(({ team, cells }) => (
              <tr key={team.id}>
                <th scope="row" className="fdr__team">
                  <TeamBadge team={team} className="badge--sm" />
                  <span>{team.short_name}</span>
                </th>
                {cells.map((matches, index) => (
                  <td key={gameweeks[index].id} className="fdr__cell">
                    {matches.length === 0 ? (
                      <span className="fdr__chip fdr__chip--blank">BLANK</span>
                    ) : (
                      matches.map((match, i) => {
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
                            {/* Difficulty as a digit, not just a hue. Colour
                                alone fails WCAG 1.4.1 and the green/red scale
                                is exactly the pair that collapses under the
                                common forms of colour blindness. */}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
