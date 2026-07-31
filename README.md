# FPL Dashboard

A Vite + React dashboard for Fantasy Premier League data, deployed to GitHub Pages.

**Live:** <https://maarib.github.io/fpl-dashboard/>

## Running locally

```bash
npm install
npm run dev
```

The dev server serves the app at <http://localhost:5173/fpl-dashboard/> (the
`base` in `vite.config.js` matches the GitHub Pages repo path).

## Views

### Player Explorer

Every player, sortable on any column and filterable by position, price range and
name. Below 640px the table becomes a card list and sorting moves into a select,
since column headers you have to scroll sideways to reach are not controls.

Tick up to four players to **compare them side by side** — metrics down, players
across, with the leader in each row highlighted. Ownership deliberately has no
winner: low is a differential, high is safety.

### My Team

Two modes on the same pitch:

- **My XI** — build your own 15 under the £100m budget and 3-per-club cap.
  Formation selector, searchable player pool, and a per-card menu for
  substitutions, captain and vice-captain. Persisted to `localStorage`.
- **Look up a team** — render any manager's squad read-only from their entry ID.

A **stat toggle** switches every card at once between next opponent, total
points, form and price. A squad can be **shared by link** — fifteen ids and a
formation fit in a URL, so it needs no backend; opening one previews it
read-only and never touches your own squad unless you ask.

### Fixtures

Fixture difficulty grid: teams down the side, an adjustable 3, 6 or 10 gameweeks
across, coloured green (easy) to red (hard). It reads your saved squad, marks
the clubs you own, and can filter to just those. Sortable by easiest or hardest
run.

**Blanks and doubles are handled explicitly.** A blank is not difficulty 0 —
having no fixture is bad for points but it is not an *easy* fixture, so blanks
are counted separately and the average is per match. A double contributes both
of its fixtures, keeping "how hard are these games" separate from "how many
games are there".

### Player detail

Reachable from Explorer rows, pool rows and the pitch card menu. Leads with
**availability** — injury and suspension news with a chance-of-playing
percentage — because it can invalidate every other number below it. Also shows
rank *within position*, underlying numbers, set-piece duties, the next five
fixtures with difficulty, and past seasons.

## Data

Everything comes from the proxy at `https://fpl-api-proxy.maarib.workers.dev`:

| Endpoint | Used by |
| --- | --- |
| `/bootstrap-static/` | players, teams, positions, gameweeks — fetched **once** per page load |
| `/fixtures/` | FDR grid and each player's next fixture — also fetched once |
| `/element-summary/:id/` | player detail: past seasons, upcoming fixtures, gameweek history |
| `/entry/:id/` | manager name shown above the pitch |
| `/entry/:id/event/:gw/picks/` | the squad, fetched per manager+gameweek |

`bootstrap-static` and `fixtures` are cached in a module-level promise and shared
through React context (`src/context/FplProvider.jsx`), so switching tabs never
refetches. Player summaries are cached per id, squads per `managerId:gameweek`.

## Design tokens

**All colour lives in `src/styles/tokens.css`.** No other file should contain a
raw hex. Four layers, and normally only the first is edited:

| Layer | Contains |
| --- | --- |
| 1. Brand | The handful of hexes that define the product |
| 2. Semantic | `--surface`, `--text`, `--interactive`, `--border` — aliases of layer 1 |
| 3. Status | Difficulty scale, injury, warnings — meaning, not identity |
| 4. Component | Turf, boards, goal |

Components reference layer 2, never layer 1 directly, so changing `--brand`
repaints the header, stage, buttons and cards together while the turf and
difficulty scale stay put.

Some values carry **measured** contrast ratios — the five difficulty pairs,
`--accent-ink` at 5.06:1 on light, the brand at 17.28:1 with white. If you change
those, re-measure rather than assume. Bright accents cannot be text on a light
background, which is why `--accent` and `--accent-ink` exist as a pair.

Pitch and card sizing tokens live in `src/styles/pitch.css` alongside the layout.

## Images

Helpers live in `src/lib/images.js`:

- `playerPhotoUrl(player, size)` → `.../photos/players/{size}/p{player.code}.png`
- `teamBadgeUrl(team, size)` → `.../badges/{size}/t{team.code}.png`
- `teamKitUrl(team, isGoalkeeper)` → `.../shirts/standard/shirt_{team.code}[_1]-220.png`

All three key off `code`, **not** `id` — 19 of the 20 teams have `code !== id`
(Man City is `id: 15` but `code: 43`).

Two CDN quirks worth knowing:

- **Player photos are not stocked at every size.** Roughly one in six of the top
  scorers 403 at `250x250` while existing at `110x140`. Pitch cards use kits
  instead; the detail panel falls back a size.
- All 20 clubs have both kit variants, so kits need no fallback.

## Note on pre-season

The API is currently serving pre-season data: no gameweek is live, and
`/entry/:id/event/:gw/picks/` returns **404 for every manager** because no squad
has been submitted yet. Look up a team shows an explanatory empty state until
GW1's deadline (2026-08-21) passes. Per-gameweek history in the player detail
panel is empty for the same reason, and says so.

Form and defensive contribution read `0.0` league-wide — that is real
pre-season data, not a mapping bug.

## Deploying

`.github/workflows/deploy.yml` builds and deploys on every push to `main`. Before
the first run, set **Settings → Pages → Build and deployment → Source** to
**GitHub Actions**.

The site is served at `https://<user>.github.io/fpl-dashboard/`. If you rename
the repo, update `base` in `vite.config.js` to match.
