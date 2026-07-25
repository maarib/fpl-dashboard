# FPL Dashboard

A Vite + React dashboard for Fantasy Premier League data, deployed to GitHub Pages.

## Running locally

```bash
npm install
npm run dev
```

The dev server serves the app at <http://localhost:5173/fpl-dashboard/> (the
`base` in `vite.config.js` matches the GitHub Pages repo path).

## Data

Everything comes from the proxy at `https://fpl-api-proxy.maarib.workers.dev`:

| Endpoint | Used by |
| --- | --- |
| `/bootstrap-static/` | players, teams, positions, gameweeks — fetched **once** per page load |
| `/fixtures/` | FDR grid and each player's next fixture — also fetched once |
| `/entry/:id/` | manager name shown above the pitch |
| `/entry/:id/event/:gw/picks/` | the squad, fetched per manager+gameweek |

`bootstrap-static` and `fixtures` are cached in a module-level promise and shared
through React context (`src/context/FplProvider.jsx`), so switching tabs never
refetches. Squads are memoised per `managerId:gameweek` in `src/components/MyTeam.jsx`.

## Views

- **Player Explorer** — every player, sortable on any column and filterable by
  position, price range and name.
- **My Team** — enter a manager ID and gameweek to render the XI on a pitch plus
  the bench, with photo, price and next fixture per card.
- **Fixtures** — fixture difficulty grid, teams down the side and the next six
  gameweeks across, coloured green (easy) to red (hard). Handles blank and
  double gameweeks.

## Images

Helpers live in `src/lib/images.js`:

- `playerPhotoUrl(player)` → `.../photos/players/110x140/p{player.code}.png`
- `teamBadgeUrl(team)` → `.../badges/50/t{team.code}.png`

Both key off `code`, **not** `id` — 19 of the 20 teams have `code !== id`
(Man City is `id: 15` but `code: 43`). All images are `loading="lazy"` and fall
back to initials (players) or the short name (teams) when the CDN has no asset.

## Note on pre-season

The API is currently serving pre-season data: no gameweek is live, and
`/entry/:id/event/:gw/picks/` returns **404 for every manager** because no squad
has been submitted yet. My Team shows an explanatory empty state until GW1's
deadline (2026-08-21) passes, after which it populates normally.

## Deploying

`.github/workflows/deploy.yml` builds and deploys on every push to `main`. Before
the first run, set **Settings → Pages → Build and deployment → Source** to
**GitHub Actions**.

The site will be served at `https://<user>.github.io/fpl-dashboard/`. If you
rename the repo, update `base` in `vite.config.js` to match.
