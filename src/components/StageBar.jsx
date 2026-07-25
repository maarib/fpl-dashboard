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
        <svg
          className="stat-select__icon"
          width="20"
          height="14"
          viewBox="0 0 20 14"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="0.7"
            y="0.7"
            width="18.6"
            height="12.6"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path d="M10 1v12" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="10" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.4" />
        </svg>

        <select
          aria-label="Card stat"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
        >
          {STAT_METRICS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>

        <svg
          className="stat-select__chev"
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1 1.5 6 6.5l5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}
