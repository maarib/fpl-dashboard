import { useEffect, useRef } from 'react'
import { useFpl } from '../hooks/useFpl'

/**
 * The gameweek timeline, modelled on the UEFA Fantasy matchday strip: every
 * gameweek in a horizontal rail, the live one marked, the next deadline
 * flagged as the action to take. Per-gameweek points fill in once there's a
 * saved, scored squad (accounts, #5) — for now the rail carries the schedule
 * and where you are in it.
 */
export default function MatchdayNav() {
  const { events } = useFpl()
  const railRef = useRef(null)
  const currentRef = useRef(null)

  const currentId =
    events?.find((e) => e.is_current)?.id ?? events?.find((e) => e.is_next)?.id

  // Keep the live gameweek in view when the rail first renders.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [currentId])

  if (!events?.length) return null

  return (
    <div className="mdnav" role="navigation" aria-label="Gameweeks">
      <div className="mdnav__rail" ref={railRef}>
        {events.map((e) => {
          const isCurrent = e.id === currentId
          const date = e.deadline_time
            ? new Date(e.deadline_time).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
              })
            : ''
          const sub = isCurrent
            ? e.is_current
              ? 'Live now'
              : 'Make transfers'
            : e.finished
              ? 'Finished'
              : date
          return (
            <div
              key={e.id}
              ref={isCurrent ? currentRef : undefined}
              className={`mdcell${isCurrent ? ' is-current' : ''}${e.finished ? ' is-done' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="mdcell__gw">GW {e.id}</span>
              <span className="mdcell__sub">{sub}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
