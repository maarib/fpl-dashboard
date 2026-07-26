import { useEffect, useState } from 'react'
import { fetchEntry, fetchPicks } from '../api/fpl'
import { useFpl } from '../hooks/useFpl'
import GameweekFixtures from './GameweekFixtures'
import Pitch from './Pitch'
import PitchCard from './PitchCard'
import SquadList from './SquadList'
import StageBar from './StageBar'

const STORAGE_KEY = 'fpl-dashboard:manager-id'

// Cache squads per manager+gameweek for the life of the page.
const picksCache = new Map()

function loadPicks(managerId, gameweek) {
  const key = `${managerId}:${gameweek}`
  if (!picksCache.has(key)) {
    picksCache.set(
      key,
      Promise.all([
        fetchPicks(managerId, gameweek),
        fetchEntry(managerId).catch(() => null),
      ]).catch((err) => {
        picksCache.delete(key)
        throw err
      }),
    )
  }
  return picksCache.get(key)
}

/** Mode B — render someone else's squad from the API onto the same pitch. */
export default function TeamLookup({ view, setView, metric, setMetric }) {
  const { fixtures, playersById, teamsById, events, currentEvent } = useFpl()

  const [managerIdInput, setManagerIdInput] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? '',
  )
  const [gameweek, setGameweek] = useState(currentEvent?.id ?? 1)
  const [query, setQuery] = useState(null)
  const [state, setState] = useState({ loading: false, error: null, data: null })

  useEffect(() => {
    if (!query) return
    let cancelled = false
    setState({ loading: true, error: null, data: null })

    loadPicks(query.managerId, query.gameweek)
      .then(([picks, entry]) => {
        if (!cancelled) setState({ loading: false, error: null, data: { picks, entry } })
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, error, data: null })
      })

    return () => {
      cancelled = true
    }
  }, [query])

  function onSubmit(event) {
    event.preventDefault()
    const managerId = managerIdInput.trim()
    if (!managerId) return
    localStorage.setItem(STORAGE_KEY, managerId)
    setQuery({ managerId, gameweek })
  }

  const { loading, error, data } = state
  const picks = data?.picks?.picks ?? []
  const fromEvent = query?.gameweek ?? gameweek

  const toEntry = (pick) => {
    const player = playersById.get(pick.element)
    if (!player) return null
    return {
      pos: player.element_type,
      player,
      team: teamsById.get(player.team),
      isGoalkeeper: player.element_type === 1,
      isBench: pick.position > 11,
      isCaptain: pick.is_captain,
      isViceCaptain: pick.is_vice_captain,
      order: pick.position,
    }
  }

  const entries = picks.map(toEntry).filter(Boolean)

  const renderCard = (entry) => (
    <PitchCard
      key={entry.player.id}
      player={entry.player}
      team={entry.team}
      isGoalkeeper={entry.isGoalkeeper}
      metric={metric}
      fixtures={fixtures}
      teamsById={teamsById}
      fromEvent={fromEvent}
      isCaptain={entry.isCaptain}
      isViceCaptain={entry.isViceCaptain}
    />
  )

  // Formation comes from whatever the manager actually fielded.
  const rows = [1, 2, 3, 4].map((pos) =>
    entries
      .filter((e) => !e.isBench && e.pos === pos)
      .sort((a, b) => a.order - b.order)
      .map(renderCard),
  )

  const bench = entries
    .filter((e) => e.isBench)
    .sort((a, b) => a.order - b.order)
    .map(renderCard)

  return (
    <>
      <form className="filters" onSubmit={onSubmit}>
        <label className="field">
          <span className="field__label">Manager ID</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 1234567"
            value={managerIdInput}
            onChange={(e) => setManagerIdInput(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Gameweek</span>
          <select
            className="input"
            value={gameweek}
            onChange={(e) => setGameweek(Number(e.target.value))}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="btn btn--primary" disabled={!managerIdInput.trim()}>
          Load squad
        </button>

        <p className="filters__count">
          Your manager ID is in the URL of your FPL points page:
          <code>/entry/&lt;id&gt;/event/&lt;gw&gt;</code>
        </p>
      </form>

      {!query && <p className="empty">Enter a manager ID to load a squad.</p>}
      {loading && <p className="empty">Loading squad…</p>}

      {error && (
        <div className="notice notice--error">
          <strong>Couldn’t load that squad.</strong>
          <p>{error.message}</p>
          {error.status === 404 && (
            <p>
              The FPL API only returns picks for a gameweek once its deadline has
              passed. Right now the game is in pre-season, so no squad exists for
              any gameweek yet — this view will fill in from GW1 onwards.
            </p>
          )}
          {/* A 404 is a definitive answer, not a failure worth retrying. */}
          {error.status !== 404 && (
            <button
              type="button"
              className="btn btn--primary"
              style={{ marginTop: 12 }}
              onClick={() => setQuery((q) => (q ? { ...q } : q))}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {data && (
        <div className="stage-col" style={{ margin: '0 auto', maxWidth: 'var(--stage-w)' }}>
        <div className="team-stage">
          <div className="stage-meters">
            <div className="stage-meter">
              <span className="stage-meter__value">
                {data.picks.entry_history?.points ?? '—'}
              </span>
              <span className="stage-meter__label">
                Gameweek {query.gameweek} points
              </span>
            </div>
            {data.picks.active_chip && (
              <div className="stage-meter">
                <span className="stage-meter__value">{data.picks.active_chip}</span>
                <span className="stage-meter__label">Active chip</span>
              </div>
            )}
          </div>

          <p className="stage-note">
            {data.entry
              ? `${data.entry.player_first_name} ${data.entry.player_last_name}`
              : `Manager ${query.managerId}`}
            {data.entry?.name ? ` · ${data.entry.name}` : ''}
          </p>

          <StageBar view={view} setView={setView} metric={metric} setMetric={setMetric} />

          {view === 'pitch' ? (
            <Pitch rows={rows} bench={bench} benchLabel="Substitutes" />
          ) : (
            <SquadList
              entries={entries}
              metric={metric}
              fixtures={fixtures}
              teamsById={teamsById}
              fromEvent={fromEvent}
            />
          )}
        </div>

        <GameweekFixtures gameweek={fromEvent} />
        </div>
      )}
    </>
  )
}
