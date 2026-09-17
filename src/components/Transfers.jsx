import { Lightning, MagnifyingGlass, Plus, X } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import { useSquad } from '../hooks/useSquad'
import { formatPrice, nextFixturesForTeam } from '../lib/fpl'
import { addRejectionReason, BUDGET, firstEmptySlot, findPlayerSlot, SQUAD_SHAPE, squadCost } from '../lib/squad'
import { clubColor } from '../lib/clubColors'
import PlayerDetail from './PlayerDetail'

const value = (p) => (p.now_cost ? p.total_points / (p.now_cost / 10) : 0)
const POS_ORDER = [1, 2, 3, 4]
const POS_SHORT = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' }

function Strip({ teamId, fixtures, fromEvent, teamsById }) {
  const next = nextFixturesForTeam(fixtures, teamId, fromEvent, 3)
  return (
    <span className="efx">
      {next.map((f, i) => (
        <span key={i} className={`efx__c efx__c--d${f.difficulty}`}>
          {teamsById.get(f.opponentId)?.short_name}
        </span>
      ))}
    </span>
  )
}

export default function Transfers({ onNavigate }) {
  const { players, playersById, teamsById, positionsById, fixtures, currentEvent } = useFpl()
  const fromEvent = currentEvent?.id ?? 1
  const { squad, setSlot, clearSlot, reset } = useSquad()
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState('all')
  const [detail, setDetail] = useState(null)

  const cost = squadCost(squad, playersById)
  const bank = BUDGET - cost
  const picked = POS_ORDER.reduce((n, pos) => n + squad[pos].filter(Boolean).length, 0)

  const market = useMemo(() => {
    const q = search.trim().toLowerCase()
    return players
      .filter((p) => {
        if (posFilter !== 'all' && p.element_type !== Number(posFilter)) return false
        if (q && !`${p.first_name} ${p.second_name} ${p.web_name}`.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => value(b) - value(a) || a.id - b.id)
      .slice(0, 60)
  }, [players, search, posFilter])

  function addPlayer(player) {
    const slot = firstEmptySlot(squad, player.element_type)
    if (slot === -1) return
    setSlot(player.element_type, slot, player.id)
  }

  return (
    <section className="transfers">
      <header className="tr-head">
        <div>
          <h1 className="page-title">Transfers</h1>
          <p className="page-sub">Build and refine your 15 under the £100.0m budget.</p>
        </div>
        <div className="tr-chips">
          <span className="tr-chip"><Lightning size={14} aria-hidden="true" /> Wildcard</span>
          <span className="tr-chip tr-chip--muted">1 free transfer</span>
        </div>
      </header>

      <div className="tr-grid">
        {/* Your squad, grouped by position, each filled slot removable */}
        <div className="tr-squad">
          {POS_ORDER.map((pos) => (
            <div className="tr-line" key={pos}>
              <span className="tr-line__label">{POS_SHORT[pos]}</span>
              <div className="tr-line__slots">
                {Array.from({ length: SQUAD_SHAPE[pos] }).map((_, i) => {
                  const id = squad[pos][i]
                  const p = id ? playersById.get(id) : null
                  const team = p ? teamsById.get(p.team) : null
                  const color = team ? clubColor(team.short_name) : 'var(--warm-400)'
                  return p ? (
                    <div className="tr-slot" key={i} style={{ '--c': color }}>
                      <button type="button" className="tr-slot__body" onClick={() => setDetail(p)}>
                        <span className="tr-dot" style={{ background: color }} />
                        <span className="tr-slot__name">{p.web_name}</span>
                        <span className="tr-slot__price">{formatPrice(p.now_cost)}</span>
                      </button>
                      <button type="button" className="tr-slot__x" onClick={() => clearSlot(pos, i)} aria-label={`Remove ${p.web_name}`}>
                        <X size={12} weight="bold" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <div className="tr-slot tr-slot--empty" key={i}>+ Add {POS_SHORT[pos]}</div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Transfer market — the v3 intelligence, add on click */}
        <div className="tr-market">
          <div className="tr-market__filters">
            <label className="tr-search">
              <MagnifyingGlass size={15} aria-hidden="true" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the market" aria-label="Search players" />
            </label>
            <div className="tr-posfilter">
              {[['all', 'All'], ['1', 'GKP'], ['2', 'DEF'], ['3', 'MID'], ['4', 'FWD']].map(([v, l]) => (
                <button key={v} type="button" className={`tr-pos${posFilter === v ? ' is-on' : ''}`} onClick={() => setPosFilter(v)}>{l}</button>
              ))}
            </div>
          </div>
          <ul className="tr-mrows">
            {market.map((p) => {
              const team = teamsById.get(p.team)
              const color = clubColor(team?.short_name)
              const owned = findPlayerSlot(squad, p.id) != null
              const reason = owned ? 'Already in your squad' : addRejectionReason(p, squad, playersById)
              return (
                <li key={p.id} className="tr-mrow" style={{ '--c': color }}>
                  <button type="button" className="tr-mrow__who" onClick={() => setDetail(p)}>
                    <span className="tr-dot" style={{ background: color }} />
                    <span className="tr-mrow__name">{p.web_name}</span>
                    <span className="tr-mrow__meta">{team?.short_name} · {positionsById.get(p.element_type)?.singular_name_short}</span>
                  </button>
                  <Strip teamId={p.team} fixtures={fixtures} fromEvent={fromEvent} teamsById={teamsById} />
                  <span className="tr-mrow__val">{value(p).toFixed(1)}</span>
                  <span className="tr-mrow__price">{formatPrice(p.now_cost)}</span>
                  <button
                    type="button"
                    className="tr-add"
                    disabled={Boolean(reason)}
                    title={reason || `Add ${p.web_name}`}
                    onClick={() => addPlayer(p)}
                  >
                    <Plus size={14} weight="bold" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Budget / transfer summary bar */}
      <div className="tr-bar">
        <span className="tr-bar__stat"><b>{picked}/15</b><i>Picked</i></span>
        <span className="tr-bar__stat"><b className={bank < 0 ? 'is-neg' : ''}>{formatPrice(bank)}</b><i>In the bank</i></span>
        <span className="tr-bar__stat"><b>1</b><i>Free transfers</i></span>
        <span className="tr-bar__spacer" />
        <button type="button" className="btn btn--ghost" onClick={reset}>Reset</button>
        <button type="button" className="btn btn--primary" onClick={() => onNavigate?.('team')}>View on pitch</button>
      </div>

      {detail && <PlayerDetail player={detail} onClose={() => setDetail(null)} />}
    </section>
  )
}
