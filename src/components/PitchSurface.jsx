/**
 * The turf, drawn as one stretchable SVG.
 *
 * Everything is derived from a single perspective model: `t` runs 0 (far end,
 * behind the goal) to 1 (near end), and the pitch edges converge toward the
 * top by TOP_INSET. Markings are built from that same model, so the penalty
 * box foreshortens into a trapezoid and the centre circle into an ellipse
 * without any of it being hand-drawn.
 *
 * preserveAspectRatio="none" lets it stretch to whatever box the pitch
 * occupies, so the layout stays responsive.
 */

const W = 1000
const H = 700
const BANNER_H = 62
const TOP_INSET = 168 // how much narrower the far edge is, per side

const y = (t) => H * t
const left = (t) => TOP_INSET * (1 - t)
const right = (t) => W - TOP_INSET * (1 - t)
const widthAt = (t) => right(t) - left(t)

/** Inset of the painted boundary from the turf edge; grows toward the viewer. */
const pad = (t) => 15 + 15 * t

const pts = (points) =>
  points.map(([x, yy]) => `${x.toFixed(1)},${yy.toFixed(1)}`).join(' ')

/** A quad spanning t0..t1, inset from the pitch edges by `inset`. */
const quad = (t0, t1, inset = 0) =>
  pts([
    [left(t0) + inset, y(t0)],
    [right(t0) - inset, y(t0)],
    [right(t1) - inset, y(t1)],
    [left(t1) + inset, y(t1)],
  ])

/** A box centred on the pitch, `frac` of the full width at each depth. */
const centredBox = (t0, t1, frac) => {
  const halfTop = (widthAt(t0) * frac) / 2
  const halfBottom = (widthAt(t1) * frac) / 2
  return pts([
    [500 - halfTop, y(t0)],
    [500 + halfTop, y(t0)],
    [500 + halfBottom, y(t1)],
    [500 - halfBottom, y(t1)],
  ])
}

// Mowing bands: equal real-world depths compress toward the far end, so the
// exponent makes the top bands thin and the near ones broad.
const BANDS = 9
const bandEdges = Array.from({ length: BANDS + 1 }, (_, i) =>
  Math.pow(i / BANDS, 1.45),
)

const HALFWAY_T = 0.8
const BOX_FAR = 0.035
const BOX_NEAR = 0.235
const SIX_NEAR = 0.105
const SPOT_T = 0.16

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
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M9 0H0V9"
            fill="none"
            stroke="var(--goal-net)"
            strokeWidth="1.1"
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
        x={left(0)}
        y={-BANNER_H}
        width={widthAt(0)}
        height={BANNER_H}
        fill="url(#boardGrad)"
      />

      {/* Goal: a frame with depth, standing on the far goal line.
          The mouth is the near rectangle on the line (y=0); the net recedes
          up and back to a smaller rectangle, so it reads as a box rather than
          a flat hatch. The four struts connect the two. */}
      <g>
        {(() => {
          // The goal is ~40% of the six-yard box width (7.32m in an 18.32m
          // box), so it must sit clearly narrower than the box, centred on it.
          const MOUTH_L = 452
          const MOUTH_R = 548
          const MOUTH_TOP = -36 // crossbar height above the line
          const DEPTH = 18 // how far the net sits back
          const TAPER = 8 // perspective narrowing of the back frame
          const backL = MOUTH_L + TAPER
          const backR = MOUTH_R - TAPER
          const backBottom = -DEPTH
          const backTop = MOUTH_TOP - DEPTH * 0.5
          return (
            <>
              {/* Net: the receding faces, filled with mesh */}
              <polygon
                points={`${MOUTH_L},0 ${MOUTH_R},0 ${backR},${backBottom} ${backL},${backBottom}`}
                fill="url(#netPattern)"
                opacity="0.9"
              />
              <polygon
                points={`${MOUTH_L},0 ${MOUTH_L},${MOUTH_TOP} ${backL},${backTop} ${backL},${backBottom}`}
                fill="url(#netPattern)"
              />
              <polygon
                points={`${MOUTH_R},0 ${MOUTH_R},${MOUTH_TOP} ${backR},${backTop} ${backR},${backBottom}`}
                fill="url(#netPattern)"
              />
              <polygon
                points={`${MOUTH_L},${MOUTH_TOP} ${MOUTH_R},${MOUTH_TOP} ${backR},${backTop} ${backL},${backTop}`}
                fill="url(#netPattern)"
                opacity="0.85"
              />
              {/* Back frame, dimmer since it is further away */}
              <polygon
                points={`${backL},${backBottom} ${backR},${backBottom} ${backR},${backTop} ${backL},${backTop}`}
                fill="none"
                stroke="var(--goal-frame)"
                strokeOpacity="0.5"
                strokeWidth="2"
              />
              {/* Depth struts from the mouth to the back frame */}
              <g stroke="var(--goal-frame)" strokeOpacity="0.5" strokeWidth="2">
                <line x1={MOUTH_L} y1="0" x2={backL} y2={backBottom} />
                <line x1={MOUTH_R} y1="0" x2={backR} y2={backBottom} />
                <line x1={MOUTH_L} y1={MOUTH_TOP} x2={backL} y2={backTop} />
                <line x1={MOUTH_R} y1={MOUTH_TOP} x2={backR} y2={backTop} />
              </g>
              {/* Front frame: posts and crossbar, the brightest part */}
              <path
                d={`M ${MOUTH_L} 0 L ${MOUTH_L} ${MOUTH_TOP} L ${MOUTH_R} ${MOUTH_TOP} L ${MOUTH_R} 0`}
                fill="none"
                stroke="var(--goal-frame)"
                strokeWidth="4"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          )
        })()}
      </g>

      {/* Turf: mowing bands */}
      {bandEdges.slice(0, -1).map((t0, i) => (
        <polygon
          key={i}
          points={quad(t0, bandEdges[i + 1])}
          fill={i % 2 === 0 ? 'var(--turf-light)' : 'var(--turf-dark)'}
        />
      ))}

      {/* Lighting */}
      <polygon points={quad(0, 1)} fill="url(#turfLight)" />
      <polygon points={quad(0, 1)} fill="url(#turfShade)" />

      {/* Markings */}
      <g
        fill="none"
        stroke="var(--turf-line)"
        strokeWidth="var(--turf-line-width)"
      >
        <polygon points={quad(0.012, 0.995, pad(0.5))} />
        <polygon points={centredBox(BOX_FAR, BOX_NEAR, 0.62)} />
        <polygon points={centredBox(BOX_FAR, SIX_NEAR, 0.28)} />

        {/* Penalty arc — only the part outside the box is painted */}
        <path
          d={`M ${500 - 92} ${y(BOX_NEAR)} A 92 34 0 0 0 ${500 + 92} ${y(BOX_NEAR)}`}
        />

        <line
          x1={left(HALFWAY_T) + pad(HALFWAY_T)}
          y1={y(HALFWAY_T)}
          x2={right(HALFWAY_T) - pad(HALFWAY_T)}
          y2={y(HALFWAY_T)}
        />
        <ellipse
          cx="500"
          cy={y(HALFWAY_T)}
          rx={widthAt(HALFWAY_T) * 0.155}
          ry="44"
        />
      </g>

      <circle cx="500" cy={y(SPOT_T)} r="3.4" fill="var(--turf-line)" />
      <circle cx="500" cy={y(HALFWAY_T)} r="4" fill="var(--turf-line)" />
    </svg>
  )
}
