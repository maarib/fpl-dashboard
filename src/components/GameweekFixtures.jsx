import { useMemo, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import TeamBadge from './TeamBadge'

const dayLabel = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

const rangeLabel = (list) => {
  const dated = list.filter((f) => f.kickoff_time).map((f) => f.kickoff_time).sort()
  if (dated.length === 0) return null
  const first = dayLabel(dated[0])
  const last = dayLabel(dated[dated.length - 1])
  return first === last ? first : `${first} – ${last}`
}

/**
 * Fixture list for one gameweek, grouped by kickoff date. Complements the
 * Fixtures tab's difficulty grid: that answers "who has a good run", this
 * answers "who plays when this week".
 */
export default function GameweekFixtures({ gameweek }) {
  const { fixtures, teamsById, events } = useFpl()
  const [eventId, setEventId] = useState(gameweek ?? 1)

  const event = events.find((e) => e.id === eventId)
  const list = useMemo(
    () => fixtures.filter((f) => f.event === eventId),
    [fixtures, eventId],
  )

  const byDay = useMemo(() => {
    const groups = new Map()
    for (const fixture of [...list].sort((a, b) =>
      (a.kickoff_time ?? '').localeCompare(b.kickoff_time ?? ''),
    )) {
      const key = fixture.kickoff_time ? dayLabel(fixture.kickoff_time) : 'Date TBC'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(fixture)
    }
    return [...groups]
  }, [list])

  const canPrev = eventId > events[0].id
  const canNext = eventId < events[events.length - 1].id

  return (
    <section className="gwfix">
      <header className="gwfix__head">
        <h2 className="gwfix__title">Fixtures</h2>

        <div className="gwfix__nav">
          <button
            type="button"
            className="gwfix__arrow"
            aria-label="Previous gameweek"
            disabled={!canPrev}
            onClick={() => setEventId((id) => id - 1)}
          >
            ‹
          </button>
          <span className="gwfix__gw">
            <strong>{event?.name ?? `Gameweek ${eventId}`}</strong>
            {rangeLabel(list) && <span>{rangeLabel(list)}</span>}
          </span>
          <button
            type="button"
            className="gwfix__arrow"
            aria-label="Next gameweek"
            disabled={!canNext}
            onClick={() => setEventId((id) => id + 1)}
          >
            ›
          </button>
        </div>

        {event?.deadline_time && (
          <p className="gwfix__deadline">
            Deadline: {dayLabel(event.deadline_time)}, {timeLabel(event.deadline_time)}
            <span className="gwfix__tz">All times shown in your local time</span>
          </p>
        )}
      </header>

      {byDay.length === 0 && <p className="gwfix__empty">No fixtures scheduled.</p>}

      {byDay.map(([day, matches]) => (
        <div className="gwfix__day" key={day}>
          <h3 className="gwfix__dayhead">{day}</h3>
          {matches.map((fixture) => {
            const home = teamsById.get(fixture.team_h)
            const away = teamsById.get(fixture.team_a)
            const played = fixture.finished || fixture.started

            return (
              <div className="gwfix__row" key={fixture.id}>
                <span className="gwfix__team gwfix__team--home">
                  <span className="gwfix__name">{home?.name}</span>
                  <TeamBadge team={home} className="gwfix__badge" />
                </span>

                <span className="gwfix__mid">
                  {played
                    ? `${fixture.team_h_score ?? 0} - ${fixture.team_a_score ?? 0}`
                    : fixture.kickoff_time
                      ? timeLabel(fixture.kickoff_time)
                      : 'TBC'}
                </span>

                <span className="gwfix__team gwfix__team--away">
                  <TeamBadge team={away} className="gwfix__badge" />
                  <span className="gwfix__name">{away?.name}</span>
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </section>
  )
}
