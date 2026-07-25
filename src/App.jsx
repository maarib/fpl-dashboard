import { useState } from 'react'
import { FplProvider } from './context/FplProvider'
import { useFpl } from './hooks/useFpl'
import PlayerExplorer from './components/PlayerExplorer'
import MyTeam from './components/MyTeam'
import Fixtures from './components/Fixtures'
import './App.css'

const TABS = [
  { id: 'players', label: 'Player Explorer', Component: PlayerExplorer },
  { id: 'team', label: 'My Team', Component: MyTeam },
  { id: 'fixtures', label: 'Fixtures', Component: Fixtures },
]

function Dashboard() {
  const { loading, error, currentEvent } = useFpl()
  const [activeTab, setActiveTab] = useState(TABS[0].id)

  if (loading) {
    return (
      <main className="shell">
        <p className="empty">Loading FPL data…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="shell">
        <div className="notice notice--error">
          <strong>Couldn’t load FPL data.</strong>
          <p>{error.message}</p>
        </div>
      </main>
    )
  }

  const { Component } = TABS.find((tab) => tab.id === activeTab)

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

      <main className="shell">
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
