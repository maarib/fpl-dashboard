import { useState } from 'react'
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

function Dashboard() {
  const { loading, error, retry, currentEvent } = useFpl()
  const [activeTab, setActiveTab] = useState(TABS[0].id)

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

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <h1 className="wordmark">
            FPL <span>Dashboard</span>
          </h1>
          {currentEvent && (
            <span className="gw-pill">
              {currentEvent.is_current ? 'Live' : 'Next'} · {currentEvent.name}
            </span>
          )}
        </div>
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
