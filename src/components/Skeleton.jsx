/**
 * Loading placeholders that mirror the shape of what is arriving, so the page
 * does not jump when real content lands.
 */

export function SkeletonBar({ w = '100%', h = 14, r = 6, style }) {
  return (
    <span
      className="skel"
      style={{ width: w, height: h, borderRadius: r, ...style }}
      aria-hidden="true"
    />
  )
}

/** Stand-in for the Player Explorer table. */
export function TableSkeleton({ rows = 12 }) {
  return (
    <div className="skel-page" role="status" aria-live="polite">
      <span className="sr-only">Loading FPL data</span>

      <div className="skel-filters">
        <SkeletonBar w={200} h={38} />
        <SkeletonBar w={150} h={38} />
        <SkeletonBar w={190} h={38} />
        <SkeletonBar w={90} h={38} />
      </div>

      <div className="skel-table">
        <div className="skel-thead">
          <SkeletonBar w="100%" h={40} r={0} />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div className="skel-row" key={i}>
            <SkeletonBar w={30} h={38} />
            <SkeletonBar w={`${38 + ((i * 7) % 22)}%`} h={13} />
            <SkeletonBar w={22} h={22} r={11} />
            <SkeletonBar w={44} h={18} />
            <SkeletonBar w={54} h={13} />
            <SkeletonBar w={40} h={13} />
            <SkeletonBar w={46} h={13} />
          </div>
        ))}
      </div>
    </div>
  )
}
