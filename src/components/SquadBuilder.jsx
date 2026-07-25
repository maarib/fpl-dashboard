import { useMemo, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import { useSquad } from '../hooks/useSquad'
import { formatPrice } from '../lib/fpl'
import {
  BUDGET,
  SQUAD_SHAPE,
  availableFormations,
  clubCounts,
  parseFormation,
  squadCost,
  squadCount,
} from '../lib/squad'
import Pitch from './Pitch'
import PitchCard, { EmptyCard } from './PitchCard'
import PlayerPicker from './PlayerPicker'

/** Mode A — build your own 15 under the £100m and 3-per-club constraints. */
export default function SquadBuilder({ metric }) {
  const { playersById, teamsById, positionsById, fixtures, currentEvent } = useFpl()
  const { formation, squad, setFormation, setSlot, clearSlot, swapSlots, reset } =
    useSquad()

  const [openSlot, setOpenSlot] = useState(null)
  const [benched, setBenched] = useState(null) // { pos, index } awaiting a swap

  const cost = squadCost(squad, playersById)
  const picked = squadCount(squad)
  const bank = BUDGET - cost
  const counts = clubCounts(squad, playersById)
  const overCap = [...counts.values()].some((n) => n > 3)

  const formations = useMemo(() => availableFormations(squad), [squad])

  // A formation the squad can no longer support (after removals) falls back
  // to whatever still fits, so the pitch never renders an illegal shape.
  const activeFormation = formations.includes(formation)
    ? formation
    : (formations[0] ?? formation)
  const activeNeed = parseFormation(activeFormation)

  function handlePick(player) {
    setSlot(openSlot.pos, openSlot.index, player.id)
    setOpenSlot(null)
  }

  /**
   * Two-tap swap: select a card, then another in the same position. Selecting
   * a different position just moves the selection there, and re-selecting the
   * same card cancels.
   */
  function handleCardClick(pos, index) {
    if (!benched || benched.pos !== pos) {
      setBenched({ pos, index })
      return
    }
    if (benched.index === index) {
      setBenched(null)
      return
    }
    swapSlots(pos, benched.index, index)
    setBenched(null)
  }

  const renderSlot = (pos, index) => {
    const id = squad[pos][index]
    const position = positionsById.get(pos)

    if (!id) {
      return (
        <EmptyCard
          key={`${pos}-${index}`}
          positionLabel={position?.singular_name_short ?? ''}
          onClick={() => setOpenSlot({ pos, index })}
        />
      )
    }

    const player = playersById.get(id)
    if (!player) {
      return (
        <EmptyCard
          key={`${pos}-${index}`}
          positionLabel={position?.singular_name_short ?? ''}
          onClick={() => setOpenSlot({ pos, index })}
        />
      )
    }

    const selected = benched?.pos === pos && benched?.index === index

    return (
      <div
        key={`${pos}-${index}`}
        style={selected ? { outline: '3px solid var(--cyan)', borderRadius: 12 } : undefined}
      >
        <PitchCard
          key={player.id}
          player={player}
          team={teamsById.get(player.team)}
          metric={metric}
          fixtures={fixtures}
          teamsById={teamsById}
          fromEvent={currentEvent?.id ?? 1}
          onRemove={() => clearSlot(pos, index)}
          onSelect={() => handleCardClick(pos, index)}
        />
      </div>
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

  return (
    <>
      <div className="pitch-toolbar">
        <span className="toolbar-label">Formation</span>
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

        <button type="button" className="btn" onClick={reset}>
          Clear squad
        </button>

        <div className="pitch-toolbar__spacer" />

        <div className="meters">
          <div className={`meter ${picked === 15 ? 'meter--good' : ''}`}>
            <span className="meter__value">{picked}/15</span>
            <span className="meter__label">Picked</span>
          </div>
          <div className={`meter ${bank < 0 ? 'meter--bad' : 'meter--good'}`}>
            <span className="meter__value">{formatPrice(bank)}</span>
            <span className="meter__label">Bank</span>
          </div>
          <div className="meter">
            <span className="meter__value">{formatPrice(cost)}</span>
            <span className="meter__label">Spent</span>
          </div>
        </div>
      </div>

      {overCap && (
        <div className="notice notice--error" style={{ marginBottom: 12 }}>
          <strong>Too many players from one club.</strong>
          <p>You can only field 3 players from the same team.</p>
        </div>
      )}

      <p className="pitch-hint">
        Click an empty slot to pick a player. Click a player, then another in the
        same position, to swap them between the XI and the bench.
      </p>

      <Pitch rows={rows} bench={bench} benchLabel="Bench" />

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
