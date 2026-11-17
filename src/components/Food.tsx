// Hand-drawn top-down food illustrations (no stock photos). 120×120 viewBox.
import type { ReactNode } from 'react'
import type { Art } from '../../shared/menu'

const Bowl = ({ broth, children, rim = '#2c5aa0' }: { broth: string; children?: ReactNode; rim?: string }) => (
  <>
    <circle cx="60" cy="62" r="54" fill="rgb(0 0 0 / 0.08)" />
    <circle cx="60" cy="59" r="54" fill="#fffdf8" stroke="#e4dccd" strokeWidth="1.5" />
    <circle cx="60" cy="59" r="49" fill="none" stroke={rim} strokeWidth="3" strokeDasharray="7 5" />
    <circle cx="60" cy="59" r="44" fill={broth} />
    <ellipse cx="46" cy="44" rx="16" ry="7" fill="#fff" opacity="0.16" transform="rotate(-30 46 44)" />
    {children}
  </>
)

const Plate = ({ children }: { children?: ReactNode }) => (
  <>
    <circle cx="60" cy="62" r="54" fill="rgb(0 0 0 / 0.08)" />
    <circle cx="60" cy="59" r="54" fill="#fffdf8" stroke="#e4dccd" strokeWidth="1.5" />
    <circle cx="60" cy="59" r="44" fill="none" stroke="#efe7d8" strokeWidth="2" />
    {children}
  </>
)

const Noodles = ({ color = '#f4e6bd', wide = false }: { color?: string; wide?: boolean }) => (
  <g fill="none" stroke={color} strokeWidth={wide ? 7 : 3} strokeLinecap="round" opacity="0.95">
    <path d="M30 60c6-8 12 8 18 0s12 8 18 0 12 8 18 0" />
    <path d="M32 70c6-8 12 8 18 0s12 8 18 0 12 8 16 0" />
    <path d="M36 50c6-8 12 8 18 0s12 8 18 0 10 6 14 0" />
    {!wide && <path d="M40 80c6-6 10 6 16 0s10 6 16 0" />}
  </g>
)

const Leaf = ({ x, y, r = 0, c = '#3f9b4a' }: { x: number; y: number; r?: number; c?: string }) => (
  <ellipse cx={x} cy={y} rx="8" ry="3.6" fill={c} transform={`rotate(${r} ${x} ${y})`} />
)

const Ball = ({ x, y, c = '#b98a63' }: { x: number; y: number; c?: string }) => (
  <g>
    <circle cx={x} cy={y} r="6" fill={c} />
    <circle cx={x - 2} cy={y - 2} r="1.8" fill="#fff" opacity="0.35" />
  </g>
)

const Slice = ({ x, y, r = 0, c = '#e59a8e' }: { x: number; y: number; r?: number; c?: string }) => (
  <rect x={x - 9} y={y - 5} width="18" height="10" rx="3" fill={c} transform={`rotate(${r} ${x} ${y})`} />
)

const Egg = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-16 -2c-2-10 10-15 17-12 9-4 18 4 15 12 4 8-4 16-14 14-9 4-20-2-18-14z" fill="#fff" stroke="#efe6d4" />
    <circle cx="1" cy="0" r="7" fill="#f6a91c" />
    <circle cx="-1" cy="-2" r="2" fill="#fff" opacity="0.5" />
  </g>
)

const Rice = ({ x = 60, y = 60, r = 26 }: { x?: number; y?: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#fbf8f1" stroke="#ece4d3" />
    {[...Array(14)].map((_, i) => (
      <ellipse
        key={i}
        cx={x + Math.cos(i * 2.4) * r * 0.62 * ((i % 3) / 3 + 0.4)}
        cy={y + Math.sin(i * 2.4) * r * 0.62 * ((i % 3) / 3 + 0.4)}
        rx="2.6"
        ry="1.2"
        fill="#e9e1cf"
        transform={`rotate(${i * 40} ${x} ${y})`}
      />
    ))}
  </g>
)

const Chili = ({ x, y }: { x: number; y: number }) => <circle cx={x} cy={y} r="2.2" fill="#d7262e" />

const Glass = ({ fill, top, frappe }: { fill: string; top?: string; frappe?: boolean }) => (
  <>
    <ellipse cx="60" cy="108" rx="28" ry="5" fill="rgb(0 0 0 / 0.1)" />
    <path d="M36 18h48l-7 86a6 6 0 0 1-6 5H49a6 6 0 0 1-6-5z" fill="#fff" opacity="0.6" stroke="#d9d3c7" strokeWidth="1.5" />
    <path d={frappe ? 'M38 30h44l-6 72a5 5 0 0 1-5 4H49a5 5 0 0 1-5-4z' : 'M39 40h42l-5 62a5 5 0 0 1-5 4H49a5 5 0 0 1-5-4z'} fill={fill} />
    {top && <path d="M39 40h42l-1 10c-8 4-32 4-40 0z" fill={top} opacity="0.9" />}
    {!frappe && (
      <g fill="#fff" opacity="0.45">
        <rect x="46" y="46" width="12" height="12" rx="3" transform="rotate(-12 52 52)" />
        <rect x="62" y="58" width="11" height="11" rx="3" transform="rotate(14 67 63)" />
      </g>
    )}
    {frappe && <path d="M38 30c4-12 40-12 44 0z" fill={fill} />}
    <path d="M68 6l-6 90" stroke="#d7262e" strokeWidth="4" strokeLinecap="round" />
    <path d="M41 24l4 70" stroke="#fff" strokeWidth="3" opacity="0.5" strokeLinecap="round" />
  </>
)

const ART: Record<Art, ReactNode> = {
  soup: (
    <Bowl broth="#8a4a2b">
      <Noodles />
      <Ball x={44} y={48} />
      <Ball x={74} y={74} />
      <Slice x={70} y={44} r={20} c="#d98f86" />
      <Slice x={44} y={74} r={-15} c="#d98f86" />
      <Leaf x={58} y={78} r={30} />
      <Leaf x={78} y={58} r={-40} />
      <Leaf x={60} y={40} r={10} c="#69b85a" />
    </Bowl>
  ),
  tomyum: (
    <Bowl broth="#e0782f">
      <Noodles />
      <Ball x={46} y={50} />
      <Slice x={72} y={70} r={10} c="#d98f86" />
      {[[40, 70], [52, 40], [76, 46], [64, 80], [82, 62]].map(([x, y]) => <Chili key={x} x={x} y={y} />)}
      <circle cx="62" cy="58" r="6" fill="#c9a36b" opacity="0.8" />
      <Leaf x={72} y={50} r={-30} />
    </Bowl>
  ),
  pink: (
    <Bowl broth="#e5677a">
      <Noodles />
      <circle cx="46" cy="50" r="7" fill="none" stroke="#fff6ec" strokeWidth="3.5" />
      <circle cx="74" cy="70" r="7" fill="none" stroke="#fff6ec" strokeWidth="3.5" />
      <rect x="64" y="40" width="12" height="12" rx="2" fill="#e8b25f" />
      <rect x="40" y="68" width="12" height="12" rx="2" fill="#e8b25f" />
      <Leaf x={60} y={80} r={20} />
    </Bowl>
  ),
  beef: (
    <Bowl broth="#6b3b22">
      <Noodles wide color="#f1e4c2" />
      {[[46, 46], [72, 50], [54, 74], [76, 74]].map(([x, y], i) => (
        <rect key={i} x={x - 7} y={y - 6} width="14" height="12" rx="4" fill="#5a2d18" stroke="#7a4a2c" />
      ))}
      <Leaf x={62} y={60} r={-20} />
      <Leaf x={40} y={62} r={60} />
    </Bowl>
  ),
  dry: (
    <Bowl broth="#f6efe0" rim="#c0392b">
      <Noodles color="#efbf45" />
      <Slice x={48} y={46} r={-20} c="#c9402f" />
      <Slice x={56} y={44} r={-20} c="#c9402f" />
      <path d="M70 68c6-10 18-6 16 4s-16 8-16-4z" fill="#f5e6c6" stroke="#e6d1a6" />
      <path d="M44 70c6-10 18-6 16 4s-16 8-16-4z" fill="#f5e6c6" stroke="#e6d1a6" />
      <Leaf x={74} y={46} r={-30} />
    </Bowl>
  ),
  krapow: (
    <Plate>
      <Rice x={48} y={60} r={24} />
      <path d="M62 44c14-6 26 4 24 18s-12 24-24 18-14-30 0-36z" fill="#5a3a24" />
      {[[70, 50], [78, 62], [66, 70], [74, 74]].map(([x, y], i) => <Leaf key={i} x={x} y={y} r={i * 50} c="#2f7d3a" />)}
      <Chili x={64} y={58} />
      <Chili x={80} y={52} />
      <Egg x={46} y={46} s={0.8} />
    </Plate>
  ),
  friedrice: (
    <Plate>
      <circle cx="56" cy="58" r="30" fill="#f1cf7a" />
      {[...Array(16)].map((_, i) => (
        <circle key={i} cx={56 + Math.cos(i) * (8 + (i % 4) * 5)} cy={58 + Math.sin(i) * (8 + (i % 4) * 5)} r="2" fill={i % 3 ? '#e2b44f' : '#d8743b'} />
      ))}
      <circle cx="88" cy="74" r="7" fill="#9bc25b" stroke="#6f9a33" />
      <circle cx="84" cy="44" r="8" fill="#e04b3a" />
      <rect x="78" y="56" width="16" height="6" rx="3" fill="#7fb06a" />
    </Plate>
  ),
  padsew: (
    <Plate>
      <g fill="none" stroke="#7a4a26" strokeWidth="8" strokeLinecap="round">
        <path d="M32 56c8-8 16 8 24 0s16 8 26 0" />
        <path d="M34 70c8-8 16 8 24 0s16 8 24 0" />
        <path d="M40 44c8-6 14 6 22 0s14 6 20 0" />
      </g>
      <Leaf x={52} y={62} r={20} c="#3c8f3c" />
      <Leaf x={72} y={50} r={-30} c="#3c8f3c" />
      <path d="M62 72l10 4-6 6z" fill="#f2d16b" />
      <path d="M44 48l8-2 0 8z" fill="#f2d16b" />
    </Plate>
  ),
  radna: (
    <Plate>
      <circle cx="60" cy="59" r="36" fill="#a5672e" />
      <ellipse cx="50" cy="48" rx="12" ry="5" fill="#fff" opacity="0.18" transform="rotate(-25 50 48)" />
      <Leaf x={48} y={66} r={10} c="#3c8f3c" />
      <Leaf x={68} y={52} r={-40} c="#3c8f3c" />
      <Leaf x={70} y={72} r={60} c="#3c8f3c" />
      <Slice x={56} y={56} r={30} c="#e7b8a6" />
    </Plate>
  ),
  garlic: (
    <Plate>
      <Rice x={46} y={62} r={24} />
      <path d="M62 40c18-4 28 10 22 24s-16 18-24 10-14-30 2-34z" fill="#8a5a2e" />
      {[...Array(9)].map((_, i) => <circle key={i} cx={66 + (i % 3) * 6} cy={50 + Math.floor(i / 3) * 7} r="1.8" fill="#f2cf7a" />)}
      <Egg x={74} y={80} s={0.6} />
    </Plate>
  ),
  balls: (
    <Plate>
      {[[40, 50], [52, 60], [64, 50], [76, 60], [46, 72], [70, 74]].map(([x, y], i) => (
        <Ball key={i} x={x} y={y} c={i % 2 ? '#9c6a40' : '#c08d5f'} />
      ))}
      <circle cx="86" cy="40" r="10" fill="#d9472f" stroke="#fff" strokeWidth="2" />
    </Plate>
  ),
  wonton: (
    <Plate>
      {[[44, 48, 0], [66, 44, 30], [52, 70, -20], [76, 66, 60], [60, 58, 10]].map(([x, y, r], i) => (
        <path key={i} d="M-12 6L0 -12 12 6z" fill="#e9a948" stroke="#c9822b" strokeWidth="1.5" transform={`translate(${x} ${y}) rotate(${r})`} strokeLinejoin="round" />
      ))}
      <circle cx="86" cy="78" r="9" fill="#e85a3c" stroke="#fff" strokeWidth="2" />
    </Plate>
  ),
  omelet: (
    <Plate>
      <path d="M26 60c0-22 22-32 36-30s32 10 32 30-18 32-34 30-34-8-34-30z" fill="#f2b632" />
      <path d="M34 56c4-12 18-18 28-16" stroke="#d48a1c" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M50 74c10 4 22 2 30-6" stroke="#d48a1c" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="58" cy="60" r="3" fill="#b5651d" />
      <circle cx="72" cy="52" r="2.5" fill="#b5651d" />
    </Plate>
  ),
  porkfried: (
    <Plate>
      {[[44, 48], [62, 44], [78, 56], [50, 66], [68, 70], [56, 54]].map(([x, y], i) => (
        <rect key={i} x={x - 8} y={y - 6} width="16" height="12" rx="4" fill={i % 2 ? '#a0612b' : '#b8722f'} transform={`rotate(${i * 25} ${x} ${y})`} />
      ))}
      {[...Array(10)].map((_, i) => <circle key={i} cx={40 + i * 5} cy={80 - (i % 2) * 4} r="2" fill="#f2cf7a" />)}
      <Leaf x={84} y={76} r={20} c="#69b85a" />
    </Plate>
  ),
  thaitea: <Glass fill="#e8873a" top="#f6dcc0" />,
  greentea: <Glass fill="#8fbf5a" top="#e6f0d2" />,
  oliang: <Glass fill="#3b2416" />,
  soda: (
    <>
      <Glass fill="#5a2418" />
      {[[52, 70], [60, 84], [56, 92], [66, 76]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill="#fff" opacity="0.5" />)}
    </>
  ),
  water: (
    <>
      <ellipse cx="60" cy="110" rx="20" ry="4" fill="rgb(0 0 0 / 0.1)" />
      <rect x="52" y="8" width="16" height="10" rx="2" fill="#2c7fd1" />
      <path d="M50 18h20c6 8 8 12 8 20v62a8 8 0 0 1-8 8H50a8 8 0 0 1-8-8V38c0-8 2-12 8-20z" fill="#cfe7fb" stroke="#9cc8ef" strokeWidth="1.5" />
      <rect x="42" y="56" width="36" height="18" fill="#2c7fd1" />
      <path d="M48 30v60" stroke="#fff" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
    </>
  ),
  bualoy: (
    <Bowl broth="#fbf3e2" rim="#c0392b">
      {[[44, 50, '#f29fb5'], [56, 44, '#9fd38a'], [70, 48, '#fff'], [48, 66, '#9fd38a'], [62, 72, '#f29fb5'], [74, 64, '#f6e7c6'], [58, 58, '#fff']].map(
        ([x, y, c], i) => <circle key={i} cx={x} cy={y} r="5.5" fill={c as string} stroke="#eadcc2" />,
      )}
      <circle cx="74" cy="78" r="7" fill="#f6a91c" stroke="#fff" strokeWidth="3" />
    </Bowl>
  ),
  tubtim: (
    <Bowl broth="#fdf8ee" rim="#c0392b">
      {[[46, 48], [58, 44], [72, 50], [50, 62], [64, 60], [78, 66], [56, 76], [70, 76], [42, 72]].map(([x, y], i) => (
        <rect key={i} x={x - 4.5} y={y - 4.5} width="9" height="9" rx="2.5" fill={i % 3 ? '#d7263e' : '#e8506a'} transform={`rotate(${i * 20} ${x} ${y})`} />
      ))}
      <path d="M40 40l8 6M78 40l-6 8M60 84l4-8" stroke="#dbe9f5" strokeWidth="5" strokeLinecap="round" />
    </Bowl>
  ),
}

export const ART_KEYS = Object.keys(ART) as Art[]

export function Food({ art, className = '' }: { art: Art; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={`food ${className}`} aria-hidden="true" focusable="false">
      {ART[art] ?? ART.soup}
    </svg>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <path d="M30 4l-8 20M38 6l-12 18" stroke="#3b2416" strokeWidth="3" strokeLinecap="round" />
      <path d="M4 24h40c0 12-9 20-20 20S4 36 4 24z" fill="#f2b705" />
      <path d="M4 24h40" stroke="#b8232f" strokeWidth="4" strokeLinecap="round" />
      <path d="M12 32c4-3 6 3 10 0s6 3 10 0 6 3 6 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
    </svg>
  )
}
