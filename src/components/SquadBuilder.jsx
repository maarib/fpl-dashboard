import { useEffect, useMemo, useState } from 'react'
import { useFpl } from '../hooks/useFpl'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useSquad } from '../hooks/useSquad'
import { formatPrice } from '../lib/fpl'
import {
  BUDGET,
  SQUAD_SHAPE,
  availableFormations,
  clubCounts,
  cheapestCompletion,
  firstEmptySlot,
  parseFormation,
  squadCost,
  squadCount,
  squadProgress,
} from '../lib/squad'
import { clearSharedSquad, readSharedSquad, shareUrl } from '../lib/share'
import Pitch from './Pitch'
import PitchCard, { EmptyCard } from './PitchCard'
import PlayerPicker from './PlayerPicker'
import PlayerPool from './PlayerPool'
import PlayerDetail from './PlayerDetail'
import GameweekFixtures from './GameweekFixtures'
import SquadList from './SquadList'
import StageBar from './StageBar'

/** Mode A — build your own 15 under the £100m and 3-per-club constraints. */
export default function SquadBuilder({ view, setView, metric, setMetric }) {
  const { players, playersById, teamsById, positionsById, fixtures, currentEvent } = useFpl()
  const {
    formation,
    squad,
    captain,
    viceCaptain,
    setFormation,
    setSlot,
    clearSlot,
    swapSlots,
    reset,
    replaceAll,
    setCaptain,
    setViceCaptain,
  } = useSquad()

  // Which card's menu is open, and any pending substitution.
  const [openMenu, setOpenMenu] = useState(null)
  const [swapFrom, setSwapFrom] = useState(null)
  const [detail, setDetail] = useState(null)

  // A squad arriving by link is previewed read-only, so opening someone
  // else's link can never overwrite your own squad without you asking.
  const [shared, setShared] = useState(() => readSharedSquad())
  const [copied, setCopied] = useState(false)

  const viewing = shared ?? { formation, squad }
  const readOnly = Boolean(shared)

  function dismissShared() {
    clearSharedSquad()
    setShared(null)
  }

  function importShared() {
    // Ids come from a URL, so drop any the current bootstrap doesn't know.
    const cleaned = { 1: [], 2: [], 3: [], 4: [] }
    for (const pos of [1, 2, 3, 4]) {
      cleaned[pos] = shared.squad[pos].map((id) =>
        id && playersById.has(id) ? id : null,
      )
    }
    replaceAll({ formation: shared.formation, squad: cleaned })
    dismissShared()
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl({ formation, squad }))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; fall back to showing the link to copy.
      window.prompt('Copy this link', shareUrl({ formation, squad }))
    }
  }

  const [openSlot, setOpenSlot] = useState(null)

  // Whether there is room to show the pool beside the pitch (440 + 24 + 928).
  const canDock = useMediaQuery('(min-width: 1400px)')
  const [docked, setDocked] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // The docked column is rendered whenever it is *wanted*; CSS decides whether
  // there is room to actually show it. Keeping that decision in one place (the
  // media query in pitch.css) means a stale JS reading can misjudge the label
  // but can never hide the pool with no way back.
  const poolVisible = canDock ? docked : drawerOpen

  // Close the drawer if the window grows enough to dock; the pool is already
  // on screen at that point and leaving an overlay open would double it up.
  useEffect(() => {
    if (canDock) setDrawerOpen(false)
  }, [canDock])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  function togglePool() {
    // Re-read rather than trusting cached state: if it were stale we could
    // toggle the docked flag on a screen too narrow to show a docked pool,
    // leaving the user with no pool at all — the exact bug being fixed.
    const roomToDock = window.matchMedia('(min-width: 1400px)').matches
    if (roomToDock) {
      setDocked((d) => !d)
      setDrawerOpen(false)
    } else {
      setDrawerOpen((o) => !o)
    }
  }

  const cost = squadCost(viewing.squad, playersById)
  const picked = squadCount(viewing.squad)
  const bank = BUDGET - cost
  const counts = clubCounts(viewing.squad, playersById)
  const overCap = [...counts.values()].some((n) => n > 3)

  const formations = useMemo(() => availableFormations(viewing.squad), [viewing.squad])
  const activeFormation = formations.includes(viewing.formation)
    ? viewing.formation
    : (formations[0] ?? viewing.formation)
  const activeNeed = parseFormation(activeFormation)

  const fromEvent = currentEvent?.id ?? 1

  // #18: a bare 12/15 never says *what* is missing, nor whether the money
  // left can actually finish the squad.
  const progress = squadProgress(viewing.squad)
  const needed = cheapestCompletion(viewing.squad, players)
  const unfinishable = picked < 15 && needed > bank
  const clubsAtCap = [...counts.entries()].filter(([, n]) => n >= 3).length

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
   * A swap is only meaningful between a starter and a bench player in the
   * same position — swapping two starters just reorders them. Restricting
   * targets to that gives every card a clear yes/no rather than a click that
   * silently does nothing.
   */
  function isValidSwapTarget(pos, index) {
    if (!swapFrom || swapFrom.pos !== pos || swapFrom.index === index) return false
    const starterCount = activeNeed[pos]
    const fromStarting = swapFrom.index < starterCount
    const toStarting = index < starterCount
    return fromStarting !== toStarting
  }

  function handleCardClick(pos, index) {
    // Mid-substitution a click means "put them here", not "open a menu".
    if (swapFrom) {
      if (isValidSwapTarget(pos, index)) swapSlots(pos, swapFrom.index, index)
      setSwapFrom(null)
      return
    }
    setOpenMenu({ pos, index })
  }

  /** Actions offered for one filled slot. */
  function menuItemsFor(pos, index, player) {
    const starterCount = activeNeed[pos]
    const isStarter = index < starterCount
    const partner = isStarter
      ? squad[pos].slice(starterCount).some(Boolean)
      : squad[pos].slice(0, starterCount).some(Boolean)

    return [
      {
        id: 'view',
        label: 'View player',
        onSelect: () => setDetail(player),
      },
      {
        id: 'sub',
        label: isStarter ? 'Substitute out' : 'Bring on',
        disabled: !partner,
        reason: partner
          ? undefined
          : isStarter
            ? 'No one on the bench for this position'
            : 'No starter in this position to replace',
        onSelect: () => setSwapFrom({ pos, index }),
      },
      {
        id: 'captain',
        label: captain === player.id ? 'Captain ✓' : 'Make captain',
        disabled: !isStarter || captain === player.id,
        reason: isStarter ? undefined : 'Only a starting player can captain',
        onSelect: () => setCaptain(player.id),
      },
      {
        id: 'vice',
        label: viceCaptain === player.id ? 'Vice-captain ✓' : 'Make vice-captain',
        disabled: !isStarter || viceCaptain === player.id,
        reason: isStarter ? undefined : 'Only a starting player can be vice',
        onSelect: () => setViceCaptain(player.id),
      },
      {
        id: 'remove',
        label: 'Remove from squad',
        danger: true,
        onSelect: () => clearSlot(pos, index),
      },
    ]
  }

  /** `bench` is `{ order }` for a bench slot, or null for a starter. */
  const renderSlot = (pos, index, bench = null) => {
    const id = viewing.squad[pos][index]
    const player = id ? playersById.get(id) : null
    const position = positionsById.get(pos)

    if (!player) {
      return (
        <EmptyCard
          key={`${pos}-${index}`}
          positionLabel={position?.singular_name_short ?? ''}
          onClick={readOnly ? undefined : () => setOpenSlot({ pos, index })}
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
        isCaptain={captain === player.id}
        isViceCaptain={viceCaptain === player.id}
        positionLabel={bench ? position?.singular_name_short : undefined}
        benchOrder={bench?.order}
        selected={!readOnly && swapFrom?.pos === pos && swapFrom?.index === index}
        swapPending={!readOnly && Boolean(swapFrom)}
        isSwapTarget={!readOnly && isValidSwapTarget(pos, index)}
        menuItems={readOnly ? undefined : menuItemsFor(pos, index, player)}
        menuOpen={
          !readOnly && openMenu?.pos === pos && openMenu?.index === index
            ? { close: () => setOpenMenu(null) }
            : null
        }
        onRemove={readOnly ? undefined : () => clearSlot(pos, index)}
        onSelect={readOnly ? undefined : () => handleCardClick(pos, index)}
      />
    )
  }

  const rows = [1, 2, 3, 4].map((pos) =>
    Array.from({ length: activeNeed[pos] }, (_, i) => renderSlot(pos, i)),
  )

  // Flattened first so each bench card knows its position in the substitution
  // order. The keeper is always first and is not part of that order — it can
  // only ever replace the other keeper — so it shows a pill but no number.
  const benchSlots = [1, 2, 3, 4].flatMap((pos) =>
    Array.from({ length: SQUAD_SHAPE[pos] - activeNeed[pos] }, (_, i) => [
      pos,
      activeNeed[pos] + i,
    ]),
  )

  const bench = benchSlots.map(([pos, index], order) =>
    renderSlot(pos, index, { order: order === 0 ? null : order }),
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

  if (readOnly) {
    return (
      <>
        <div className="notice notice--shared">
          <div>
            <strong>You’re viewing a shared squad.</strong>
            <p>Your own squad is untouched — importing is up to you.</p>
          </div>
          <div className="notice__actions">
            <button type="button" className="btn btn--primary" onClick={importShared}>
              Copy to my squad
            </button>
            <button type="button" className="btn" onClick={dismissShared}>
              Back to my squad
            </button>
          </div>
        </div>

        <div className="team-layout">
          <div className="stage-col">
            <div className="team-stage">
              <div className="stage-meters">
                <div className="stage-meter">
                  <span className="stage-meter__value">{picked} / 15</span>
                  <span className="stage-meter__label">Players selected</span>
                </div>
                <div className="stage-meter">
                  <span className="stage-meter__value">{formatPrice(cost)}</span>
                  <span className="stage-meter__label">Squad value</span>
                </div>
              </div>

              <StageBar view={view} setView={setView} metric={metric} setMetric={setMetric} />

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
      </>
    )
  }

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
        <button
          type="button"
          className={`btn btn--pool${poolVisible ? ' btn--pool-on' : ''}`}
          onClick={togglePool}
          aria-expanded={poolVisible}
          aria-controls="player-pool"
        >
          <span className="btn__icon" aria-hidden="true">
            {poolVisible ? '×' : '+'}
          </span>
          {poolVisible ? 'Hide players' : 'Add players'}
        </button>

        <button type="button" className="btn" onClick={reset}>
          Clear squad
        </button>

        <button type="button" className="btn" onClick={copyShareLink}>
          {copied ? 'Link copied' : 'Share squad'}
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

      <div className={`team-layout${docked ? ' team-layout--docked' : ''}`}>
        {/* Not while the drawer is open: the two are never both needed, and
            mounting both renders the whole pool twice — on exactly the narrow
            screens least able to afford it. */}
        {docked && !drawerOpen && (
          <aside className="pool-col" id="player-pool">
            <PlayerPool
              squad={squad}
              onAdd={handlePoolAdd}
              onRemove={(slot) => clearSlot(slot.pos, slot.index)}
            />
          </aside>
        )}

        <div className="stage-col">
          <div className="team-stage">
            <div className="stage-meters">
              <div className={`stage-meter ${picked === 15 ? '' : 'stage-meter--bad'}`}>
                <span className="stage-meter__value">{picked} / 15</span>
                <span className="stage-meter__label">Players selected</span>
                <span className="stage-meter__breakdown">
                  {progress.map(({ pos, filled, total }) => (
                    <span
                      key={pos}
                      className={filled === total ? 'is-done' : undefined}
                    >
                      {positionsById.get(pos)?.singular_name_short} {filled}/{total}
                    </span>
                  ))}
                </span>
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

            {(unfinishable || clubsAtCap > 0) && (
              <p className="stage-warn">
                {unfinishable &&
                  (bank < 0 ? (
                    <span>
                      You’re <strong>{formatPrice(-bank)} over budget</strong>{' '}
                      with {15 - picked} slot{15 - picked === 1 ? '' : 's'} still
                      to fill — sell someone before finishing the squad.
                    </span>
                  ) : (
                    <span>
                      <strong>{formatPrice(bank)} left</strong> won’t fill the
                      remaining {15 - picked} slot{15 - picked === 1 ? '' : 's'} —
                      the cheapest way to finish costs {formatPrice(needed)}.
                    </span>
                  ))}
                {clubsAtCap > 0 && (
                  <span>
                    {clubsAtCap} club{clubsAtCap === 1 ? ' is' : 's are'} at the
                    3-player limit.
                  </span>
                )}
              </p>
            )}

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

      {/* Narrow screens: the same pool, as an overlay rather than a column.
          Gated only on drawerOpen — docking already closes it — so the overlay
          can never be suppressed by a stale viewport reading. */}
      {drawerOpen && (
        <div
          className="pool-drawer"
          onClick={(e) => e.target === e.currentTarget && setDrawerOpen(false)}
        >
          <aside
            className="pool-drawer__panel"
            id="player-pool"
            role="dialog"
            aria-label="Player selection"
          >
            <button
              type="button"
              className="pool-drawer__close"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close player selection"
            >
              ×
            </button>
            <PlayerPool
              squad={squad}
              onAdd={handlePoolAdd}
              onRemove={(slot) => clearSlot(slot.pos, slot.index)}
            />
          </aside>
        </div>
      )}

      {detail && <PlayerDetail player={detail} onClose={() => setDetail(null)} />}

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
