/**
 * The turf, drawn as one stretchable SVG.
 *
 * A single camera model places everything. `d` is a real-world depth in metres
 * measured from the far goal line (d=0, top) toward the viewer (larger d,
 * bottom); the pitch is a regulation 105 × 68m and we see the far half plus a
 * little past the centre spot. `yAt(d)` projects that depth to a screen row
 * through a pinhole camera, so depth foreshortens hyperbolically — equal metres
 * compress toward the far end — the way a real low camera behind the goal sees
 * it. Widths scale with the same projection, so every box narrows into the
 * distance and the centre circle becomes an ellipse without any of it being
 * hand-placed.
 *
 * This replaces an earlier version that spaced the markings *linearly* in
 * depth. That put the six-yard line 1.7× too far out, the penalty spot 1.3×,
 * and drew the goal 2.5× too wide — the pitch read as a flat diagram rather
 * than a receding field.
 *
 * preserveAspectRatio="none" lets it stretch to whatever box the pitch
 * occupies, so the layout stays responsive.
 */

const W = 1000
const H = 700
const BANNER_H = 62
const TOP_INSET = 168 // how much narrower the far edge is, per side

// --- camera -------------------------------------------------------------
// Calibrated so the halfway line lands 80% of the way down, matching the
// framing the layout was built around. Everything else follows from it.
const HALF_D = 52.5 // metres to the halfway line
const HALF_Y = 0.8 * H
const Y_H = (-H * (W - 2 * TOP_INSET)) / (2 * TOP_INSET) // horizon row
const R0 = (HALF_D * (HALF_Y - Y_H)) / HALF_Y // camera distance, pitch units
const C = -Y_H * R0

/** Screen row for a depth of `d` metres from the far goal line. */
const yAt = (d) => Y_H + C / (R0 - d)

// The turf spans 68m of playing field plus ~3m of run-off each side. Widths
// are taken as a fraction of the full turf width at the relevant row, so the
// painted field sits inside the run-off automatically.
const PITCH_TOTAL_W = 74
const turfWidthAtRow = (row) => W - 2 * TOP_INSET + 2 * TOP_INSET * (row / H)
/** Horizontal pixels per real-world metre at depth `d`. */
const mppm = (d) => turfWidthAtRow(yAt(d)) / PITCH_TOTAL_W
/** Screen x for a point `u` metres left(-)/right(+) of the pitch's spine. */
const xAt = (u, d) => W / 2 + u * mppm(d)

const fmt = (n) => n.toFixed(1)
const pt = (u, d) => `${fmt(xAt(u, d))},${fmt(yAt(d))}`
/** Rectangle on the grass: `half` metres each side, spanning depths d0..d1. */
const grassBox = (half, d0, d1) =>
  [pt(-half, d0), pt(half, d0), pt(half, d1), pt(-half, d1)].join(' ')

// --- pitch dimensions, all in metres ------------------------------------
const FIELD_HALF = 34 // 68m wide
const PA_HALF = 20.16 // penalty area 40.32m wide
const PA_DEPTH = 16.5
const SIX_HALF = 9.16 // goal area 18.32m wide
const SIX_DEPTH = 5.5
const SPOT_D = 11 // penalty spot
const GOAL_HALF = 3.66 // goal 7.32m wide
const CIRCLE_R = 9.15 // centre circle radius
const CORNER_R = 1

// The near touchline is wherever the projection reaches the bottom of the view.
const NEAR_D = R0 - C / (H - Y_H)

// Penalty arc: only the sliver in front of the box is drawn. Find where the
// 9.15m circle around the spot crosses the box's front edge.
const ARC_HALF_X = Math.sqrt(CIRCLE_R ** 2 - (PA_DEPTH - SPOT_D) ** 2)
const ARC_BULGE_D = SPOT_D + CIRCLE_R // its nearest point, toward the viewer

// Centre circle, as a screen-space ellipse from its depth extent.
const CC_TOP = yAt(HALF_D - CIRCLE_R)
const CC_BOTTOM = yAt(HALF_D + CIRCLE_R)
const CC_CY = (CC_TOP + CC_BOTTOM) / 2
const CC_RY = (CC_BOTTOM - CC_TOP) / 2
const CC_RX = CIRCLE_R * mppm(HALF_D)

// Mowing bands, spaced by equal real-world depth so the stripes foreshorten
// with the rest of the pitch rather than by an arbitrary exponent.
const BANDS = 9
const bandDepths = Array.from(
  { length: BANDS + 1 },
  (_, i) => (NEAR_D * i) / BANDS,
)

export default function PitchSurface() {
  return (
    <svg
      className="pitch-svg"
      viewBox={`0 ${-BANNER_H} ${W} ${H + BANNER_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="boardGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--board-from)" />
          <stop offset="100%" stopColor="var(--board-to)" />
        </linearGradient>
        <pattern
          id="netPattern"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M7 0H0V7"
            fill="none"
            stroke="var(--goal-net)"
            strokeWidth="1"
          />
        </pattern>
        <radialGradient id="turfLight" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity={`var(--turf-sheen)`} />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="turfShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--turf-edge)" stopOpacity="0.55" />
          <stop offset="38%" stopColor="var(--turf-edge)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Perimeter advertising boards */}
      <rect
        x={TOP_INSET}
        y={-BANNER_H}
        width={W - 2 * TOP_INSET}
        height={BANNER_H}
        fill="url(#boardGrad)"
      />

      {/* Turf: mowing bands, projected */}
      {bandDepths.slice(0, -1).map((d0, i) => (
        <polygon
          key={i}
          points={grassBox(FIELD_HALF + 3, d0, bandDepths[i + 1])}
          fill={i % 2 === 0 ? 'var(--turf-light)' : 'var(--turf-dark)'}
        />
      ))}

      {/* Lighting */}
      <polygon points={grassBox(FIELD_HALF + 3, 0, NEAR_D)} fill="url(#turfLight)" />
      <polygon points={grassBox(FIELD_HALF + 3, 0, NEAR_D)} fill="url(#turfShade)" />

      {/* Markings */}
      <g
        fill="none"
        stroke="var(--turf-line)"
        strokeWidth="var(--turf-line-width)"
        strokeLinejoin="round"
      >
        {/* Touchlines and the far goal line; the near end is cropped, so it is
            deliberately left open rather than closed into a false line. */}
        <path
          d={`M ${pt(-FIELD_HALF, NEAR_D)} L ${pt(-FIELD_HALF, 0)} L ${pt(
            FIELD_HALF,
            0,
          )} L ${pt(FIELD_HALF, NEAR_D)}`}
        />

        <polygon points={grassBox(PA_HALF, 0, PA_DEPTH)} />
        <polygon points={grassBox(SIX_HALF, 0, SIX_DEPTH)} />

        {/* Penalty arc — bulges toward the viewer, clipped to the box edge */}
        <path
          d={`M ${pt(-ARC_HALF_X, PA_DEPTH)} A ${fmt(CC_RX)} ${fmt(
            (yAt(ARC_BULGE_D) - yAt(PA_DEPTH)) * 1.15,
          )} 0 0 0 ${pt(ARC_HALF_X, PA_DEPTH)}`}
        />

        {/* Halfway line */}
        <line
          x1={fmt(xAt(-FIELD_HALF, HALF_D))}
          y1={fmt(yAt(HALF_D))}
          x2={fmt(xAt(FIELD_HALF, HALF_D))}
          y2={fmt(yAt(HALF_D))}
        />
        <ellipse cx={W / 2} cy={fmt(CC_CY)} rx={fmt(CC_RX)} ry={fmt(CC_RY)} />

        {/* Corner arcs at the far corners */}
        <path
          d={`M ${pt(-FIELD_HALF + CORNER_R, 0)} A ${fmt(
            CORNER_R * mppm(0),
          )} ${fmt(yAt(CORNER_R) - yAt(0))} 0 0 1 ${pt(-FIELD_HALF, CORNER_R)}`}
        />
        <path
          d={`M ${pt(FIELD_HALF, CORNER_R)} A ${fmt(CORNER_R * mppm(0))} ${fmt(
            yAt(CORNER_R) - yAt(0),
          )} 0 0 1 ${pt(FIELD_HALF - CORNER_R, 0)}`}
        />
      </g>

      {/* Spots */}
      <circle cx={W / 2} cy={fmt(yAt(SPOT_D))} r="3" fill="var(--turf-line)" />
      <circle cx={W / 2} cy={fmt(yAt(HALF_D))} r="3.4" fill="var(--turf-line)" />

      {/* Goal: net straddling the far line, at its true width */}
      <g>
        <rect
          x={fmt(xAt(-GOAL_HALF, 0))}
          y={-BANNER_H + 8}
          width={fmt(2 * GOAL_HALF * mppm(0))}
          height={BANNER_H - 8}
          fill="url(#netPattern)"
          stroke="var(--goal-frame)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
