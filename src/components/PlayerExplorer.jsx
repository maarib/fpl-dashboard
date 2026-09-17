import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import PlayerDetail from './PlayerDetail'
import Select from './Select'
import PlayerCompare from './PlayerCompare'
import { useFpl } from '../hooks/useFpl'
import { formatPrice, nextFixturesForTeam, toNumber } from '../lib/fpl'
import { playerPhotoUrl } from '../lib/images'
import { clubColor } from '../lib/clubColors'

// Value = points per £m. The single smartest FPL metric — it surfaces the cheap
// high-scorers a points-only sort buries — so it sorts by default.
const value = (p) => (p.now_cost ? p.total_points / (p.now_cost / 10) : 0)

// Sortable columns. Each is both a header and a sort key.
const SORTS = [
  { key: 'value', label: 'Value', short: 'Value', get: value, fmt: (v) => v.toFixed(1) },
  { key: 'total_points', label: 'Pts', short: 'Pts', get: (p) => p.total_points },
  { key: 'form', label: 'Form', short: 'Form', get: (p) => toNumber(p.form) },
  { key: 'now_cost', label: '£m', short: '£m', get: (p) => p.now_cost, fmt: formatPrice },
  { key: 'selected', label: 'Owned', short: 'Own', get: (p) => toNumber(p.selected_by_percent), fmt: (v) => `${v}%` },
]
const SORT_BY_KEY = new Map(SORTS.map((s) => [s.key, s]))

function Avatar({ player, color }) {
  return (
    <span className="pavatar" style={{ '--c': color }}>
      <span className="pavatar__mono">{player.web_name.charAt(0)}</span>
      <img src={playerPhotoUrl(player, '110x140')} alt="" loading="lazy" onError={(e) => e.currentTarget.remove()} />
    </span>
  )
}

/** A player's next 3 fixtures as difficulty-coloured cells. */
function FixtureStrip({ teamId, fixtures, fromEvent, teamsById }) {
  const next = nextFixturesForTeam(fixtures, teamId, fromEvent, 3)
  return (
    <span className="efx">
      {next.length === 0 && <span className="efx__none">—</span>}
      {next.map((f, i) => {
        const opp = teamsById.get(f.opponentId)
        return (
          <span
            key={i}
            className={`efx__c efx__c--d${f.difficulty}`}
            title={`${opp?.name} (${f.isHome ? 'H' : 'A'}) · difficulty ${f.difficulty}`}
          >
            {opp?.short_name}
          </span>
        )
      })}
    </span>
  )
}

export default function PlayerExplorer() {
  const { players, positions, teamsById, positionsById, fixtures, currentEvent } = useFpl()
  const fromEvent = currentEvent?.id ?? 1

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
  const [sort, setSort] = useState({ key: 'value', dir: 'desc' })
  const [detail, setDetail] = useState(null)

  const MAX_COMPARE = 4
  const [compareIds, setCompareIds] = useState([])
  const [comparing, setComparing] = useState(false)

  const toggleCompare = (id) =>
    setCompareIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX_COMPARE ? ids : [...ids, id],
    )
  const comparePlayers = compareIds.map((id) => players.find((p) => p.id === id)).filter(Boolean)

  const sortDef = SORT_BY_KEY.get(sort.key)

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = players.filter((p) => {
      if (positionFilter !== 'all' && p.element_type !== Number(positionFilter)) return false
      if (p.now_cost < minPrice || p.now_cost > maxPrice) return false
      if (query) {
        const hay = `${p.first_name} ${p.second_name} ${p.web_name}`.toLowerCase()
        if (!hay.includes(query)) return false
      }
      return true
    })
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const cmp = sortDef.get(a) - sortDef.get(b)
      return cmp !== 0 ? cmp * factor : a.id - b.id
    })
  }, [players, positionFilter, minPrice, maxPrice, search, sort, sortDef])

  const maxValue = useMemo(() => Math.max(1, ...rows.map(value)), [rows])

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  }
  function resetFilters() {
    setPositionFilter('all')
    setMinPrice(priceBounds.min)
    setMaxPrice(priceBounds.max)
    setSearch('')
  }

  const featured = !search.trim() && rows.length > 0 ? rows[0] : null
  const listRows = featured ? rows.slice(1) : rows

  const Header = ({ colKey }) => {
    const def = SORT_BY_KEY.get(colKey)
    const active = sort.key === colKey
    return (
      <button type="button" className={`ecol ecol--${colKey}${active ? ' ecol--active' : ''}`} onClick={() => toggleSort(colKey)}>
        {def.short}
        {active && <CaretDown size={10} weight="bold" style={{ transform: sort.dir === 'asc' ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />}
      </button>
    )
  }

  return (
    <section className="explorer">
      <header className="page-head">
        <h1 className="page-title">Who's worth picking?</h1>
        <p className="page-sub">
          {rows.length} {rows.length === 1 ? 'player' : 'players'}, ranked by {sortDef.label.toLowerCase()} — not just points.
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
            onChange={(next) => { setMinPrice(next); if (next > maxPrice) setMaxPrice(next) }}
            options={priceSteps.map((c) => ({ value: c, label: `From ${formatPrice(c)}` }))}
          />
          <Select
            className="fpill"
            aria-label="Maximum price"
            value={maxPrice}
            onChange={(next) => { setMaxPrice(next); if (next < minPrice) setMinPrice(next) }}
            options={priceSteps.map((c) => ({ value: c, label: `To ${formatPrice(c)}` }))}
          />
          <button type="button" className="btn btn--ghost" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {featured &&
        (() => {
          const team = teamsById.get(featured.team)
          const position = positionsById.get(featured.element_type)
          const color = clubColor(team?.short_name)
          return (
            <button type="button" className="feature" style={{ '--c': color }} onClick={() => setDetail(featured)}>
              <span className="feature__glow" />
              <span className="feature__body">
                <span className="feature__kicker">Top by {sortDef.label.toLowerCase()}</span>
                <span className="feature__name">{featured.first_name} {featured.second_name}</span>
                <span className="feature__meta">
                  <span className={`pos pos--${position?.singular_name_short}`}>{position?.singular_name_short}</span>
                  {team?.name} · {formatPrice(featured.now_cost)}
                </span>
                <span className="feature__stats">
                  <span className="feature__big"><span className="n">{featured.total_points}</span><span className="l">Points</span></span>
                  <span className="feature__s"><span className="n">{value(featured).toFixed(1)}</span><span className="l">Pts / £m</span></span>
                  <span className="feature__s"><span className="n">{featured.form}</span><span className="l">Form</span></span>
                  <span className="feature__s"><span className="n">{featured.selected_by_percent}%</span><span className="l">Owned</span></span>
                </span>
                <span className="feature__fx">
                  <FixtureStrip teamId={featured.team} fixtures={fixtures} fromEvent={fromEvent} teamsById={teamsById} />
                </span>
              </span>
              <img className="feature__photo" src={playerPhotoUrl(featured, '250x250')} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </button>
          )
        })()}

      <div className="ethead">
        <span className="ethead__player">Player</span>
        <span className="ethead__fx">Next 3</span>
        <Header colKey="now_cost" />
        <Header colKey="form" />
        <Header colKey="value" />
        <Header colKey="total_points" />
      </div>

      <ul className="etable">
        {listRows.map((player, i) => {
          const team = teamsById.get(player.team)
          const position = positionsById.get(player.element_type)
          const color = clubColor(team?.short_name)
          const selected = compareIds.includes(player.id)
          return (
            <li key={player.id}>
              <div
                className="etrow"
                style={{ '--c': color }}
                role="button"
                tabIndex={0}
                onClick={() => setDetail(player)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetail(player) } }}
              >
                <span className="etrow__rank">{featured ? i + 2 : i + 1}</span>
                <label className={`etrow__pick${selected ? ' is-on' : ''}`} title="Add to comparison" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={!selected && compareIds.length >= MAX_COMPARE}
                    onChange={() => toggleCompare(player.id)}
                    aria-label={`Compare ${player.web_name}`}
                  />
                  <Avatar player={player} color={color} />
                </label>
                <span className="etrow__who">
                  <span className="etrow__name">{player.web_name}</span>
                  <span className="etrow__meta">
                    <span className="etrow__club"><span className="etrow__dot" style={{ background: color }} />{team?.short_name}</span>
                    <span className={`pos pos--${position?.singular_name_short}`}>{position?.singular_name_short}</span>
                  </span>
                </span>
                <FixtureStrip teamId={player.team} fixtures={fixtures} fromEvent={fromEvent} teamsById={teamsById} />
                <span className="etrow__num etrow__num--mut etrow__num--price">{formatPrice(player.now_cost)}</span>
                <span className="etrow__num etrow__num--mut etrow__num--form">{player.form}</span>
                <span className="etrow__val">
                  <span className="n">{value(player).toFixed(1)}</span>
                  <span className="bar"><i style={{ width: `${Math.min(100, (value(player) / maxValue) * 100)}%` }} /></span>
                </span>
                <span className="etrow__pts"><span className="n">{player.total_points}</span></span>
              </div>
            </li>
          )
        })}
      </ul>

      {rows.length === 0 && <p className="empty">No players match these filters.</p>}

      {compareIds.length > 0 && (
        <div className="cmp-bar" role="status">
          <span className="cmp-bar__count">{compareIds.length} selected{compareIds.length >= MAX_COMPARE && ' (max)'}</span>
          <span className="cmp-bar__names">{comparePlayers.map((p) => p.web_name).join(', ')}</span>
          <button type="button" className="btn btn--primary" disabled={compareIds.length < 2} title={compareIds.length < 2 ? 'Pick at least two players' : undefined} onClick={() => setComparing(true)}>Compare</button>
          <button type="button" className="btn btn--ghost" onClick={() => setCompareIds([])}>Clear</button>
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
