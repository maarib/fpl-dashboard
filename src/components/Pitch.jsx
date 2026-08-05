import PitchSurface from './PitchSurface'

/**
 * Turf plus the formation rows, with the bench sitting on the near end of the
 * pitch as it does on the official view.
 *
 * Bench cards carry their own position pill and substitution order, so the
 * column headings the bench used to need are gone — the label is on the card
 * it describes rather than floating above it.
 */
export default function Pitch({ rows, bench, benchLabel = 'Substitutes' }) {
  return (
    <div className="pitch">
      <PitchSurface />

      <div className="pitch-rows">
        {rows.map((row, index) => (
          <div className="pitch-row" key={index}>
            {row}
          </div>
        ))}

        {bench && (
          <div className="bench">
            <div className="bench__cols">
              {bench.map((card, index) => (
                <div className="bench__col" key={index}>
                  {card}
                </div>
              ))}
            </div>
            <span className="bench__label">{benchLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}
