import { useMemo, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import { formatPrice, toNumber } from '../lib/fpl'
import { teamKitUrl } from '../lib/images'
import { addRejectionReason, findPlayerSlot } from '../lib/squad'
import PlayerDetail from './PlayerDetail'

const SORTS = [
  { id: 'points', label: 'Total points', value: (p) => p.total_points },
  { id: 'price', label: 'Price', value: (p) => p.now_cost },
  { id: 'form', label: 'Form', value: (p) => toNumber(p.form) },
  { id: 'selected', label: 'Selected by', value: (p) => toNumber(p.selected_by_percent) },
  { id: 'xgi', label: 'xGI', value: (p) => toNumber(p.expected_goal_involvements) },
]

function PoolRow({ player, team, reason, inSquad, onAdd, onRemove, onInspect }) {
  const kit = teamKitUrl(team, player.element_type === 1, 110)

  return (
    <li className={`prow${inSquad ? ' prow--picked' : ''}`}>
      {kit && <img className="prow__kit" src={kit} alt="" loading="lazy" />}

      <span className="prow__main">
        <span
          className="prow__name"
          title={`${player.first_name} ${player.second_name}`}
        >
          {player.web_name}
        </span>
        {/* State the reason inline. It was previously only a `title`, which
            is invisible on touch and easy to miss — and with a full position
            every row greys out at once, which reads as the app being broken. */}
        <span className="prow__sub">
          {team?.short_name}
          {reason && !inSquad && (
            <>
              {' · '}
              <span className="prow__reason">{reason}</span>
            </>
          )}
        </span>
      </span>

      <button
        type="button"
        className="prow__info"
        aria-label={`View ${player.web_name} details`}
        onClick={onInspect}
      >
        i
      </button>

      <span className="prow__price">{formatPrice(player.now_cost)}</span>
      <span className="prow__tp">{player.total_points}</span>

      {inSquad ? (
        <button
          type="button"
          className="prow__btn prow__btn--remove"
          aria-label={`Remove ${player.web_name}`}
          onClick={onRemove}
        >
          ×
        </button>
      ) : (
        <button
          type="button"
          className="prow__btn"
          aria-label={`Add ${player.web_name}`}
          disabled={Boolean(reason)}
          title={reason ?? `Add ${player.web_name}`}
          onClick={onAdd}
        >
          +
        </button>
      )}
    </li>
  )
}

/**
 * Persistent player pool beside the pitch. Clicking + drops a player into the
 * first free slot of their position, which is why validation is squad-level
 * rather than slot-level.
 */
export default function PlayerPool({ squad, onAdd, onRemove }) {
  const [detail, setDetail] = useState(null)
  const { players, positions, teamsById, playersById } = useFpl()

  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [sort, setSort] = useState('points')
  const [maxPrice, setMaxPrice] = useState('')

  const priceSteps = useMemo(() => {
    const max = Math.max(...players.map((p) => p.now_cost))
    const steps = []
    for (let c = 40; c <= max; c += 5) steps.push(c)
    return steps
  }, [players])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const cap = maxPrice ? Number(maxPrice) : Infinity
    const sorter = SORTS.find((s) => s.id === sort) ?? SORTS[0]

    return players
      .filter((p) => positionFilter === 'all' || p.element_type === Number(positionFilter))
      .filter((p) => p.now_cost <= cap)
      .filter((p) =>
        query
          ? `${p.first_name} ${p.second_name} ${p.web_name}`.toLowerCase().includes(query)
          : true,
      )
      .sort((a, b) => sorter.value(b) - sorter.value(a) || a.id - b.id)
  }, [players, positionFilter, maxPrice, search, sort])

  const grouped = positions.map((position) => ({
    position,
    rows: filtered.filter((p) => p.element_type === position.id),
  }))

  function reset() {
    setSearch('')
    setPositionFilter('all')
    setSort('points')
    setMaxPrice('')
  }

  return (
    <div className="pool">
      <div className="pool__head">
        <h2 className="pool__title">Player Selection</h2>
        <p className="pool__blurb">
          Select a maximum of 3 players from a single team.
        </p>

        <label className="pool__field">
          <span className="pool__label">Find a player</span>
          <input
            className="pool__search"
            type="search"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div className="pool__filters">
          <select
            className="pool__select"
            aria-label="Position"
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
          >
            <option value="all">All players</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.plural_name}
              </option>
            ))}
          </select>

          <select
            className="pool__select"
            aria-label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            className="pool__select"
            aria-label="Maximum price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          >
            <option value="">Any price</option>
            {priceSteps.map((c) => (
              <option key={c} value={c}>
                {formatPrice(c)}
              </option>
            ))}
          </select>

          <button type="button" className="pool__reset" onClick={reset}>
            Reset
          </button>
        </div>

        <p className="pool__count">{filtered.length} players shown</p>
      </div>

      <div className="pool__scroll">
        {grouped.map(({ position, rows }) =>
          rows.length === 0 ? null : (
            <section key={position.id} className="pool__group">
              <header className="pool__grouphead">
                <span>{position.plural_name}</span>
                <span className="pool__col">Price</span>
                <span className="pool__col">TP</span>
              </header>
              <ul className="pool__rows">
                {rows.slice(0, 60).map((player) => {
                  const slot = findPlayerSlot(squad, player.id)
                  return (
                    <PoolRow
                      key={player.id}
                      player={player}
                      team={teamsById.get(player.team)}
                      inSquad={Boolean(slot)}
                      reason={addRejectionReason(player, squad, playersById)}
                      onAdd={() => onAdd(player)}
                      onRemove={() => onRemove(slot)}
                      onInspect={() => setDetail(player)}
                    />
                  )
                })}
              </ul>
              {rows.length > 60 && (
                <p className="pool__more">
                  Showing top 60 of {rows.length} — refine your search to see more.
                </p>
              )}
            </section>
          ),
        )}

        {filtered.length === 0 && <p className="pool__empty">No players match.</p>}
      </div>

      {detail && <PlayerDetail player={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
