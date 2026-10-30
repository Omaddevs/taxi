import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

// Bosh sahifa grafiklari. Ranglar rol bo‘yicha qat’iy: seriya tartibi o‘zgarsa ham rang
// o‘zgarmaydi (haydovchi doim ko‘k, yo‘lovchi doim to‘q sariq).
export const SERIES = {
  driver: '#2a78d6',
  passenger: '#eb6834',
  calls: '#1baf7a',
  amber: '#eda100',
  violet: '#6250d6',
  other: '#c9ccd3',
} as const

const nf = (n: number) => n.toLocaleString('uz-UZ')

export function Legend({ items }: { items: { label: string; color: string; value?: number | string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
          {item.label}
          {item.value !== undefined ? <span className="font-bold text-ink">{item.value}</span> : null}
        </li>
      ))}
    </ul>
  )
}

/** Kunlik trend: bir xil o‘lchovdagi (e’lonlar soni) bir nechta seriya, bitta o‘q. */
export function TrendChart({
  labels,
  series,
  height = 220,
}: {
  labels: string[]
  series: { key: string; label: string; color: string; values: number[] }[]
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const n = labels.length
  const peak = Math.max(1, ...series.flatMap((s) => s.values))
  const top = niceCeil(peak)
  const W = 100
  const H = 100
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W)
  const y = (v: number) => H - (v / top) * H
  const ticks = [0, top / 2, top]
  const labelEvery = n > 14 ? Math.ceil(n / 7) : 1

  return (
    <div>
      <div className="flex gap-2" style={{ height }}>
        <div className="flex w-7 shrink-0 flex-col justify-between pb-0.5 text-right text-[10px] text-muted">
          {[...ticks].reverse().map((t) => (
            <span key={t}>{nf(Math.round(t))}</span>
          ))}
        </div>
        <div
          className="relative min-w-0 flex-1"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            setHover(Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1)))))
          }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {ticks.map((t) => (
              <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} stroke="#eceef2" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s) => {
              const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
              return (
                <g key={s.key}>
                  <polygon points={`0,${H} ${pts} ${W},${H}`} fill={s.color} opacity={0.08} />
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              )
            })}
            {hover !== null ? (
              <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="#9aa0ab" strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ) : null}
          </svg>
          {hover !== null
            ? series.map((s) => (
                <span
                  key={s.key}
                  className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                  style={{ left: `${x(hover)}%`, top: `${y(s.values[hover])}%`, background: s.color }}
                />
              ))
            : null}
          {hover !== null ? (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-xl border border-line bg-white px-3 py-2 shadow-lg"
              style={
                x(hover) > 60
                  ? { right: `calc(${100 - x(hover)}% + 10px)` }
                  : { left: `calc(${x(hover)}% + 10px)` }
              }
            >
              <p className="mb-1 text-xs font-bold text-ink">{labels[hover]}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-bold text-ink">{nf(s.values[hover])}</span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex pl-9">
        {labels.map((label, i) => (
          <span key={i} className="flex-1 truncate text-center text-[10px] font-medium text-muted first:text-left last:text-right">
            {i % labelEvery === 0 || i === n - 1 ? label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function niceCeil(v: number) {
  if (v <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(v))
  const step = [1, 2, 2.5, 5, 10].find((m) => m * pow >= v) ?? 10
  return step * pow
}

/** Ulushlar uchun donut: segmentlar orasida 2px oq bo‘shliq, markazda jami. */
export function Donut({
  items,
  size = 168,
  center,
}: {
  items: { key: string; label: string; value: number; color: string }[]
  size?: number
  center?: ReactNode
}) {
  const [hover, setHover] = useState<string | null>(null)
  const total = items.reduce((s, i) => s + i.value, 0)
  const r = 42
  const c = 2 * Math.PI * r
  const gap = total > 0 && items.filter((i) => i.value > 0).length > 1 ? 1.2 : 0
  let offset = 0
  const active = items.find((i) => i.key === hover)

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#eef1f5" strokeWidth={12} />
        {total > 0
          ? items.map((item) => {
              const len = (item.value / total) * c
              const seg = (
                <circle
                  key={item.key}
                  cx={50}
                  cy={50}
                  r={r}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={hover === item.key ? 14 : 12}
                  strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                  strokeDashoffset={-offset}
                  className="cursor-pointer transition-[stroke-width]"
                  onMouseEnter={() => setHover(item.key)}
                  onMouseLeave={() => setHover(null)}
                >
                  <title>{`${item.label}: ${item.value}`}</title>
                </circle>
              )
              offset += len
              return item.value > 0 ? seg : null
            })
          : null}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {active ? (
          <>
            <span className="text-2xl font-extrabold text-ink">{nf(active.value)}</span>
            <span className="text-[11px] text-muted">{active.label}</span>
          </>
        ) : (
          center
        )}
      </div>
    </div>
  )
}

/** Qalin progress chiziq (rasmdagi "Invoice Overview" uslubida) — yo‘l-yo‘l to‘ldirish bilan. */
export function ProgressRow({
  label,
  value,
  max,
  color,
  right,
  sub,
}: {
  label: ReactNode
  value: number
  max: number
  color: string
  right?: ReactNode
  sub?: ReactNode
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{label}</p>
          {sub ? <p className="truncate text-[11px] text-muted">{sub}</p> : null}
        </div>
        <div className="shrink-0 text-sm text-muted">{right ?? <span className="font-bold text-ink">{nf(value)}</span>}</div>
      </div>
      <div className="h-3.5 overflow-hidden rounded-full bg-[#eef1f5]" title={`${nf(value)} (${Math.round(pct)}%)`}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${value > 0 ? Math.max(pct, 3) : 0}%`,
            backgroundColor: color,
            backgroundImage:
              'repeating-linear-gradient(135deg, rgba(255,255,255,0.22) 0 2px, transparent 2px 7px)',
          }}
        />
      </div>
    </div>
  )
}

/** Bir nechta qiymatni bitta chiziqda ulush sifatida ko‘rsatadi (2px oraliq bilan). */
export function StackBar({ items }: { items: { key: string; label: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0)
  return (
    <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-[#eef1f5]">
      {total > 0
        ? items
            .filter((i) => i.value > 0)
            .map((item) => (
              <div
                key={item.key}
                title={`${item.label}: ${nf(item.value)}`}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(item.value / total) * 100}%`, background: item.color }}
              />
            ))
        : null}
    </div>
  )
}

/** Kichik ustunlar: soatlar yoki kunlar bo‘yicha taqsimot. */
export function MiniBars({
  items,
  color,
  height = 120,
  highlight,
}: {
  items: { key: string; label: string; value: number; tip?: string }[]
  color: string
  height?: number
  highlight?: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const peak = Math.max(1, ...items.map((i) => i.value))
  const labelEvery = items.length > 14 ? Math.ceil(items.length / 8) : 1
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {items.map((item) => (
          <div
            key={item.key}
            className="relative flex h-full min-w-0 flex-1 items-end"
            onMouseEnter={() => setHover(item.key)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className={cn('w-full rounded-t-[4px] transition-opacity', hover && hover !== item.key ? 'opacity-50' : '')}
              style={{
                height: `${item.value > 0 ? Math.max(4, (item.value / peak) * 100) : 2}%`,
                background: item.value > 0 ? color : '#e3e6ec',
                outline: highlight === item.key ? `2px solid ${color}` : undefined,
                outlineOffset: 2,
              }}
            />
            {hover === item.key ? (
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-white">
                {item.tip ?? item.label}: {nf(item.value)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {items.map((item, i) => (
          <span key={item.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted">
            {i % labelEvery === 0 ? item.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Raqamli plitka: katta raqam, oldingi davrga nisbatan o‘zgarish. */
export function MetricTile({
  label,
  value,
  icon,
  accent,
  delta,
  hint,
}: {
  label: string
  value: string
  icon: ReactNode
  accent: string
  delta?: number | null
  hint?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_8px_30px_rgba(28,28,40,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${accent}1a`, color: accent }}
        >
          {icon}
        </span>
      </div>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        {delta !== undefined && delta !== null ? (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-bold',
              delta > 0 ? 'bg-emerald-50 text-emerald-700' : delta < 0 ? 'bg-red-50 text-red-600' : 'bg-canvas text-muted',
            )}
          >
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} {Math.abs(delta)}%
          </span>
        ) : null}
        {hint}
      </div>
    </div>
  )
}

/** Davrlar bo‘yicha ustma-ust ustunlar (masalan haydovchi + yo‘lovchi), segmentlar orasida 2px. */
export function StackedBars({
  items,
  series,
  height = 200,
}: {
  items: { key: string; label: string; tip: string; values: Record<string, number> }[]
  series: { key: string; label: string; color: string }[]
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const totals = items.map((i) => series.reduce((s, x) => s + (i.values[x.key] ?? 0), 0))
  const top = niceCeil(Math.max(1, ...totals))
  const labelEvery = items.length > 16 ? Math.ceil(items.length / 10) : 1
  return (
    <div>
      <div className="flex gap-2" style={{ height }}>
        <div className="flex w-7 shrink-0 flex-col justify-between text-right text-[10px] text-muted">
          <span>{nf(top)}</span>
          <span>{nf(top / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative flex min-w-0 flex-1 items-end gap-[3px] border-b border-line">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
          {items.map((item, i) => (
            <div
              key={item.key}
              className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={cn('flex w-full flex-col-reverse gap-[2px] transition-opacity', hover !== null && hover !== i ? 'opacity-45' : '')}
                style={{ height: `${(totals[i] / top) * 100}%` }}
              >
                {series.map((s, si) => {
                  const v = item.values[s.key] ?? 0
                  if (!v) return null
                  const isTop = series.slice(si + 1).every((x) => !(item.values[x.key] ?? 0))
                  return (
                    <div
                      key={s.key}
                      className={cn('w-full', isTop ? 'rounded-t-[4px]' : '')}
                      style={{ flexGrow: v, flexBasis: 0, minHeight: 2, background: s.color }}
                    />
                  )
                })}
              </div>
              {hover === i ? (
                <div
                  className={cn(
                    'pointer-events-none absolute bottom-full z-10 mb-2 min-w-40 rounded-xl border border-line bg-white px-3 py-2 shadow-lg',
                    i > items.length * 0.6 ? 'right-0' : 'left-0',
                  )}
                >
                  <p className="mb-1 text-xs font-bold whitespace-nowrap text-ink">{item.tip}</p>
                  {series.map((s) => (
                    <p key={s.key} className="flex items-center justify-between gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                      <span className="font-bold text-ink">{nf(item.values[s.key] ?? 0)}</span>
                    </p>
                  ))}
                  <p className="mt-1 flex justify-between border-t border-line pt-1 text-xs text-muted">
                    Jami <span className="font-bold text-ink">{nf(totals[i])}</span>
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex gap-[3px] pl-9">
        {items.map((item, i) => (
          <span key={item.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted">
            {i % labelEvery === 0 || i === items.length - 1 ? item.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
