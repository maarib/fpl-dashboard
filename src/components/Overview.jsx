import {
  ArrowRight,
  CaretRight,
  Confetti,
  Lightning,
  Newspaper,
  Plus,
  Trophy,
  Users,
  Warning,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import { useSquad } from '../hooks/useSquad'
import { toNumber } from '../lib/fpl'
import { playerPhotoUrl } from '../lib/images'
import { clubColor } from '../lib/clubColors'
import { SQUAD_SHAPE } from '../lib/squad'
import PlayerDetail from './PlayerDetail'

const value = (p) => (p.now_cost ? p.total_points / (p.now_cost / 10) : 0)
const SQUAD_TOTAL = Object.values(SQUAD_SHAPE).reduce((a, b) => a + b, 0)

function pad(n) {
  return String(n).padStart(2, '0')
}

/** "13 October, 12:45" in the reader's own timezone. */
function formatDeadlineDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Live countdown to the next deadline, as days / hours / minutes / seconds. */
function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!iso) return null
  const diff = new Date(iso).getTime() - now
  if (diff <= 0) return { passed: true }
  const s = Math.floor(diff / 1000)
  return {
    passed: false,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  }
}

/* -------------------------------------------------------------------------- */
/*  A ranked stat list — used inside the Stats card                            */
/* -------------------------------------------------------------------------- */

function StatRow({ rank, player, teamsById, positionsById, stat, onOpen }) {
  const team = teamsById.get(player.team)
  const position = positionsById.get(player.element_type)
  const color = clubColor(team?.short_name)
  return (
    <li>
      <button type="button" className="ov-stat" onClick={() => onOpen(player)}>
        <span className="ov-stat__rank">{rank}</span>
        <span className="pavatar pavatar--sm" style={{ '--c': color }}>
          <span className="pavatar__mono">{player.web_name.charAt(0)}</span>
          <img
            src={playerPhotoUrl(player, '110x140')}
            alt=""
            loading="lazy"
            onError={(e) => e.currentTarget.remove()}
          />
        </span>
        <span className="ov-stat__who">
          <span className="ov-stat__name">{player.web_name}</span>
          <span className="ov-stat__meta">
            {team?.short_name} · {position?.singular_name_short}
          </span>
        </span>
        <span className="ov-stat__val">{stat(player)}</span>
      </button>
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/*  Player-of-the-gameweek podium card                                         */
/* -------------------------------------------------------------------------- */

function PotmCard({ player, rank, teamsById, positionsById, onOpen }) {
  const team = teamsById.get(player.team)
  const position = positionsById.get(player.element_type)
  const color = clubColor(team?.short_name)
  return (
    <button
      type="button"
      className="ov-potm"
      style={{ '--c': color }}
      onClick={() => onOpen(player)}
    >
      <span className="pavatar pavatar--lg" style={{ '--c': color }}>
        <span className="ov-potm__medal" data-rank={rank}>{rank}</span>
        <span className="pavatar__mono">{player.web_name.charAt(0)}</span>
        <img
          src={playerPhotoUrl(player, '250x250')}
          alt=""
          loading="lazy"
          onError={(e) => e.currentTarget.remove()}
        />
      </span>
      <span className="ov-potm__name">{player.web_name}</span>
      <span className="ov-potm__meta">
        {team?.short_name} · {position?.singular_name_short}
      </span>
      <span className="ov-potm__pts">{player.event_points} pts</span>
    </button>
  )
}

/* -------------------------------------------------------------------------- */

export default function Overview({ onNavigate }) {
  const { players, teamsById, positionsById, events } = useFpl()
  const { squad } = useSquad()
  const [detail, setDetail] = useState(null)
  const [statTab, setStatTab] = useState('points')

  // The countdown targets the next deadline you can still act before.
  const nextDeadline = useMemo(() => {
    const now = Date.now()
    return (
      [...(events ?? [])]
        .filter((e) => e.deadline_time && new Date(e.deadline_time).getTime() > now)
        .sort((a, b) => new Date(a.deadline_time) - new Date(b.deadline_time))[0] ?? null
    )
  }, [events])
  const countdown = useCountdown(nextDeadline?.deadline_time)

  // The most recently completed gameweek — the one the recap talks about.
  const lastEvent = useMemo(() => {
    const evs = events ?? []
    return evs.find((e) => e.is_previous) ?? [...evs].filter((e) => e.finished).pop() ?? null
  }, [events])

  const boards = useMemo(() => {
    const byPoints = [...players].sort((a, b) => b.total_points - a.total_points || a.id - b.id).slice(0, 5)
    const bySelected = [...players]
      .sort((a, b) => toNumber(b.selected_by_percent) - toNumber(a.selected_by_percent) || a.id - b.id)
      .slice(0, 5)
    const started = players.filter((p) => p.minutes >= 90)
    const byValue = [...started].sort((a, b) => value(b) - value(a) || a.id - b.id).slice(0, 5)
    // Top hauls from the latest gameweek — the podium at the top of the recap.
    const gwStars = [...players]
      .filter((p) => p.event_points != null)
      .sort((a, b) => b.event_points - a.event_points || b.total_points - a.total_points)
      .slice(0, 3)
    return { byPoints, bySelected, byValue, gwStars }
  }, [players])

  // How complete the locally-saved XI is — drives the "team needs you" nudge.
  const picked = [1, 2, 3, 4].reduce((n, pos) => n + (squad[pos]?.filter(Boolean).length ?? 0), 0)
  const squadReady = picked >= SQUAD_TOTAL

  const statConfig = {
    points: { label: 'Top scorers', rows: boards.byPoints, stat: (p) => p.total_points },
    selected: { label: 'Most selected', rows: boards.bySelected, stat: (p) => `${p.selected_by_percent}%` },
    value: { label: 'Best value', rows: boards.byValue, stat: (p) => value(p).toFixed(1) },
  }
  const active = statConfig[statTab]

  return (
    <section className="ov">
      {/* Row 1 — deadline hero + a strategy promo, mirroring the CL top row */}
      <div className="ov-deadline">
        <span className="ov-deadline__kicker">Transfer deadline</span>
        {countdown && !countdown.passed ? (
          <div className="ov-clock">
            <span className="ov-clock__unit"><b>{pad(countdown.days)}</b><i>Days</i></span>
            <span className="ov-clock__sep">:</span>
            <span className="ov-clock__unit"><b>{pad(countdown.hours)}</b><i>Hours</i></span>
            <span className="ov-clock__sep">:</span>
            <span className="ov-clock__unit"><b>{pad(countdown.mins)}</b><i>Minutes</i></span>
          </div>
        ) : (
          <div className="ov-clock ov-clock--passed">Deadline passed — good luck this week.</div>
        )}
        {nextDeadline && (
          <span className="ov-deadline__date">
            {nextDeadline.name} · Deadline {formatDeadlineDate(nextDeadline.deadline_time)}
          </span>
        )}
      </div>

      <button type="button" className="ov-promo" onClick={() => onNavigate('fixtures')}>
        <span className="ov-promo__glow" aria-hidden="true"><Lightning size={22} weight="fill" /></span>
        <span className="ov-promo__body">
          <span className="ov-promo__title">Plan the run of fixtures</span>
          <span className="ov-promo__text">
            See who has the kindest schedule before you lock in your transfers.
          </span>
          <span className="ov-promo__cta">Open the fixture ticker <ArrowRight size={14} aria-hidden="true" /></span>
        </span>
      </button>

      {/* Row 2 — "your team needs you" banner */}
      <button
        type="button"
        className={`ov-alert${squadReady ? ' ov-alert--ok' : ''}`}
        onClick={() => onNavigate('team')}
      >
        <span className="ov-alert__icon" aria-hidden="true">
          {squadReady ? <Confetti size={20} weight="fill" /> : <Warning size={20} weight="fill" />}
        </span>
        <span className="ov-alert__body">
          <span className="ov-alert__title">
            {squadReady ? 'Your XI is ready' : 'Your team needs you'}
          </span>
          <span className="ov-alert__text">
            {squadReady
              ? 'All 15 picked. Set your captain and starting eleven before the deadline.'
              : `${picked} of ${SQUAD_TOTAL} picked — finish building your squad before the deadline.`}
          </span>
        </span>
        <span className="ov-alert__chip">{squadReady ? 'View team' : `${picked}/${SQUAD_TOTAL}`}</span>
        <CaretRight size={16} className="ov-alert__caret" aria-hidden="true" />
      </button>

      {/* Row 3 — leagues (framed) + last gameweek recap (real, league-wide) */}
      <section className="ov-card ov-leagues">
        <header className="ov-card__head">
          <h2 className="ov-card__title">Your leagues</h2>
        </header>
        <p className="ov-empty">
          Mini-leagues arrive with accounts. For now, rank yourself against the global
          averages below.
        </p>
        <button type="button" className="ov-join" onClick={() => onNavigate('team')}>
          <Plus size={16} aria-hidden="true" /> Create or join a league
        </button>
      </section>

      <section className="ov-card ov-recap">
        <header className="ov-card__head">
          <h2 className="ov-card__title">{lastEvent ? lastEvent.name : 'Last gameweek'}</h2>
          <span className="ov-card__note">Global</span>
        </header>
        {lastEvent ? (
          <ul className="ov-recap__list">
            <li><span>Average score</span><b>{lastEvent.average_entry_score ?? '—'}</b></li>
            <li><span>Highest score</span><b>{lastEvent.highest_score ?? '—'}</b></li>
            <li>
              <span>Most captained</span>
              <b>{players.find((p) => p.id === lastEvent.most_captained)?.web_name ?? '—'}</b>
            </li>
          </ul>
        ) : (
          <p className="ov-empty">The season hasn’t kicked off yet — check back after Gameweek 1.</p>
        )}
        <button type="button" className="ov-card__link" onClick={() => onNavigate('players')}>
          View the players <ArrowRight size={14} aria-hidden="true" />
        </button>
      </section>

      {/* Row 4 — players of the gameweek podium */}
      <section className="ov-card ov-podium">
        <header className="ov-card__head">
          <h2 className="ov-card__title">Players of the gameweek</h2>
          {lastEvent && <span className="ov-card__note">{lastEvent.name}</span>}
        </header>
        <div className="ov-podium__grid">
          {boards.gwStars.map((p, i) => (
            <PotmCard
              key={p.id}
              player={p}
              rank={i + 1}
              teamsById={teamsById}
              positionsById={positionsById}
              onOpen={setDetail}
            />
          ))}
        </div>
        <button type="button" className="ov-card__link" onClick={() => onNavigate('players')}>
          <Trophy size={14} aria-hidden="true" /> See the full standings
        </button>
      </section>

      {/* Row 5 — stats with a tabbed carousel */}
      <section className="ov-card ov-stats">
        <header className="ov-card__head">
          <h2 className="ov-card__title">Stats</h2>
          <div className="ov-tabs" role="tablist" aria-label="Stat category">
            {Object.entries(statConfig).map(([id, cfg]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={statTab === id}
                className={`ov-tab${statTab === id ? ' is-on' : ''}`}
                onClick={() => setStatTab(id)}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </header>
        <ul className="ov-stat__list">
          {active.rows.map((p, i) => (
            <StatRow
              key={p.id}
              rank={i + 1}
              player={p}
              teamsById={teamsById}
              positionsById={positionsById}
              stat={active.stat}
              onOpen={setDetail}
            />
          ))}
        </ul>
        <button type="button" className="ov-card__link" onClick={() => onNavigate('players')}>
          Show more <ArrowRight size={14} aria-hidden="true" />
        </button>
      </section>

      {/* Row 6 — news & tips (framed navigational cards) */}
      <section className="ov-card ov-news">
        <header className="ov-card__head">
          <h2 className="ov-card__title">News &amp; tips</h2>
        </header>
        <div className="ov-news__grid">
          <button type="button" className="ov-news__item" onClick={() => onNavigate('players')}>
            <span className="ov-news__thumb" data-kind="scout"><Users size={20} weight="fill" /></span>
            <span className="ov-news__cap">Scout the best-value picks this week</span>
          </button>
          <button type="button" className="ov-news__item" onClick={() => onNavigate('fixtures')}>
            <span className="ov-news__thumb" data-kind="fix"><Lightning size={20} weight="fill" /></span>
            <span className="ov-news__cap">Fixture swings to target and avoid</span>
          </button>
          <button type="button" className="ov-news__item" onClick={() => onNavigate('transfers')}>
            <span className="ov-news__thumb" data-kind="news"><Newspaper size={20} weight="fill" /></span>
            <span className="ov-news__cap">Plan your transfers before the deadline</span>
          </button>
        </div>
      </section>

      {detail && <PlayerDetail player={detail} onClose={() => setDetail(null)} />}
    </section>
  )
}
