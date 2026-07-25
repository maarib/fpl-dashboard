import { useEffect, useState } from 'react'
import { fetchEntry, fetchPicks } from '../api/fpl'
import { useFpl } from '../hooks/useFpl'
import Pitch from './Pitch'
import PitchCard from './PitchCard'

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
export default function TeamLookup({ metric }) {
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
  const starters = picks.filter((p) => p.position <= 11)
  const bench = picks
    .filter((p) => p.position > 11)
    .sort((a, b) => a.position - b.position)

  const renderCard = (pick) => {
    const player = playersById.get(pick.element)
    if (!player) return null
    return (
      <PitchCard
        key={pick.element}
        player={player}
        team={teamsById.get(player.team)}
        metric={metric}
        fixtures={fixtures}
        teamsById={teamsById}
        fromEvent={query?.gameweek ?? gameweek}
        isCaptain={pick.is_captain}
        isViceCaptain={pick.is_vice_captain}
      />
    )
  }

  // Formation comes from whatever the manager actually fielded.
  const rows = [1, 2, 3, 4].map((typeId) =>
    starters
      .filter((pick) => playersById.get(pick.element)?.element_type === typeId)
      .sort((a, b) => a.position - b.position)
      .map(renderCard),
  )

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
        </div>
      )}

      {data && (
        <>
          <header className="squad-head">
            <h2>
              {data.entry
                ? `${data.entry.player_first_name} ${data.entry.player_last_name}`
                : `Manager ${query.managerId}`}
            </h2>
            <p>
              {data.entry?.name ? `${data.entry.name} · ` : ''}
              Gameweek {query.gameweek}
              {data.picks.entry_history ? ` · ${data.picks.entry_history.points} pts` : ''}
              {data.picks.active_chip ? ` · chip: ${data.picks.active_chip}` : ''}
            </p>
          </header>

          <Pitch rows={rows} bench={bench.map(renderCard)} benchLabel="Substitutes" />
        </>
      )}
    </>
  )
}
