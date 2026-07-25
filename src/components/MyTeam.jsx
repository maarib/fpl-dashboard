import { useState } from 'react'
import SquadBuilder from './SquadBuilder'
import TeamLookup from './TeamLookup'
import '../styles/pitch.css'

const MODES = [
  { id: 'xi', label: 'My XI' },
  { id: 'lookup', label: 'Look up a team' },
]

export default function MyTeam() {
  const [mode, setMode] = useState('xi')
  const [view, setView] = useState('pitch')
  const [metric, setMetric] = useState('fixture')

  const shared = { view, setView, metric, setMetric }

  return (
    <section className="myteam">
      <div className="mode-switch" role="tablist" aria-label="Squad mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={`mode-switch__btn${mode === m.id ? ' mode-switch__btn--active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'xi' ? <SquadBuilder {...shared} /> : <TeamLookup {...shared} />}
    </section>
  )
}
