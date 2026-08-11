import { Sliders } from '@phosphor-icons/react'
import Select from './Select'
import { STAT_METRICS } from '../lib/squad'

const VIEWS = [
  { id: 'pitch', label: 'Pitch' },
  { id: 'list', label: 'List' },
]

/** Pitch/List toggle plus the dropdown that drives every card's stat line. */
export default function StageBar({ view, setView, metric, setMetric }) {
  return (
    <div className="stage-bar">
      <div className="view-toggle" role="tablist" aria-label="Squad view">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            className={`view-toggle__btn${view === v.id ? ' view-toggle__btn--active' : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="stage-bar__spacer" />

      <div className="stat-select">
        <Sliders className="stat-select__icon" size={16} weight="bold" aria-hidden="true" />

        <Select
          aria-label="Card stat"
          value={metric}
          onChange={setMetric}
          options={STAT_METRICS.map((m) => ({ value: m.id, label: m.label }))}
        />
      </div>
    </div>
  )
}
