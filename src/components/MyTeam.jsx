import { useState } from 'react'
import { STAT_METRICS } from '../lib/squad'
import SquadBuilder from './SquadBuilder'
import TeamLookup from './TeamLookup'
import '../styles/pitch.css'

const MODES = [
  { id: 'xi', label: 'My XI' },
  { id: 'lookup', label: 'Look up a team' },
]

/** Mode switch + the pitch-wide stat toggle shared by both modes. */
export default function MyTeam() {
  const [mode, setMode] = useState('xi')
  const [metric, setMetric] = useState('fixture')

  return (
    <section className="myteam">
      <div className="pitch-toolbar">
        <div className="segmented" role="tablist" aria-label="Squad mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              className={`segmented__btn${mode === m.id ? ' segmented__btn--active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="pitch-toolbar__spacer" />

        <span className="toolbar-label">Card stat</span>
        <div className="segmented" role="group" aria-label="Card stat">
          {STAT_METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={metric === m.id}
              className={`segmented__btn${metric === m.id ? ' segmented__btn--active' : ''}`}
              onClick={() => setMetric(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'xi' ? <SquadBuilder metric={metric} /> : <TeamLookup metric={metric} />}
    </section>
  )
}
