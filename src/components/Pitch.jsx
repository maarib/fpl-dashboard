/**
 * The turf surface. Renders four formation rows (GK, DEF, MID, FWD) plus an
 * optional bench strip beneath. Both My XI and Look-up-a-team render into it.
 */
export default function Pitch({ rows, bench, benchLabel = 'Bench' }) {
  return (
    <div className="pitch-stage">
      <div className="pitch-turf" />
      <div className="pitch-lines" aria-hidden="true">
        <span className="m-outer" />
        <span className="m-box" />
        <span className="m-six" />
        <span className="m-spot" />
        <span className="m-arc" />
        <span className="m-halfway" />
        <span className="m-circle" />
      </div>

      <div className="pitch-rows">
        {rows.map((row, index) => (
          <div className="pitch-row" key={index}>
            {row}
          </div>
        ))}
      </div>

      {bench && (
        <div className="bench-strip">
          <span className="bench-strip__label">{benchLabel}</span>
          <div className="bench-strip__row">{bench}</div>
        </div>
      )}
    </div>
  )
}
