import { ArrowRight } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import { toNumber } from '../lib/fpl'
import { playerPhotoUrl } from '../lib/images'
import { clubColor } from '../lib/clubColors'
import PlayerDetail from './PlayerDetail'

const value = (p) => (p.now_cost ? p.total_points / (p.now_cost / 10) : 0)

function pad(n) {
  return String(n).padStart(2, '0')
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

function LeaderRow({ rank, player, teamsById, positionsById, stat, onOpen }) {
  const team = teamsById.get(player.team)
  const position = positionsById.get(player.element_type)
  const color = clubColor(team?.short_name)
  return (
    <li>
      <button type="button" className="lb-row" onClick={() => onOpen(player)}>
        <span className="lb-row__rank">{rank}</span>
        <span className="pavatar pavatar--sm" style={{ '--c': color }}>
          <span className="pavatar__mono">{player.web_name.charAt(0)}</span>
          <img src={playerPhotoUrl(player, '110x140')} alt="" loading="lazy" onError={(e) => e.currentTarget.remove()} />
        </span>
        <span className="lb-row__who">
          <span className="lb-row__name">{player.web_name}</span>
          <span className="lb-row__meta">
            <span className="lb-row__dot" style={{ background: color }} />
            {team?.short_name} · {position?.singular_name_short}
          </span>
        </span>
        <span className="lb-row__stat">{stat(player)}</span>
      </button>
    </li>
  )
}

function Leaderboard({ title, note, players, teamsById, positionsById, stat, onOpen }) {
  return (
    <section className="lb">
      <header className="lb__head">
        <h3 className="lb__title">{title}</h3>
        {note && <span className="lb__note">{note}</span>}
      </header>
      <ul className="lb__list">
        {players.map((p, i) => (
          <LeaderRow key={p.id} rank={i + 1} player={p} teamsById={teamsById} positionsById={positionsById} stat={stat} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  )
}

export default function Overview({ onNavigate }) {
  const { players, teamsById, positionsById, events } = useFpl()
  const [detail, setDetail] = useState(null)

  // The countdown targets the next deadline you can still act before — the
  // soonest event whose deadline is in the future — not the live gameweek
  // whose deadline has already passed.
  const nextDeadline = useMemo(() => {
    const now = Date.now()
    return (
      [...(events ?? [])]
        .filter((e) => e.deadline_time && new Date(e.deadline_time).getTime() > now)
        .sort((a, b) => new Date(a.deadline_time) - new Date(b.deadline_time))[0] ?? null
    )
  }, [events])
  const countdown = useCountdown(nextDeadline?.deadline_time)

  const boards = useMemo(() => {
    const byPoints = [...players].sort((a, b) => b.total_points - a.total_points || a.id - b.id).slice(0, 5)
    const started = players.filter((p) => p.minutes >= 90)
    const byValue = [...started].sort((a, b) => value(b) - value(a) || a.id - b.id).slice(0, 5)
    const byForm = [...players].sort((a, b) => toNumber(b.form) - toNumber(a.form) || a.id - b.id).slice(0, 5)
    return { byPoints, byValue, byForm }
  }, [players])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <section className="overview">
      <header className="page-head">
        <h1 className="page-title">{greeting}.</h1>
        <p className="page-sub">Your Premier League fantasy at a glance.</p>
      </header>

      {/* Deadline countdown — the most time-sensitive thing on the page */}
      <div className="deadline">
        <span className="deadline__kicker">Next deadline</span>
        <span className="deadline__gw">{nextDeadline?.name ?? 'Gameweek'}</span>
        {countdown && !countdown.passed ? (
          <div className="deadline__clock">
            <span><b>{pad(countdown.days)}</b><i>days</i></span>
            <span className="deadline__sep">:</span>
            <span><b>{pad(countdown.hours)}</b><i>hrs</i></span>
            <span className="deadline__sep">:</span>
            <span><b>{pad(countdown.mins)}</b><i>min</i></span>
            <span className="deadline__sep">:</span>
            <span><b>{pad(countdown.secs)}</b><i>sec</i></span>
          </div>
        ) : (
          <div className="deadline__clock deadline__clock--passed">Deadline passed — good luck.</div>
        )}
        <button type="button" className="btn btn--primary deadline__cta" onClick={() => onNavigate('team')}>
          Manage your team <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="lb-grid">
        <Leaderboard
          title="Best value"
          note="pts / £m"
          players={boards.byValue}
          teamsById={teamsById}
          positionsById={positionsById}
          stat={(p) => value(p).toFixed(1)}
          onOpen={setDetail}
        />
        <Leaderboard
          title="Top scorers"
          note="total pts"
          players={boards.byPoints}
          teamsById={teamsById}
          positionsById={positionsById}
          stat={(p) => p.total_points}
          onOpen={setDetail}
        />
        <Leaderboard
          title="In form"
          note="form"
          players={boards.byForm}
          teamsById={teamsById}
          positionsById={positionsById}
          stat={(p) => p.form}
          onOpen={setDetail}
        />
      </div>

      {/* A nudge to the fuller browsing surface */}
      <button type="button" className="ov-more" onClick={() => onNavigate('players')}>
        Explore all {players.length} players <ArrowRight size={15} aria-hidden="true" />
      </button>

      {detail && <PlayerDetail player={detail} onClose={() => setDetail(null)} />}
    </section>
  )
}
