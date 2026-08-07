import { useRef } from 'react'
import { useFpl } from '../hooks/useFpl'
import { useModalFocus } from '../hooks/useModalFocus'
import { usePlayerSummaries } from '../hooks/usePlayerSummary'
import { useScrollLock } from '../hooks/useScrollLock'
import { fdrStyle, formatPrice, toNumber } from '../lib/fpl'
import { playerPhotoUrl } from '../lib/images'
import { availability } from '../lib/player'
import TeamBadge from './TeamBadge'

/**
 * Rows are metrics, columns are players. `better` says which direction wins,
 * so the panel can mark the leader per row rather than leaving the reading to
 * the user — the whole point of a comparison is not having to scan.
 *
 * Ownership has no winner: low is a differential, high is safety. Marking one
 * as "better" would be an opinion the data doesn't support.
 */
const METRICS = [
  { label: 'Price', get: (p) => p.now_cost, format: formatPrice, better: 'low' },
  { label: 'Total points', get: (p) => p.total_points, better: 'high' },
  { label: 'Points per game', get: (p) => toNumber(p.points_per_game), better: 'high' },
  {
    label: 'Points per £m',
    get: (p) => (p.now_cost ? (p.total_points / (p.now_cost / 10)) : 0),
    format: (v) => v.toFixed(1),
    better: 'high',
  },
  { label: 'Form', get: (p) => toNumber(p.form), better: 'high' },
  { label: 'Selected by', get: (p) => toNumber(p.selected_by_percent), format: (v) => `${v}%`, better: null },
  { label: 'Minutes', get: (p) => p.minutes, better: 'high' },
  { label: 'Starts', get: (p) => p.starts, better: 'high' },
  { label: 'Goals', get: (p) => p.goals_scored, better: 'high' },
  { label: 'Assists', get: (p) => p.assists, better: 'high' },
  { label: 'xG', get: (p) => toNumber(p.expected_goals), format: (v) => v.toFixed(2), better: 'high' },
  { label: 'xA', get: (p) => toNumber(p.expected_assists), format: (v) => v.toFixed(2), better: 'high' },
  { label: 'xGI', get: (p) => toNumber(p.expected_goal_involvements), format: (v) => v.toFixed(2), better: 'high' },
  { label: 'Defensive contribution', get: (p) => toNumber(p.defensive_contribution), better: 'high' },
  { label: 'Bonus', get: (p) => p.bonus, better: 'high' },
]

export default function PlayerCompare({ players, onClose, onRemove }) {
  const { teamsById, positionsById } = useFpl()
  const ids = players.map((p) => p.id)
  const { loading, byId } = usePlayerSummaries(ids)

  const dialogRef = useRef(null)

  useScrollLock()
  useModalFocus(dialogRef, onClose)

  /** Index of the winning column, or null when tied or not applicable. */
  const leaderIndex = (metric) => {
    if (!metric.better || players.length < 2) return null
    const values = players.map(metric.get)
    const best = metric.better === 'high' ? Math.max(...values) : Math.min(...values)
    // A value everyone shares is not a win.
    if (values.every((v) => v === best)) return null
    return values.indexOf(best)
  }

  const positions = new Set(players.map((p) => p.element_type))

  return (
    <div
      className="cmp-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Labelled by the heading rather than a hand-written aria-label, so the
          accessible name cannot drift from what is on screen — it said
          "Compare players" while the heading said "Comparing 3 players". */}
      <section
        className="cmp"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmp-title"
      >
        <header className="cmp__head">
          <h2 id="cmp-title">Comparing {players.length} players</h2>
          <button type="button" className="cmp__close" onClick={onClose} aria-label="Close comparison">
            ×
          </button>
        </header>

        {positions.size > 1 && (
          <p className="cmp__note">
            These players are in different positions, so points and defensive
            numbers aren’t directly comparable.
          </p>
        )}

        <div className="cmp__scroll">
          <table className="cmp__table">
            <thead>
              <tr>
                {/* Sits in both sticky tracks at once, so it gets its own
                    class rather than reusing the row-head styles. */}
                <th className="cmp__corner" />
                {players.map((p) => {
                  const status = availability(p)
                  return (
                    <th key={p.id} className="cmp__player">
                      <img
                        className="cmp__photo"
                        src={playerPhotoUrl(p, '250x250')}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = playerPhotoUrl(p, '110x140')
                        }}
                      />
                      <span className="cmp__name">{p.web_name}</span>
                      <span className="cmp__sub">
                        <TeamBadge team={teamsById.get(p.team)} className="cmp__badge" />
                        {teamsById.get(p.team)?.short_name} ·{' '}
                        {positionsById.get(p.element_type)?.singular_name_short}
                      </span>
                      {status.isConcern && (
                        <span className="cmp__flag" title={status.news ?? status.label}>
                          {status.label}
                        </span>
                      )}
                      {onRemove && (
                        <button
                          type="button"
                          className="cmp__drop"
                          onClick={() => onRemove(p.id)}
                        >
                          Remove
                        </button>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {METRICS.map((metric) => {
                const winner = leaderIndex(metric)
                return (
                  <tr key={metric.label}>
                    <th scope="row" className="cmp__rowhead">
                      {metric.label}
                    </th>
                    {players.map((p, i) => {
                      const raw = metric.get(p)
                      return (
                        <td
                          key={p.id}
                          className={i === winner ? 'cmp__win' : undefined}
                        >
                          {metric.format ? metric.format(raw) : raw}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              <tr>
                <th scope="row" className="cmp__rowhead">
                  Next 5 fixtures
                </th>
                {players.map((p) => {
                  const fixtures = (byId[p.id]?.fixtures ?? []).slice(0, 5)
                  return (
                    <td key={p.id}>
                      {loading && <span className="cmp__muted">Loading…</span>}
                      {!loading && fixtures.length === 0 && (
                        <span className="cmp__muted">—</span>
                      )}
                      <span className="cmp__fix">
                        {fixtures.map((f) => {
                          const opp = teamsById.get(f.is_home ? f.team_a : f.team_h)
                          return (
                            <span
                              key={f.id}
                              className="cmp__chip"
                              style={fdrStyle(f.difficulty)}
                              title={`GW${f.event} · difficulty ${f.difficulty}`}
                            >
                              {opp?.short_name}
                              {f.is_home ? ' (H)' : ' (A)'}
                              <span className="cmp__diff">{f.difficulty}</span>
                            </span>
                          )
                        })}
                      </span>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
