# Design export — nav + Player Explorer

A static copy of the two surfaces being redesigned, using the **real class
names and the real stylesheets** from the React app. Open `index.html` directly
in a browser; no build step.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The markup React renders, hand-formatted. Edit freely. |
| `tokens.css` | **Start here.** Colour, space, radius, elevation, z-index, type. |
| `app.css` | Layout and component rules. |
| `base.css` | Global baseline (body, headings, focus). |

## How to get the most out of it

**Change tokens before you change rules.** `tokens.css` is the design system —
a change there carries across the whole app, not just this screen. Layer 1
(brand colour) and the space/type scales are the high-leverage ones.

**The class names are the contract.** If you keep them, I can apply your CSS
back to the React app almost verbatim. If you need new elements, add them with
new class names and I'll wire up the markup.

## Two things that behave differently here

**Sticky offsets are hardcoded.** The React app measures the top bar and filter
bar at runtime, because both wrap and change height with the viewport. The
export sets `--topbar-h: 61px` and `--filters-h: 85px` in a `<style>` block in
`index.html`. If you change the height of either bar, update those two numbers
or the sticky stack will overlap.

**Interactions are inert.** The dropdowns are buttons, the sort headers don't
sort, and the search box doesn't filter — this is for visual work only. Hover
and focus states all work.

## Known constraints worth designing around

- **Contrast.** Some token values carry *measured* ratios. Everything currently
  passes AA, the tightest at 4.68:1. If you change text or background colours,
  they need re-measuring rather than assuming.
- **Control boundaries.** Inputs and buttons keep a visible border on purpose —
  WCAG 1.4.11 wants 3:1 for the edge that identifies a control. Removing them
  looks cleaner in a screenshot and is worse to use.
- **The table needs ~1132px.** Below 1024px it scrolls horizontally, and the
  sticky column headers are given up there. Below 640px it becomes a card list
  (not included in this export).
- **Off-rhythm spacing.** The space scale has 2px steps because the app really
  uses them; values marked *off-rhythm* in `tokens.css` are candidates to
  normalise if you want a stricter grid.

## Coming back

Drop the changed files anywhere in the repo and tell me. I'll diff them against
these originals and port the changes into the React components.

## This is a snapshot

`tokens.css`, `app.css` and `base.css` are **copies** taken from `src/` at the
time of export. They drift as the app changes. Ask me to regenerate before
starting a fresh round of design work, so you are not iterating on stale rules.
