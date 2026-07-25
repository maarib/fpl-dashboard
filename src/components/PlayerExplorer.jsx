import { useMemo, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import { formatPrice, toNumber } from '../lib/fpl'
import PlayerPhoto from './PlayerPhoto'
import TeamBadge from './TeamBadge'

const COLUMNS = [
  { key: 'photo', label: '', sortable: false, className: 'col-photo' },
  {
    key: 'name',
    label: 'Player',
    type: 'text',
    align: 'left',
    value: (p) => p.web_name,
  },
  {
    key: 'team',
    label: 'Team',
    type: 'text',
    value: (p, { teamsById }) => teamsById.get(p.team)?.short_name ?? '',
  },
  {
    key: 'position',
    label: 'Pos',
    type: 'text',
    value: (p, { positionsById }) =>
      positionsById.get(p.element_type)?.singular_name_short ?? '',
  },
  { key: 'price', label: 'Price', type: 'number', value: (p) => p.now_cost },
  { key: 'form', label: 'Form', type: 'number', value: (p) => toNumber(p.form) },
  {
    key: 'selected',
    label: 'Selected',
    type: 'number',
    value: (p) => toNumber(p.selected_by_percent),
  },
  {
    key: 'total_points',
    label: 'Pts',
    type: 'number',
    value: (p) => p.total_points,
  },
  {
    key: 'defensive_contribution',
    label: 'DefCon',
    type: 'number',
    title: 'Defensive contribution',
    value: (p) => toNumber(p.defensive_contribution),
  },
  {
    key: 'xgi',
    label: 'xGI',
    type: 'number',
    title: 'Expected goal involvements',
    value: (p) => toNumber(p.expected_goal_involvements),
  },
]

const SORTABLE = new Map(
  COLUMNS.filter((c) => c.sortable !== false).map((c) => [c.key, c]),
)

export default function PlayerExplorer() {
  const { players, positions, teamsById, positionsById } = useFpl()

  const [priceBounds] = useState(() => {
    const costs = players.map((p) => p.now_cost)
    return { min: Math.min(...costs), max: Math.max(...costs) }
  })

  const [positionFilter, setPositionFilter] = useState('all')
  const [minPrice, setMinPrice] = useState(priceBounds.min)
  const [maxPrice, setMaxPrice] = useState(priceBounds.max)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'total_points', dir: 'desc' })

  const rows = useMemo(() => {
    const ctx = { teamsById, positionsById }
    const query = search.trim().toLowerCase()

    const filtered = players.filter((p) => {
      if (positionFilter !== 'all' && p.element_type !== Number(positionFilter)) return false
      if (p.now_cost < minPrice || p.now_cost > maxPrice) return false
      if (query) {
        const haystack = `${p.first_name} ${p.second_name} ${p.web_name}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })

    const column = SORTABLE.get(sort.key)
    if (!column) return filtered

    const factor = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va = column.value(a, ctx)
      const vb = column.value(b, ctx)
      const cmp =
        column.type === 'text'
          ? String(va).localeCompare(String(vb))
          : va - vb
      // Stable tie-break so equal values don't jump around between renders.
      return cmp !== 0 ? cmp * factor : a.id - b.id
    })
  }, [players, teamsById, positionsById, positionFilter, minPrice, maxPrice, search, sort])

  function toggleSort(column) {
    setSort((current) =>
      current.key === column.key
        ? { key: column.key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, dir: column.type === 'text' ? 'asc' : 'desc' },
    )
  }

  function resetFilters() {
    setPositionFilter('all')
    setMinPrice(priceBounds.min)
    setMaxPrice(priceBounds.max)
    setSearch('')
  }

  return (
    <section className="explorer">
      <div className="filters">
        <label className="field">
          <span className="field__label">Search</span>
          <input
            type="search"
            className="input"
            placeholder="Player name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Position</span>
          <select
            className="input"
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
          >
            <option value="all">All positions</option>
            {positions.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.plural_name}
              </option>
            ))}
          </select>
        </label>

        <div className="field field--range">
          <span className="field__label">
            Price {formatPrice(minPrice)} – {formatPrice(maxPrice)}
          </span>
          <div className="range-pair">
            <input
              type="range"
              aria-label="Minimum price"
              min={priceBounds.min}
              max={priceBounds.max}
              step="1"
              value={minPrice}
              onChange={(e) => {
                const next = Number(e.target.value)
                setMinPrice(next)
                if (next > maxPrice) setMaxPrice(next)
              }}
            />
            <input
              type="range"
              aria-label="Maximum price"
              min={priceBounds.min}
              max={priceBounds.max}
              step="1"
              value={maxPrice}
              onChange={(e) => {
                const next = Number(e.target.value)
                setMaxPrice(next)
                if (next < minPrice) setMinPrice(next)
              }}
            />
          </div>
        </div>

        <button type="button" className="btn" onClick={resetFilters}>
          Reset
        </button>

        <p className="filters__count">
          {rows.length} of {players.length} players
        </p>
      </div>

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {COLUMNS.map((column) => {
                const sortable = column.sortable !== false
                const active = sort.key === column.key
                return (
                  <th
                    key={column.key}
                    className={column.className}
                    title={column.title}
                    aria-sort={
                      active
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    style={{ textAlign: column.align ?? 'center' }}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className={`th-btn${active ? ' th-btn--active' : ''}`}
                        onClick={() => toggleSort(column)}
                      >
                        {column.label}
                        <span className="th-btn__arrow">
                          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '▹'}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((player) => {
              const team = teamsById.get(player.team)
              const position = positionsById.get(player.element_type)
              return (
                <tr key={player.id}>
                  <td className="col-photo">
                    <PlayerPhoto player={player} className="photo--sm" />
                  </td>
                  <td className="col-name">
                    <span className="player-name">{player.web_name}</span>
                    <span className="player-sub">
                      {player.first_name} {player.second_name}
                    </span>
                  </td>
                  <td>
                    <TeamBadge team={team} className="badge--sm" />
                  </td>
                  <td>
                    <span className={`pos pos--${position?.singular_name_short}`}>
                      {position?.singular_name_short}
                    </span>
                  </td>
                  <td className="num">{formatPrice(player.now_cost)}</td>
                  <td className="num">{player.form}</td>
                  <td className="num">{player.selected_by_percent}%</td>
                  <td className="num num--strong">{player.total_points}</td>
                  <td className="num">{player.defensive_contribution}</td>
                  <td className="num">{player.expected_goal_involvements}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="empty">No players match these filters.</p>
        )}
      </div>
    </section>
  )
}
