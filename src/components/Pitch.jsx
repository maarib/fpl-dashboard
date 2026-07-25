import PitchSurface from './PitchSurface'

const BENCH_HEADS = ['GKP', '1. DEF', '2. MID', '3. FWD']

/**
 * Turf plus the formation rows, with the bench sitting on the near end of the
 * pitch as it does on the official view.
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
                  <span className="bench__head">{BENCH_HEADS[index]}</span>
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
