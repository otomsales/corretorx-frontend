/** Sparkline SVG leve (sem lib de chart). Área + linha, endpoint destacado. */
export function Sparkline({
  data,
  className,
  stroke = 'hsl(var(--teal))',
  height = 40,
  width = 120,
}: {
  data: number[]
  className?: string
  stroke?: string
  height?: number
  width?: number
}) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const stepX = width / (data.length - 1)
  const pts = data.map((v, i) => [i * stepX, height - ((v - min) / span) * (height - 4) - 2] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${height} ${line} ${width},${height}`
  const gid = `spark-${Math.round(pts[0][1] * 100)}-${data.length}`
  const [ex, ey] = pts[pts.length - 1]

  return (
    <svg className={className} width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ex} cy={ey} r="2.4" fill={stroke} />
    </svg>
  )
}
