import {
  ArrowLeft,
  ArrowsClockwise,
  ArrowsLeftRight,
  CalendarBlank,
  CaretUpDown,
  Check,
  CheckCircle,
  Lightning,
  MagnifyingGlass,
  SoccerBall,
  Sparkle,
  Wallet,
  X,
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import { formatPrice, nextFixtureForTeam, toNumber } from '../lib/fpl'
import { teamBadgeUrl, teamKitUrl } from '../lib/images'
import { BUDGET } from '../lib/squad'
import PitchSurface from './PitchSurface'
import '../styles/teamv2.css'

/* -------------------------------------------------------------------------- */
/*  A believable, budget-legal demo XI so the exploration renders fully.       */
/*  Kept in local state — never touches the user's real saved squad.           */
/* -------------------------------------------------------------------------- */

const NEED = { 1: 2, 2: 5, 3: 5, 4: 3 } // total squad shape
const START = { 1: 1, 2: 4, 3: 3, 4: 3 } // 4-3-3 starters
const POS_SHORT = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' }

function buildDemoSquad(players) {
  const byPos = {}
  const cheapest = {}
  for (const pos of [1, 2, 3, 4]) {
    byPos[pos] = players
      .filter((p) => p.element_type === pos)
      .sort((a, b) => b.total_points - a.total_points || a.now_cost - b.now_cost)
    cheapest[pos] = Math.min(...byPos[pos].map((p) => p.now_cost))
  }

  const slotsLeft = { ...NEED }
  const squad = { 1: [], 2: [], 3: [], 4: [] }
  const clubCount = new Map()
  let spent = 0

  // What the still-empty slots must cost at minimum, if we take this pick now.
  const reserveExcluding = (curPos) => {
    let r = 0
    for (const pos of [1, 2, 3, 4]) {
      const left = slotsLeft[pos] - (pos === curPos ? 1 : 0)
      r += Math.max(0, left) * cheapest[pos]
    }
    return r
  }

  // Spend the premium budget on attackers first, fill keepers last.
  for (const pos of [4, 3, 2, 1]) {
    while (slotsLeft[pos] > 0) {
      const maxAffordable = BUDGET - spent - reserveExcluding(pos)
      const pick = byPos[pos].find(
        (p) =>
          !squad[pos].includes(p.id) &&
          p.now_cost <= maxAffordable &&
          (clubCount.get(p.team) ?? 0) < 3,
      )
      const chosen = pick ?? byPos[pos].find((p) => !squad[pos].includes(p.id))
      squad[pos].push(chosen.id)
      spent += chosen.now_cost
      clubCount.set(chosen.team, (clubCount.get(chosen.team) ?? 0) + 1)
      slotsLeft[pos] -= 1
    }
  }
  return squad
}

/* -------------------------------------------------------------------------- */
/*  Pitch player card                                                          */
/* -------------------------------------------------------------------------- */

function fixtureLabel(fx, teamsById) {
  if (!fx) return '—'
  const opp = teamsById.get(fx.opponentId)?.short_name ?? '???'
  return `${opp} (${fx.isHome ? 'H' : 'A'})`
}

function PitchCard({ id, playersById, teamsById, fixtures, fromEvent, isGK, isCaptain, isVice, transfers, onRemove, label, order }) {
  const player = id ? playersById.get(id) : null
  if (!player) {
    return (
      <div className="t2-card t2-card--empty">
        <span className="t2-card__plus">+</span>
        <span className="t2-card__name">Add {label ?? ''}</span>
      </div>
    )
  }
  const team = teamsById.get(player.team)
  const fx = nextFixtureForTeam(fixtures, player.team, fromEvent)
  const kit = teamKitUrl(team, isGK, 110)
  return (
    <div className="t2-card">
      {transfers && (
        <button type="button" className="t2-card__x" aria-label={`Remove ${player.web_name}`} onClick={onRemove}>
          <X size={11} weight="bold" aria-hidden="true" />
        </button>
      )}
      {isCaptain && <span className="t2-card__badge">C</span>}
      {isVice && <span className="t2-card__badge t2-card__badge--v">V</span>}
      {kit ? (
        <img className="t2-card__kit" src={kit} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
      ) : (
        <span className="t2-card__kit t2-card__kit--ph" />
      )}
      <span className="t2-card__name">
        {order != null && <i className="t2-card__order">{order}</i>}
        {player.web_name}
      </span>
      <span className="t2-card__fix">{fixtureLabel(fx, teamsById)}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Right rail — matches (default) and the transfer market (transfers)         */
/* -------------------------------------------------------------------------- */

function groupByDate(list) {
  const groups = new Map()
  for (const f of list) {
    const key = f.kickoff_time ? new Date(f.kickoff_time).toDateString() : 'TBC'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(f)
  }
  return [...groups.entries()]
}

function MatchesRail({ fixtures, currentEvent, teamsById }) {
  const evId = currentEvent?.id ?? 1
  const gwFixtures = fixtures
    .filter((f) => f.event === evId)
    .sort((a, b) => new Date(a.kickoff_time ?? 0) - new Date(b.kickoff_time ?? 0))
  const groups = groupByDate(gwFixtures)

  const fmtDate = (key) =>
    key === 'TBC'
      ? 'Date to be confirmed'
      : new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(key))
  const fmtTime = (iso) =>
    iso ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : 'TBC'

  return (
    <aside className="t2-rail">
      <div className="t2-rail__head">
        <span className="t2-rail__tab"><SoccerBall size={13} weight="fill" aria-hidden="true" /> Matches</span>
      </div>
      <div className="t2-rail__scroll">
        {groups.length === 0 && <p className="t2-rail__empty">No fixtures scheduled for this gameweek.</p>}
        {groups.map(([key, list]) => (
          <div key={key} className="t2-mgroup">
            <div className="t2-mgroup__date">{fmtDate(key)}</div>
            {list.map((f) => {
              const home = teamsById.get(f.team_h)
              const away = teamsById.get(f.team_a)
              return (
                <div key={f.id} className="t2-match">
                  <span className="t2-match__team t2-match__team--h">
                    <span className="t2-match__name">{home?.name}</span>
                    {teamBadgeUrl(home, 50) && <img src={teamBadgeUrl(home, 50)} alt="" loading="lazy" />}
                  </span>
                  <span className="t2-match__time">{fmtTime(f.kickoff_time)}</span>
                  <span className="t2-match__team t2-match__team--a">
                    {teamBadgeUrl(away, 50) && <img src={teamBadgeUrl(away, 50)} alt="" loading="lazy" />}
                    <span className="t2-match__name">{away?.name}</span>
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}

const value = (p) => (p.now_cost ? p.total_points / (p.now_cost / 10) : 0)
const COLS = [
  { key: 'now_cost', label: 'Price', get: (p) => p.now_cost, fmt: (p) => formatPrice(p.now_cost) },
  { key: 'total_points', label: 'Total pts', get: (p) => p.total_points, fmt: (p) => p.total_points },
  { key: 'selected', label: 'Selected', get: (p) => toNumber(p.selected_by_percent), fmt: (p) => `${p.selected_by_percent}%` },
  { key: 'event_points', label: 'GW pts', get: (p) => p.event_points ?? 0, fmt: (p) => p.event_points ?? 0 },
  { key: 'value', label: 'Pts / £m', get: (p) => value(p), fmt: (p) => value(p).toFixed(1) },
]

function MarketRail({ players, teamsById, positionsById, fixtures, fromEvent, ownedIds, onPick }) {
  const [search, setSearch] = useState('')
  const [pos, setPos] = useState('all')
  const [sort, setSort] = useState({ key: 'total_points', dir: -1 })

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const col = COLS.find((c) => c.key === sort.key) ?? COLS[1]
    return players
      .filter((p) => (pos === 'all' ? true : p.element_type === Number(pos)))
      .filter((p) => (q ? `${p.first_name} ${p.second_name} ${p.web_name}`.toLowerCase().includes(q) : true))
      .sort((a, b) => (col.get(a) - col.get(b)) * sort.dir || b.total_points - a.total_points)
      .slice(0, 50)
  }, [players, search, pos, sort])

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: -1 }))

  return (
    <aside className="t2-rail t2-rail--market">
      <div className="t2-market__filters">
        <div className="t2-pos">
          {['all', '1', '2', '3', '4'].map((v) => (
            <button key={v} type="button" className={`t2-pos__btn${pos === v ? ' is-on' : ''}`} onClick={() => setPos(v)}>
              {v === 'all' ? 'All' : POS_SHORT[v]}
            </button>
          ))}
        </div>
        <label className="t2-search">
          <MagnifyingGlass size={14} aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players" aria-label="Search players" />
        </label>
      </div>

      <div className="t2-tbl__wrap">
        <table className="t2-tbl">
          <thead>
            <tr>
              <th className="t2-tbl__player">Players</th>
              {COLS.map((c) => (
                <th key={c.key}>
                  <button type="button" className={`t2-th${sort.key === c.key ? ' is-on' : ''}`} onClick={() => toggleSort(c.key)}>
                    {c.label}
                    <CaretUpDown size={11} aria-hidden="true" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const team = teamsById.get(p.team)
              const fx = nextFixtureForTeam(fixtures, p.team, fromEvent)
              const owned = ownedIds.has(p.id)
              return (
                <tr key={p.id} className={owned ? 'is-owned' : ''}>
                  <td className="t2-tbl__player">
                    <button type="button" className="t2-prow" onClick={() => !owned && onPick(p)} disabled={owned}>
                      <span className={`t2-prow__badge${owned ? ' is-owned' : ''}`}>
                        {owned ? <Check size={12} weight="bold" aria-hidden="true" /> : teamBadgeUrl(team, 50) && <img src={teamBadgeUrl(team, 50)} alt="" loading="lazy" />}
                      </span>
                      <span className="t2-prow__who">
                        <span className="t2-prow__name">{p.web_name}</span>
                        <span className="t2-prow__meta">
                          {team?.short_name} {fx ? `v ${teamsById.get(fx.opponentId)?.short_name} (${fx.isHome ? 'H' : 'A'})` : ''} · {positionsById.get(p.element_type)?.singular_name_short}
                        </span>
                      </span>
                    </button>
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className={`t2-tbl__num${sort.key === c.key ? ' is-on' : ''}`}>{c.fmt(p)}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </aside>
  )
}

/* -------------------------------------------------------------------------- */
/*  The page                                                                   */
/* -------------------------------------------------------------------------- */

export default function TeamV2() {
  const { players, playersById, teamsById, positionsById, fixtures, events, currentEvent } = useFpl()
  const fromEvent = currentEvent?.id ?? 1

  const [squad, setSquad] = useState(() => buildDemoSquad(players))
  const [mode, setMode] = useState('default') // 'default' | 'transfers'
  const [opponentView, setOpponentView] = useState(false)

  const ownedIds = useMemo(() => new Set([1, 2, 3, 4].flatMap((pos) => squad[pos].filter(Boolean))), [squad])

  const cost = useMemo(
    () => [1, 2, 3, 4].reduce((sum, pos) => sum + squad[pos].reduce((s, id) => s + (id ? playersById.get(id)?.now_cost ?? 0 : 0), 0), 0),
    [squad, playersById],
  )
  const bank = BUDGET - cost
  const picked = ownedIds.size

  // Captain / vice = the two highest scorers among the starting XI.
  const armband = useMemo(() => {
    const starters = [1, 2, 3, 4].flatMap((pos) => squad[pos].slice(0, START[pos]))
    const ranked = starters
      .map((id) => playersById.get(id))
      .filter(Boolean)
      .sort((a, b) => b.total_points - a.total_points)
    return { c: ranked[0]?.id, v: ranked[1]?.id }
  }, [squad, playersById])

  function removeId(targetId) {
    setSquad((s) => {
      const next = { 1: [...s[1]], 2: [...s[2]], 3: [...s[3]], 4: [...s[4]] }
      for (const pos of [1, 2, 3, 4]) {
        const i = next[pos].indexOf(targetId)
        if (i !== -1) next[pos][i] = null
      }
      return next
    })
  }

  function pickPlayer(player) {
    const pos = player.element_type
    setSquad((s) => {
      if (s[pos].filter(Boolean).length >= NEED[pos]) return s // position full
      const next = { ...s, [pos]: [...s[pos]] }
      const empty = next[pos].indexOf(null)
      if (empty !== -1) next[pos][empty] = player.id
      else next[pos].push(player.id)
      return next
    })
  }

  const resetSquad = () => setSquad(buildDemoSquad(players))

  // Rows top-to-bottom: FWD, MID, DEF, GK
  const starterRows = [4, 3, 2].map((pos) => squad[pos].slice(0, START[pos]))
  const gkRow = squad[1].slice(0, START[1])

  // Bench: reserve GK, then the outfield subs in position order
  const benchOutfield = [2, 3, 4].flatMap((pos) =>
    squad[pos].slice(START[pos]).map((id) => ({ id, pos })),
  )
  const benchGk = { id: squad[1][START[1]], pos: 1 }

  const cardProps = (id, isGK, extra = {}) => ({
    id,
    playersById,
    teamsById,
    fixtures,
    fromEvent,
    isGK,
    isCaptain: id === armband.c,
    isVice: id === armband.v,
    transfers: mode === 'transfers',
    onRemove: () => removeId(id),
    ...extra,
  })

  const deadlineDate = currentEvent?.deadline_time
    ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(currentEvent.deadline_time))
    : null

  // Matchday rail — a window around the current gameweek.
  const mdEvents = useMemo(() => {
    const evs = events ?? []
    const idx = Math.max(0, evs.findIndex((e) => e.id === fromEvent))
    return evs.slice(Math.max(0, idx - 1), idx + 7)
  }, [events, fromEvent])

  return (
    <div className="t2">
      {/* Matchday navigator */}
      <div className="t2-mdnav">
        <div className="t2-mdnav__rail">
          {mdEvents.map((e) => {
            const active = e.id === fromEvent
            const date = e.deadline_time
              ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(e.deadline_time))
              : ''
            return (
              <div key={e.id} className={`t2-md${active ? ' is-active' : ''}${e.finished ? ' is-done' : ''}`}>
                <span className="t2-md__gw">{e.name}</span>
                <span className="t2-md__sub">
                  {active ? (
                    <><Lightning size={11} weight="fill" aria-hidden="true" /> Make transfers</>
                  ) : e.finished ? (
                    <><CheckCircle size={11} weight="fill" aria-hidden="true" /> Finished</>
                  ) : (
                    <><CalendarBlank size={11} aria-hidden="true" /> {date}</>
                  )}
                </span>
              </div>
            )
          })}
        </div>
        <div className="t2-mdnav__total">
          <span className="t2-md__gw"><Wallet size={11} weight="fill" aria-hidden="true" /> Squad value</span>
          <span className="t2-md__total">{formatPrice(cost)}</span>
        </div>
      </div>

      <div className="t2-main">
        {/* LEFT — the pitch */}
        <div className="t2-left">
          {mode === 'default' ? (
            <div className="t2-teamhead">
              <h2 className="t2-teamhead__name">My Team</h2>
              {deadlineDate && (
                <span className="t2-teamhead__deadline">
                  <Lightning size={13} weight="fill" aria-hidden="true" /> Transfer deadline: {deadlineDate}
                </span>
              )}
            </div>
          ) : (
            <div className="t2-trhead">
              <button type="button" className="t2-back" onClick={() => setMode('default')} aria-label="Back to team">
                <ArrowLeft size={16} weight="bold" aria-hidden="true" />
              </button>
              <h2 className="t2-teamhead__name">Transfers</h2>
              <div className="t2-chips">
                <button type="button" className="t2-chip"><Lightning size={13} weight="fill" aria-hidden="true" /> Wildcard</button>
                <button type="button" className="t2-chip"><Sparkle size={13} weight="fill" aria-hidden="true" /> Free Hit</button>
              </div>
            </div>
          )}

          <div className="t2-pitch">
            {/* The turf from the early app — one SVG driven by a single
                perspective model (converging touchlines, compressing mow
                bands, trapezoid box, elliptical centre circle). The player
                cards sit flat over it in the formation rows. */}
            <PitchSurface />

            <button
              type="button"
              className={`t2-oppbtn${opponentView ? ' is-on' : ''}`}
              onClick={() => setOpponentView((v) => !v)}
            >
              <ArrowsLeftRight size={13} aria-hidden="true" /> Opponent
            </button>

            <div className="t2-pitch__grid">
              {starterRows.map((row, ri) => (
                <div className="t2-row" key={ri}>
                  {row.map((id, i) => (
                    <PitchCard key={`${ri}-${i}-${id ?? 'e'}`} {...cardProps(id, false)} label={POS_SHORT[[4, 3, 2][ri]]} />
                  ))}
                </div>
              ))}
              <div className="t2-row t2-row--gk">
                {gkRow.map((id, i) => (
                  <PitchCard key={`gk-${i}-${id ?? 'e'}`} {...cardProps(id, true)} label="GKP" />
                ))}
              </div>
            </div>
          </div>

          {/* Bench */}
          <div className="t2-bench">
            <PitchCard {...cardProps(benchGk.id, true)} label="GKP" />
            {benchOutfield.map((b, i) => (
              <PitchCard key={`b-${i}-${b.id ?? 'e'}`} {...cardProps(b.id, false)} label={POS_SHORT[b.pos]} order={i + 1} />
            ))}
          </div>

          {/* Action bar */}
          {mode === 'default' ? (
            <div className="t2-actions">
              <button type="button" className="t2-btn t2-btn--ghost"><ArrowsClockwise size={15} aria-hidden="true" /> Subs</button>
              <button type="button" className="t2-btn t2-btn--go" onClick={() => setMode('transfers')}>
                <ArrowsLeftRight size={15} aria-hidden="true" /> Transfers
              </button>
            </div>
          ) : (
            <div className="t2-trbar">
              <span className="t2-trstat"><i>Transfers</i><b>2 free</b></span>
              <span className="t2-trstat"><i>Remaining</i><b className={bank < 0 ? 'is-neg' : ''}>{formatPrice(bank)}</b></span>
              <span className="t2-trstat"><i>Picked</i><b>{picked}/15</b></span>
              <span className="t2-trbar__spacer" />
              <button type="button" className="t2-icon" onClick={resetSquad} aria-label="Reset squad"><ArrowsClockwise size={16} aria-hidden="true" /></button>
              <button type="button" className="t2-btn t2-btn--go" onClick={() => setMode('default')}>Confirm transfers</button>
            </div>
          )}
        </div>

        {/* RIGHT — matches or market */}
        {mode === 'default' ? (
          <MatchesRail fixtures={fixtures} currentEvent={currentEvent} teamsById={teamsById} />
        ) : (
          <MarketRail
            players={players}
            teamsById={teamsById}
            positionsById={positionsById}
            fixtures={fixtures}
            fromEvent={fromEvent}
            ownedIds={ownedIds}
            onPick={pickPlayer}
          />
        )}
      </div>
    </div>
  )
}
