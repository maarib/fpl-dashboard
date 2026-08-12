import { useState } from 'react'
import { useStickyOffsets } from './hooks/useStickyOffsets'
import { FplProvider } from './context/FplProvider'
import { useFpl } from './hooks/useFpl'
import PlayerExplorer from './components/PlayerExplorer'
import MyTeam from './components/MyTeam'
import Fixtures from './components/Fixtures'
import { TableSkeleton } from './components/Skeleton'
import './App.css'

const TABS = [
  { id: 'players', label: 'Player Explorer', Component: PlayerExplorer },
  { id: 'team', label: 'My Team', Component: MyTeam, wide: true },
  { id: 'fixtures', label: 'Fixtures', Component: Fixtures },
]

/**
 * "Fri 21 Aug, 18:30" in the reader's own timezone — the API sends UTC, and a
 * deadline shown in the wrong zone is worse than no deadline at all.
 */
function formatDeadline(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function Dashboard() {
  const { loading, error, retry, currentEvent } = useFpl()
  const [activeTab, setActiveTab] = useState(TABS[0].id)

  // Above the loading and error returns: hooks have to run on every render.
  useStickyOffsets()

  if (loading) {
    return (
      <main className="shell">
        <TableSkeleton />
      </main>
    )
  }

  if (error) {
    // Being offline and the request failing read identically otherwise, and
    // they call for different actions from the user.
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false

    return (
      <main className="shell">
        <div className="notice notice--error">
          <strong>
            {offline ? 'You appear to be offline.' : 'Couldn’t load FPL data.'}
          </strong>
          <p>
            {offline
              ? 'Reconnect and try again — nothing has been lost.'
              : error.message}
          </p>
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: 12 }}
            onClick={retry}
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  const tab = TABS.find((t) => t.id === activeTab)
  const { Component } = tab

  // The gameweek name alone does not say how long you have, which is the part
  // that actually decides whether you need to act now.
  const deadline = formatDeadline(currentEvent?.deadline_time)

  return (
    <>
      {/* One row rather than two stacked bands: wordmark, then navigation,
          then the gameweek. Halves the chrome's height and removes the slab
          of colour the page used to start under. */}
      <header className="topbar">
        <div className="topbar__inner">
          <h1 className="wordmark">
            FPL <span>Dashboard</span>
          </h1>

          <nav className="tabs" aria-label="Views">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`tab${tab.id === activeTab ? ' tab--active' : ''}`}
                aria-current={tab.id === activeTab ? 'page' : undefined}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {currentEvent && (
            <div className="gw">
              <span className="gw__label">
                {currentEvent.is_current ? 'Live' : 'Next'} · {currentEvent.name}
              </span>
              {deadline && (
                <time className="gw__deadline" dateTime={currentEvent.deadline_time}>
                  {currentEvent.is_current ? 'In progress' : `Deadline ${deadline}`}
                </time>
              )}
            </div>
          )}
        </div>
      </header>

      <main className={`shell${tab.wide ? ' shell--wide' : ''}`}>
        <Component />
      </main>
    </>
  )
}

export default function App() {
  return (
    <FplProvider>
      <Dashboard />
    </FplProvider>
  )
}
