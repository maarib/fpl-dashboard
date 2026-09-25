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
import { createPortal } from 'react-dom'
import { useFpl } from '../hooks/useFpl'
import { useSquad } from '../hooks/useSquad'
import { formatPrice, nextFixtureForTeam, toNumber } from '../lib/fpl'
import { teamBadgeUrl, teamKitUrl } from '../lib/images'
import {
  BUDGET,
  SQUAD_SHAPE,
  addRejectionReason,
  findPlayerSlot,
  firstEmptySlot,
  parseFormation,
  squadCost,
} from '../lib/squad'
import PitchSurface from './PitchSurface'
import PlayerDetail from './PlayerDetail'
import '../styles/teamv2.css'

const POS_SHORT = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' }
const SQUAD_TOTAL = Object.values(SQUAD_SHAPE).reduce((a, b) => a + b, 0)

/* -------------------------------------------------------------------------- */
/*  Pitch player card                                                          */
/* -------------------------------------------------------------------------- */

function fixtureLabel(fx, teamsById) {
  if (!fx) return '—'
  const opp = teamsById.get(fx.opponentId)?.short_name ?? '???'
  return `${opp} (${fx.isHome ? 'H' : 'A'})`
}

function PitchCard({
  id, playersById, teamsById, fixtures, fromEvent, isGK,
  isCaptain, isVice, transfers, swapping, target, onRemove, onClick, label, order,
}) {
  const swapCls = `${swapping ? ' is-swapping' : ''}${target ? ' is-swaptarget' : ''}`
  const player = id ? playersById.get(id) : null
  if (!player) {
    return (
      <button type="button" className={`t2-card t2-card--empty${swapCls}`} onClick={onClick}>
        <span className="t2-card__plus">+</span>
        <span className="t2-card__name">Add {label ?? ''}</span>
      </button>
    )
  }
  const team = teamsById.get(player.team)
  const fx = nextFixtureForTeam(fixtures, player.team, fromEvent)
  const kit = teamKitUrl(team, isGK, 110)
  return (
    <div className={`t2-card${swapCls}`}>
      {transfers && (
        <button type="button" className="t2-card__x" aria-label={`Remove ${player.web_name}`} onClick={onRemove}>
          <X size={11} weight="bold" aria-hidden="true" />
        </button>
      )}
      {isCaptain && <span className="t2-card__badge">C</span>}
      {isVice && <span className="t2-card__badge t2-card__badge--v">V</span>}
      <button type="button" className="t2-card__body" onClick={onClick}>
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
      </button>
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

function MarketRail({ players, teamsById, positionsById, fixtures, fromEvent, squad, playersById, onPick }) {
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
              const owned = findPlayerSlot(squad, p.id) != null
              const reason = owned ? 'Already in your squad' : addRejectionReason(p, squad, playersById)
              return (
                <tr key={p.id} className={owned ? 'is-owned' : ''}>
                  <td className="t2-tbl__player">
                    <button type="button" className="t2-prow" onClick={() => !reason && onPick(p)} disabled={Boolean(reason)} title={reason || `Add ${p.web_name}`}>
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
/*  The page — now the real My Team, backed by the persisted squad             */
/* -------------------------------------------------------------------------- */

export default function TeamV2() {
  const { players, playersById, teamsById, positionsById, fixtures, events, currentEvent } = useFpl()
  const fromEvent = currentEvent?.id ?? 1
  const { formation, squad, captain, viceCaptain, setSlot, clearSlot, swapSlots, reset, setCaptain, setViceCaptain } = useSquad()

  const [mode, setMode] = useState('default') // 'default' | 'transfers'
  const [opponentView, setOpponentView] = useState(false)
  const [menu, setMenu] = useState(null) // { pos, index, id, isStarter, x, y }
  const [swapFrom, setSwapFrom] = useState(null) // { pos, index } mid-substitution
  const [detail, setDetail] = useState(null)

  const need = useMemo(() => parseFormation(formation), [formation])

  // A substitution swaps a starter with a bench player in the SAME position, so
  // the formation stays legal. A valid target is therefore same-position and on
  // the opposite side of the starter/bench line from the player being moved.
  function isSwapTarget(pos, index) {
    if (!swapFrom || swapFrom.pos !== pos || swapFrom.index === index) return false
    return (swapFrom.index < need[pos]) !== (index < need[pos])
  }

  const cost = squadCost(squad, playersById)
  const bank = BUDGET - cost
  const picked = [1, 2, 3, 4].reduce((n, pos) => n + squad[pos].filter(Boolean).length, 0)

  function addPlayer(player) {
    const slot = firstEmptySlot(squad, player.element_type)
    if (slot !== -1) setSlot(player.element_type, slot, player.id)
  }

  function openSlotToAdd() {
    setMode('transfers')
  }

  const deadlineDate = currentEvent?.deadline_time
    ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(currentEvent.deadline_time))
    : null

  const mdEvents = useMemo(() => {
    const evs = events ?? []
    const idx = Math.max(0, evs.findIndex((e) => e.id === fromEvent))
    return evs.slice(Math.max(0, idx - 1), idx + 7)
  }, [events, fromEvent])

  // Build one card for a squad slot, wiring the real mutations.
  function renderCard(pos, index, { isGK = false, order } = {}) {
    const id = squad[pos][index]
    const isStarter = index < need[pos]
    const swapping = swapFrom?.pos === pos && swapFrom?.index === index
    const target = isSwapTarget(pos, index)

    const onClick = (e) => {
      // Mid-substitution, a click means "swap with this slot" or "cancel".
      if (swapFrom) {
        if (target) swapSlots(pos, swapFrom.index, index)
        setSwapFrom(null)
        return
      }
      if (!id) { openSlotToAdd(); return }
      if (mode !== 'default') { setDetail(playersById.get(id)); return }
      const r = e.currentTarget.getBoundingClientRect()
      setMenu({ pos, index, id, isStarter, x: r.left + r.width / 2, y: r.bottom + 4 })
    }

    return (
      <PitchCard
        key={`${pos}-${index}-${id ?? 'e'}`}
        id={id}
        playersById={playersById}
        teamsById={teamsById}
        fixtures={fixtures}
        fromEvent={fromEvent}
        isGK={isGK}
        isCaptain={captain === id}
        isVice={viceCaptain === id}
        transfers={mode === 'transfers'}
        swapping={swapping}
        target={target}
        onRemove={() => clearSlot(pos, index)}
        onClick={onClick}
        label={POS_SHORT[pos]}
        order={order}
      />
    )
  }

  // Rows top-to-bottom: FWD, MID, DEF (starters), then GK.
  const starterRows = [4, 3, 2].map((pos) =>
    Array.from({ length: need[pos] }, (_, i) => renderCard(pos, i)),
  )
  const gkRow = [renderCard(1, 0, { isGK: true })]

  // Bench: reserve GK first, then outfield subs in numbered order.
  const benchGk = renderCard(1, 1, { isGK: true })
  const benchOutfield = [2, 3, 4].flatMap((pos) =>
    Array.from({ length: SQUAD_SHAPE[pos] - need[pos] }, (_, i) => ({ pos, index: need[pos] + i })),
  )

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
        <div className={`t2-left${swapFrom ? ' is-swapmode' : ''}`}>
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
                <div className="t2-row" key={ri}>{row}</div>
              ))}
              <div className="t2-row t2-row--gk">{gkRow}</div>
            </div>
          </div>

          {/* Bench */}
          <div className="t2-bench">
            {benchGk}
            {benchOutfield.map((b, i) => renderCard(b.pos, b.index, { order: i + 1 }))}
          </div>

          {/* Action bar */}
          {mode === 'default' ? (
            swapFrom ? (
              <div className="t2-subbar">
                <span className="t2-subbar__hint">
                  <ArrowsLeftRight size={15} aria-hidden="true" />
                  Pick a highlighted player to {swapFrom.index < need[swapFrom.pos] ? 'bring on' : 'send off'}
                </span>
                <button type="button" className="t2-btn t2-btn--ghost" onClick={() => setSwapFrom(null)}>Cancel</button>
              </div>
            ) : (
              <div className="t2-actions">
                <button type="button" className="t2-btn t2-btn--go" onClick={() => setMode('transfers')}>
                  <ArrowsLeftRight size={15} aria-hidden="true" /> Make transfers
                </button>
              </div>
            )
          ) : (
            <div className="t2-trbar">
              <span className="t2-trstat"><i>Picked</i><b>{picked}/{SQUAD_TOTAL}</b></span>
              <span className="t2-trstat"><i>In the bank</i><b className={bank < 0 ? 'is-neg' : ''}>{formatPrice(bank)}</b></span>
              <span className="t2-trstat"><i>Squad value</i><b>{formatPrice(cost)}</b></span>
              <span className="t2-trbar__spacer" />
              <button type="button" className="t2-icon" onClick={reset} aria-label="Clear squad"><ArrowsClockwise size={16} aria-hidden="true" /></button>
              <button type="button" className="t2-btn t2-btn--go" onClick={() => setMode('default')}>Done</button>
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
            squad={squad}
            playersById={playersById}
            onPick={addPlayer}
          />
        )}
      </div>

      {/* Card action menu — portalled so it clears the pitch stacking context */}
      {menu && createPortal(
        <>
          <button type="button" className="t2-menuveil" aria-label="Close menu" onClick={() => setMenu(null)} />
          <div className="t2-cardmenu" role="menu" style={{ top: menu.y, left: menu.x }}>
            <button type="button" role="menuitem" onClick={() => { setDetail(playersById.get(menu.id)); setMenu(null) }}>View player</button>
            {menu.isStarter && (
              <>
                <button type="button" role="menuitem" onClick={() => { setCaptain(menu.id); setMenu(null) }}>
                  {captain === menu.id ? 'Captain ✓' : 'Make captain'}
                </button>
                <button type="button" role="menuitem" onClick={() => { setViceCaptain(menu.id); setMenu(null) }}>
                  {viceCaptain === menu.id ? 'Vice-captain ✓' : 'Make vice-captain'}
                </button>
              </>
            )}
            <button type="button" role="menuitem" onClick={() => { setSwapFrom({ pos: menu.pos, index: menu.index }); setMenu(null) }}>
              {menu.isStarter ? 'Substitute out' : 'Bring on'}
            </button>
            <button type="button" role="menuitem" className="is-danger" onClick={() => { clearSlot(menu.pos, menu.index); setMenu(null) }}>Remove player</button>
          </div>
        </>,
        document.body,
      )}

      {detail && <PlayerDetail player={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
