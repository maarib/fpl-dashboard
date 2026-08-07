import { useEffect, useRef } from 'react'
import { useFpl } from '../hooks/useFpl'
import { usePlayerSummary } from '../hooks/usePlayerSummary'
import { useScrollLock } from '../hooks/useScrollLock'
import { fdrStyle, formatPrice } from '../lib/fpl'
import { playerPhotoUrl } from '../lib/images'
import { availability, ordinal, positionRanks, priceChange, setPieces } from '../lib/player'
import TeamBadge from './TeamBadge'

function Stat({ label, value, sub }) {
  return (
    <div className="pd-stat">
      <span className="pd-stat__value">{value}</span>
      <span className="pd-stat__label">{label}</span>
      {sub && <span className="pd-stat__sub">{sub}</span>}
    </div>
  )
}

/**
 * Everything we know about one player, reachable from the Explorer, the pool
 * and the pitch. Previously a player was a dead end on every surface: ten
 * columns of numbers and nowhere to go for context.
 */
export default function PlayerDetail({ player, onClose }) {
  const { teamsById, positionsById, players } = useFpl()
  const { loading, error, data } = usePlayerSummary(player?.id)
  const panelRef = useRef(null)
  const closeRef = useRef(null)

  // Move focus in on open and put it back where it came from on close —
  // otherwise dismissing the dialog drops focus at the top of the document
  // and a keyboard user loses their place in the table they opened it from.
  useEffect(() => {
    const previouslyFocused = document.activeElement
    closeRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  useScrollLock()

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // aria-modal alone does not stop Tab walking out into the page behind,
      // so the cycle is closed by hand.
      if (e.key !== 'Tab') return
      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!player) return null

  const team = teamsById.get(player.team)
  const position = positionsById.get(player.element_type)
  const status = availability(player)
  const change = priceChange(player)
  const duties = setPieces(player)

  const positionTotal = players.filter(
    (p) => p.element_type === player.element_type,
  ).length
  const ranks = positionRanks(player, position?.singular_name_short, positionTotal)

  const nextFixtures = (data?.fixtures ?? []).slice(0, 5)
  const pastSeasons = data?.history_past ?? []
  const thisSeason = data?.history ?? []

  return (
    <div
      className="pd-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="pd"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${player.first_name} ${player.second_name}`}
      >
        <button
          type="button"
          className="pd__close"
          onClick={onClose}
          ref={closeRef}
          aria-label="Close player details"
        >
          ×
        </button>

        {/* The scroller is inside the dialog rather than being the dialog, so
            the close button stays pinned instead of scrolling out of reach on
            a long profile. */}
        <div className="pd__scroll">
        <header className="pd__head">
          <img
            className="pd__photo"
            src={playerPhotoUrl(player, '250x250')}
            alt=""
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = playerPhotoUrl(player, '110x140')
            }}
          />
          <div className="pd__ident">
            <h2 className="pd__name">{player.web_name}</h2>
            <p className="pd__full">
              {player.first_name} {player.second_name}
            </p>
            <p className="pd__meta">
              <TeamBadge team={team} className="pd__badge" />
              {team?.name} · {position?.singular_name}
            </p>
            <p className="pd__price">
              {formatPrice(player.now_cost)}
              {change !== 0 && (
                <span className={change > 0 ? 'pd__rise' : 'pd__fall'}>
                  {change > 0 ? '▲' : '▼'} {formatPrice(Math.abs(change))} this season
                </span>
              )}
            </p>
          </div>
        </header>

        {/* Availability first — it can invalidate every other number below. */}
        {status.isConcern && (
          <div className={`pd-alert pd-alert--${status.tone}`}>
            <strong>{status.label}</strong>
            {status.news && <p>{status.news}</p>}
            {status.chance != null && (
              <p>{status.chance}% chance of playing the next match.</p>
            )}
          </div>
        )}

        <section className="pd-section">
          <h3>This season</h3>
          <div className="pd-stats">
            <Stat label="Total points" value={player.total_points} />
            <Stat label="Form" value={player.form} />
            <Stat label="Per game" value={player.points_per_game} />
            <Stat label="Selected" value={`${player.selected_by_percent}%`} />
            <Stat label="Minutes" value={player.minutes} sub={`${player.starts} starts`} />
            <Stat label="Bonus" value={player.bonus} />
          </div>
        </section>

        {ranks.length > 0 && (
          <section className="pd-section">
            <h3>
              Among {position?.plural_name?.toLowerCase()}{' '}
              <span className="pd-section__note">of {positionTotal}</span>
            </h3>
            <ul className="pd-ranks">
              {ranks.map((r) => (
                <li key={r.label} className={r.strong ? 'is-strong' : undefined}>
                  <span>{r.label}</span>
                  <strong>{ordinal(r.rank)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="pd-section">
          <h3>Underlying numbers</h3>
          <div className="pd-stats">
            <Stat label="xG" value={player.expected_goals} />
            <Stat label="xA" value={player.expected_assists} />
            <Stat label="xGI" value={player.expected_goal_involvements} />
            <Stat label="Goals" value={player.goals_scored} />
            <Stat label="Assists" value={player.assists} />
            <Stat label="DefCon" value={player.defensive_contribution} />
          </div>
        </section>

        {duties.length > 0 && (
          <section className="pd-section">
            <h3>Set pieces</h3>
            <ul className="pd-duties">
              {duties.map((d) => (
                <li key={d.label}>
                  <span>{d.label}</span>
                  <strong>#{d.order}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="pd-section">
          <h3>Next fixtures</h3>
          {loading && <p className="pd-muted">Loading fixtures…</p>}
          {error && <p className="pd-muted">Couldn’t load fixtures.</p>}
          {!loading && !error && nextFixtures.length === 0 && (
            <p className="pd-muted">No upcoming fixtures.</p>
          )}
          <div className="pd-fix">
            {nextFixtures.map((f) => {
              const opponent = teamsById.get(f.is_home ? f.team_a : f.team_h)
              return (
                <div key={f.id} className="pd-fix__item">
                  <span className="pd-fix__gw">GW{f.event ?? '—'}</span>
                  <span className="pd-fix__opp" style={fdrStyle(f.difficulty)}>
                    {opponent?.short_name} ({f.is_home ? 'H' : 'A'})
                    <span className="pd-fix__diff">{f.difficulty}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="pd-section">
          <h3>Previous seasons</h3>
          {loading && <p className="pd-muted">Loading history…</p>}
          {!loading && pastSeasons.length === 0 && (
            <p className="pd-muted">No previous seasons in Fantasy.</p>
          )}
          {pastSeasons.length > 0 && (
            <div className="pd-table-wrap">
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Season</th>
                    <th>Pts</th>
                    <th>Mins</th>
                    <th>G</th>
                    <th>A</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pastSeasons].reverse().map((s) => (
                    <tr key={s.season_name}>
                      <td>{s.season_name}</td>
                      <td className="is-strong">{s.total_points}</td>
                      <td>{s.minutes}</td>
                      <td>{s.goals_scored}</td>
                      <td>{s.assists}</td>
                      <td>
                        {formatPrice(s.start_cost)} → {formatPrice(s.end_cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="pd-section">
          <h3>Gameweek history</h3>
          {thisSeason.length === 0 ? (
            <p className="pd-muted">
              No gameweeks played yet — the season starts at GW1. This fills in
              match by match once it’s underway.
            </p>
          ) : (
            <div className="pd-table-wrap">
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>GW</th>
                    <th>Opp</th>
                    <th>Pts</th>
                    <th>Mins</th>
                    <th>G</th>
                    <th>A</th>
                  </tr>
                </thead>
                <tbody>
                  {[...thisSeason].reverse().map((h) => (
                    <tr key={h.round}>
                      <td>{h.round}</td>
                      <td>
                        {teamsById.get(h.opponent_team)?.short_name}
                        {h.was_home ? ' (H)' : ' (A)'}
                      </td>
                      <td className="is-strong">{h.total_points}</td>
                      <td>{h.minutes}</td>
                      <td>{h.goals_scored}</td>
                      <td>{h.assists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        </div>
      </aside>
    </div>
  )
}
