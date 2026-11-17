import { useMemo } from 'react'
import { encode } from 'uqr'

/** QR code as one SVG path (crisp at any print size). */
export function Qr({ value, className = '', label }: { value: string; className?: string; label: string }) {
  const { d, size } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', border: 2 })
    let path = ''
    qr.data.forEach((row, y) => {
      let x = 0
      while (x < row.length) {
        if (!row[x]) {
          x++
          continue
        }
        const start = x
        while (x < row.length && row[x]) x++
        path += `M${start} ${y}h${x - start}v1h${start - x}z`
      }
    })
    return { d: path, size: qr.size }
  }, [value])
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={`qr ${className}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#1d1a17" />
    </svg>
  )
}
