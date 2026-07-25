import { useMemo, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import { useSquad } from '../hooks/useSquad'
import { formatPrice } from '../lib/fpl'
import {
  BUDGET,
  SQUAD_SHAPE,
  availableFormations,
  clubCounts,
  firstEmptySlot,
  parseFormation,
  squadCost,
  squadCount,
} from '../lib/squad'
import Pitch from './Pitch'
import PitchCard, { EmptyCard } from './PitchCard'
import PlayerPicker from './PlayerPicker'
import PlayerPool from './PlayerPool'
import GameweekFixtures from './GameweekFixtures'
import SquadList from './SquadList'
import StageBar from './StageBar'

/** Mode A — build your own 15 under the £100m and 3-per-club constraints. */
export default function SquadBuilder({ view, setView, metric, setMetric }) {
  const { playersById, teamsById, positionsById, fixtures, currentEvent } = useFpl()
  const { formation, squad, setFormation, setSlot, clearSlot, swapSlots, reset } =
    useSquad()

  const [openSlot, setOpenSlot] = useState(null)
  const [selected, setSelected] = useState(null)

  const cost = squadCost(squad, playersById)
  const picked = squadCount(squad)
  const bank = BUDGET - cost
  const counts = clubCounts(squad, playersById)
  const overCap = [...counts.values()].some((n) => n > 3)

  const formations = useMemo(() => availableFormations(squad), [squad])
  const activeFormation = formations.includes(formation)
    ? formation
    : (formations[0] ?? formation)
  const activeNeed = parseFormation(activeFormation)

  const fromEvent = currentEvent?.id ?? 1

  function handlePick(player) {
    setSlot(openSlot.pos, openSlot.index, player.id)
    setOpenSlot(null)
  }

  /** Pool adds have no slot context — drop into the first free one. */
  function handlePoolAdd(player) {
    const index = firstEmptySlot(squad, player.element_type)
    if (index !== -1) setSlot(player.element_type, index, player.id)
  }

  /**
   * Two-tap swap: select a card, then another in the same position. Selecting
   * a different position moves the selection; re-selecting cancels.
   */
  function handleCardClick(pos, index) {
    if (!selected || selected.pos !== pos) {
      setSelected({ pos, index })
      return
    }
    if (selected.index === index) {
      setSelected(null)
      return
    }
    swapSlots(pos, selected.index, index)
    setSelected(null)
  }

  const renderSlot = (pos, index) => {
    const id = squad[pos][index]
    const player = id ? playersById.get(id) : null
    const position = positionsById.get(pos)

    if (!player) {
      return (
        <EmptyCard
          key={`${pos}-${index}`}
          positionLabel={position?.singular_name_short ?? ''}
          onClick={() => setOpenSlot({ pos, index })}
        />
      )
    }

    return (
      <PitchCard
        key={`${pos}-${index}-${player.id}`}
        player={player}
        team={teamsById.get(player.team)}
        isGoalkeeper={pos === 1}
        metric={metric}
        fixtures={fixtures}
        teamsById={teamsById}
        fromEvent={fromEvent}
        selected={selected?.pos === pos && selected?.index === index}
        onRemove={() => clearSlot(pos, index)}
        onSelect={() => handleCardClick(pos, index)}
      />
    )
  }

  const rows = [1, 2, 3, 4].map((pos) =>
    Array.from({ length: activeNeed[pos] }, (_, i) => renderSlot(pos, i)),
  )

  const bench = [1, 2, 3, 4].flatMap((pos) =>
    Array.from({ length: SQUAD_SHAPE[pos] - activeNeed[pos] }, (_, i) =>
      renderSlot(pos, activeNeed[pos] + i),
    ),
  )

  // Same data the pitch uses, flattened for the list view.
  const entries = [1, 2, 3, 4].flatMap((pos) =>
    squad[pos].map((id, index) => {
      const player = id ? playersById.get(id) : null
      return {
        pos,
        player,
        team: player ? teamsById.get(player.team) : null,
        isGoalkeeper: pos === 1,
        isBench: index >= activeNeed[pos],
        onRemove: player ? () => clearSlot(pos, index) : undefined,
        onAdd: () => setOpenSlot({ pos, index }),
      }
    }),
  )

  return (
    <>
      <div className="filters">
        <label className="field">
          <span className="field__label">Formation</span>
          <select
            className="input"
            style={{ minWidth: 110 }}
            value={activeFormation}
            onChange={(e) => setFormation(e.target.value)}
          >
            {formations.length === 0 && <option>{activeFormation}</option>}
            {formations.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={reset}>
          Clear squad
        </button>
        <p className="filters__count">
          Click a slot to pick. Click two players in the same position to swap
          them between the XI and the bench.
        </p>
      </div>

      {overCap && (
        <div className="notice notice--error" style={{ marginBottom: 12 }}>
          <strong>Too many players from one club.</strong>
          <p>You can only field 3 players from the same team.</p>
        </div>
      )}

      <div className="team-layout">
        <aside className="pool-col">
          <PlayerPool
            squad={squad}
            onAdd={handlePoolAdd}
            onRemove={(slot) => clearSlot(slot.pos, slot.index)}
          />
        </aside>

        <div className="stage-col">
          <div className="team-stage">
            <div className="stage-meters">
              <div className={`stage-meter ${picked === 15 ? '' : 'stage-meter--bad'}`}>
                <span className="stage-meter__value">{picked} / 15</span>
                <span className="stage-meter__label">Players selected</span>
              </div>
              <div className={`stage-meter ${bank < 0 ? 'stage-meter--bad' : ''}`}>
                <span className="stage-meter__value">{formatPrice(bank)}</span>
                <span className="stage-meter__label">Bank</span>
              </div>
              <div className="stage-meter">
                <span className="stage-meter__value">{formatPrice(cost)}</span>
                <span className="stage-meter__label">Spent</span>
              </div>
            </div>

            <StageBar
              view={view}
              setView={setView}
              metric={metric}
              setMetric={setMetric}
            />

            {view === 'pitch' ? (
              <Pitch rows={rows} bench={bench} benchLabel="Substitutes" />
            ) : (
              <SquadList
                entries={entries}
                metric={metric}
                fixtures={fixtures}
                teamsById={teamsById}
                fromEvent={fromEvent}
              />
            )}
          </div>

          <GameweekFixtures gameweek={fromEvent} />
        </div>
      </div>

      {openSlot && (
        <PlayerPicker
          slot={openSlot}
          squad={squad}
          onPick={handlePick}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </>
  )
}
