import { MagnifyingGlass } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import PlayerDetail from './PlayerDetail'
import Select from './Select'
import PlayerCompare from './PlayerCompare'
import { useFpl } from '../hooks/useFpl'
import { formatPrice, toNumber } from '../lib/fpl'
import { playerPhotoUrl } from '../lib/images'
import { clubColor } from '../lib/clubColors'

// What the list can be sorted by. `big` is the value shown as the row's large
// numeral; when the sort is one of these, the numeral follows the sort so the
// ordering is always legible.
const SORTS = [
  { key: 'total_points', label: 'Points', short: 'Pts', value: (p) => p.total_points },
  { key: 'form', label: 'Form', short: 'Form', value: (p) => toNumber(p.form) },
  { key: 'selected', label: 'Ownership', short: 'Own', value: (p) => toNumber(p.selected_by_percent), fmt: (v) => `${v}%` },
  { key: 'price', label: 'Price', short: '£m', value: (p) => p.now_cost, fmt: formatPrice },
  { key: 'defensive_contribution', label: 'Defence', short: 'DefC', value: (p) => toNumber(p.defensive_contribution) },
  { key: 'xgi', label: 'xGI', short: 'xGI', value: (p) => toNumber(p.expected_goal_involvements) },
  { key: 'name', label: 'Name', short: '', type: 'text', value: (p) => p.web_name },
]
const SORT_BY_KEY = new Map(SORTS.map((s) => [s.key, s]))

function Avatar({ player, color }) {
  return (
    <span className="pavatar" style={{ '--c': color }}>
      <span className="pavatar__mono">{player.web_name.charAt(0)}</span>
      <img
        src={playerPhotoUrl(player, '110x140')}
        alt=""
        loading="lazy"
        onError={(e) => e.currentTarget.remove()}
      />
    </span>
  )
}

export default function PlayerExplorer() {
  const { players, positions, teamsById, positionsById } = useFpl()

  const [priceBounds] = useState(() => {
    const costs = players.map((p) => p.now_cost)
    return { min: Math.min(...costs), max: Math.max(...costs) }
  })

  const priceSteps = useMemo(() => {
    const steps = []
    for (let c = priceBounds.min; c <= priceBounds.max; c += 5) steps.push(c)
    if (steps[steps.length - 1] !== priceBounds.max) steps.push(priceBounds.max)
    return steps
  }, [priceBounds])

  const [positionFilter, setPositionFilter] = useState('all')
  const [minPrice, setMinPrice] = useState(priceBounds.min)
  const [maxPrice, setMaxPrice] = useState(priceBounds.max)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('total_points')
  const [detail, setDetail] = useState(null)

  const MAX_COMPARE = 4
  const [compareIds, setCompareIds] = useState([])
  const [comparing, setComparing] = useState(false)

  const toggleCompare = (id) =>
    setCompareIds((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length >= MAX_COMPARE
          ? ids
          : [...ids, id],
    )

  const comparePlayers = compareIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean)

  const sort = SORT_BY_KEY.get(sortKey)

  const rows = useMemo(() => {
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

    const factor = sort.type === 'text' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va = sort.value(a)
      const vb = sort.value(b)
      const cmp = sort.type === 'text' ? String(va).localeCompare(String(vb)) : va - vb
      return cmp !== 0 ? cmp * factor : a.id - b.id
    })
  }, [players, positionFilter, minPrice, maxPrice, search, sort])

  function resetFilters() {
    setPositionFilter('all')
    setMinPrice(priceBounds.min)
    setMaxPrice(priceBounds.max)
    setSearch('')
  }

  // The leader is pulled out as a featured card; the search view stays a plain
  // list so a query isn't reframed as "the standout result".
  const featured = !search.trim() && rows.length > 0 ? rows[0] : null
  const listRows = featured ? rows.slice(1) : rows

  // The row's big numeral is total points, unless the list is sorted by another
  // number — then it follows the sort so the ranking reads.
  const bigStat = sort.type === 'text' || sort.key === 'price' ? SORT_BY_KEY.get('total_points') : sort

  const renderBig = (player) => {
    const v = bigStat.value(player)
    return bigStat.fmt ? bigStat.fmt(v) : v
  }

  return (
    <section className="explorer">
      <header className="page-head">
        <h1 className="page-title">Who's worth picking?</h1>
        <p className="page-sub">
          {rows.length} {rows.length === 1 ? 'player' : 'players'}, ranked by {sort.label.toLowerCase()}.
        </p>
      </header>

      <div className="composer">
        <label className="composer__field">
          <MagnifyingGlass size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search a player, team or position"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search players"
          />
        </label>
        <div className="composer__row">
          <Select
            className="fpill"
            aria-label="Position"
            value={positionFilter}
            onChange={setPositionFilter}
            options={[
              { value: 'all', label: 'All positions' },
              ...positions.map((pos) => ({ value: String(pos.id), label: pos.plural_name })),
            ]}
          />
          <Select
            className="fpill"
            aria-label="Minimum price"
            value={minPrice}
            onChange={(next) => {
              setMinPrice(next)
              if (next > maxPrice) setMaxPrice(next)
            }}
            options={priceSteps.map((c) => ({ value: c, label: `From ${formatPrice(c)}` }))}
          />
          <Select
            className="fpill"
            aria-label="Maximum price"
            value={maxPrice}
            onChange={(next) => {
              setMaxPrice(next)
              if (next < minPrice) setMinPrice(next)
            }}
            options={priceSteps.map((c) => ({ value: c, label: `To ${formatPrice(c)}` }))}
          />
          <Select
            className="fpill"
            aria-label="Sort by"
            value={sortKey}
            onChange={setSortKey}
            options={SORTS.filter((s) => s.key !== 'name').map((s) => ({ value: s.key, label: `Sort · ${s.label}` }))}
          />
          <button type="button" className="btn btn--ghost" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </div>

      {featured &&
        (() => {
          const team = teamsById.get(featured.team)
          const position = positionsById.get(featured.element_type)
          const color = clubColor(team?.short_name)
          return (
            <button
              type="button"
              className="feature"
              style={{ '--c': color }}
              onClick={() => setDetail(featured)}
            >
              <span className="feature__glow" />
              <span className="feature__body">
                <span className="feature__kicker">Leading · {sort.label}</span>
                <span className="feature__name">
                  {featured.first_name} {featured.second_name}
                </span>
                <span className="feature__meta">
                  <span className={`pos pos--${position?.singular_name_short}`}>
                    {position?.singular_name_short}
                  </span>
                  {team?.name} · {formatPrice(featured.now_cost)}
                </span>
                <span className="feature__stats">
                  <span className="feature__big">
                    <span className="n">{featured.total_points}</span>
                    <span className="l">Points</span>
                  </span>
                  <span className="feature__s"><span className="n">{featured.form}</span><span className="l">Form</span></span>
                  <span className="feature__s"><span className="n">{featured.selected_by_percent}%</span><span className="l">Owned</span></span>
                  <span className="feature__s"><span className="n">{featured.expected_goal_involvements}</span><span className="l">xGI</span></span>
                </span>
              </span>
              <img
                className="feature__photo"
                src={playerPhotoUrl(featured, '250x250')}
                alt=""
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </button>
          )
        })()}

      <div className="rank-head">
        <span>{featured ? 'Ranked' : 'Players'}</span>
        <span>{sort.short || 'Pts'}</span>
      </div>

      <ul className="xrows">
        {listRows.map((player, i) => {
          const team = teamsById.get(player.team)
          const position = positionsById.get(player.element_type)
          const color = clubColor(team?.short_name)
          const selected = compareIds.includes(player.id)
          return (
            <li key={player.id}>
              <div
                className="xrow"
                style={{ '--c': color }}
                role="button"
                tabIndex={0}
                onClick={() => setDetail(player)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setDetail(player)
                  }
                }}
              >
                <span className="xrow__rank">{featured ? i + 2 : i + 1}</span>
                <label
                  className={`xrow__pick${selected ? ' is-on' : ''}`}
                  title="Add to comparison"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={!selected && compareIds.length >= MAX_COMPARE}
                    onChange={() => toggleCompare(player.id)}
                    aria-label={`Compare ${player.web_name}`}
                  />
                  <Avatar player={player} color={color} />
                </label>
                <span className="xrow__who">
                  <span className="xrow__name">{player.web_name}</span>
                  <span className="xrow__meta">
                    <span className="xrow__club">
                      <span className="xrow__dot" style={{ background: color }} />
                      {team?.short_name}
                    </span>
                    <span className={`pos pos--${position?.singular_name_short}`}>
                      {position?.singular_name_short}
                    </span>
                  </span>
                </span>
                <span className="xrow__spacer" />
                <span className="xrow__metric">
                  <span className="n">{player.form}</span>
                  <span className="l">Form</span>
                </span>
                <span className="xrow__metric xrow__metric--hide-sm">
                  <span className="n">{formatPrice(player.now_cost)}</span>
                  <span className="l">Price</span>
                </span>
                <span className="xrow__pts">
                  <span className="n">{renderBig(player)}</span>
                  <span className="l">{bigStat.short || 'Pts'}</span>
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      {rows.length === 0 && <p className="empty">No players match these filters.</p>}

      {compareIds.length > 0 && (
        <div className="cmp-bar" role="status">
          <span className="cmp-bar__count">
            {compareIds.length} selected
            {compareIds.length >= MAX_COMPARE && ' (max)'}
          </span>
          <span className="cmp-bar__names">
            {comparePlayers.map((p) => p.web_name).join(', ')}
          </span>
          <button
            type="button"
            className="btn btn--primary"
            disabled={compareIds.length < 2}
            title={compareIds.length < 2 ? 'Pick at least two players' : undefined}
            onClick={() => setComparing(true)}
          >
            Compare
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setCompareIds([])}>
            Clear
          </button>
        </div>
      )}

      {comparing && comparePlayers.length >= 2 && (
        <PlayerCompare
          players={comparePlayers}
          onClose={() => setComparing(false)}
          onRemove={(id) => {
            const next = compareIds.filter((x) => x !== id)
            setCompareIds(next)
            if (next.length < 2) setComparing(false)
          }}
        />
      )}

      {detail && <PlayerDetail player={detail} onClose={() => setDetail(null)} />}
    </section>
  )
}
