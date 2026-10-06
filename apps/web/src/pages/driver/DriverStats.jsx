import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, ChevronRight, Clock, Route, ShoppingBag, Wallet } from 'lucide-react'
import { api } from '../../lib/api'
import { formatSom } from '../../lib/utils'
import { DriverHeader, DriverTabs } from './ui'

const TABS = [
  { id: 'all', label: 'Umumiy' },
  { id: 'income', label: 'Daromad' },
  { id: 'orders', label: 'Buyurtmalar' },
  { id: 'routes', label: 'Yo‘nalishlar' },
]

export default function DriverStats() {
  const [tab, setTab] = useState('all')
  const { data: stats } = useQuery({ queryKey: ['driver-stats'], queryFn: () => api.get('/drivers/me/stats') })

  const total = stats?.todayEarnings ?? 0
  const growth = stats?.growthPct ?? 0
  const daily = stats?.dailyEarnings || []
  const hourly = stats?.hourlyActivity || Array.from({ length: 24 }, () => 0)
  const top = stats?.topOrders || []

  return (
    <div className="overflow-x-clip bg-canvas">
      <DriverHeader
        title="Statistika"
        right={
          <button type="button" className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1.5 text-[11px] font-bold text-brand">
            <Calendar className="h-3.5 w-3.5" /> Bugun
          </button>
        }
      />

      <DriverTabs>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`truncate border-b-2 pb-2.5 text-center text-[13px] font-bold outline-none ${tab === t.id ? 'border-brand text-ink' : 'border-transparent text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </DriverTabs>

      <div className="space-y-3 overflow-x-clip px-4 py-4">
        <div className="flex items-center gap-3 overflow-hidden rounded-[22px] bg-gradient-to-br from-brand-soft to-white p-4">
          <WalletArt />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-muted">Jami daromad</p>
            <p className="truncate text-2xl font-extrabold">{formatSom(total)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                {growth >= 0 ? '+' : ''}
                {growth}%
              </span>
              <span className="text-[11px] text-muted">Kecha bilan solishtirganda</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Kpi icon={Wallet} color="bg-emerald-50 text-emerald-600" label="Jami daromad" value={formatSom(total)} />
          <Kpi icon={ShoppingBag} color="bg-sky-50 text-sky-600" label="Buyurtmalar soni" value={`${stats?.todayTrips ?? 0} ta`} />
          <Kpi icon={Clock} color="bg-violet-50 text-violet-600" label="Onlayn vaqt" value={onlineLabel(stats)} />
          <Kpi icon={Route} color="bg-orange-50 text-orange-500" label="Bosib o‘tilgan masofa" value={distanceLabel(stats)} />
        </div>

        {(tab === 'all' || tab === 'income') && (
          <>
            <section className="overflow-hidden rounded-2xl bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="min-w-0 font-extrabold">Daromad statistikasi</p>
                <span className="shrink-0 text-xs font-bold text-muted">7 kunlik</span>
              </div>
              <LineChart points={daily} />
            </section>

            <section className="overflow-hidden rounded-2xl bg-white p-4">
              <p className="mb-3 font-extrabold">Daromad manbalari</p>
              <Donut amount={total} sources={stats?.incomeSources || []} />
            </section>
          </>
        )}

        {(tab === 'all' || tab === 'orders') && (
          <section className="overflow-hidden rounded-2xl bg-white p-4">
            <p className="mb-3 font-extrabold">Faoliyat vaqti</p>
            <BarChart values={hourly} />
          </section>
        )}

        {(tab === 'all' || tab === 'routes') && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-extrabold">Eng daromadli buyurtmalar</p>
              <Link to="/driver/orders" className="text-xs font-bold text-brand">
                Barchasini ko‘rish <ChevronRight className="inline h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {top.length === 0 ? (
                <p className="rounded-2xl bg-white p-6 text-center text-sm text-muted">Hali yakunlangan buyurtma yo‘q.</p>
              ) : (
                top.map((o, i) => (
                  <Link
                    key={o.id}
                    to={`/driver/orders/${o.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-sm font-extrabold text-brand">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{o.fromLabel}</p>
                      <p className="truncate text-xs text-muted">{o.toLabel}</p>
                    </div>
                    <p className="shrink-0 text-sm font-extrabold">{formatSom(o.totalPrice)}</p>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function onlineLabel(stats) {
  if (!stats?.online) return 'Oflayn'
  return 'Hozir onlayn'
}

function distanceLabel(stats) {
  const km = stats?.todayDistanceKm
  if (!km) return '0 km'
  return `${km.toLocaleString('uz-UZ')} km`
}

function Kpi({ icon: Icon, color, label, value }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p className="text-sm font-extrabold">{value}</p>
    </div>
  )
}

function LineChart({ points }) {
  const data = points.length ? points : Array.from({ length: 7 }, (_, i) => ({ date: String(i), amount: 0 }))
  const max = Math.max(...data.map((p) => p.amount), 1)
  const w = 320
  const h = 140
  const pad = 18
  const coords = data.map((p, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2)
    const y = h - pad - (p.amount / max) * (h - pad * 2)
    return [x, y]
  })
  const d = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')
  const last = coords[coords.length - 1]

  return (
    <div className="overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full max-w-full" overflow="hidden">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={pad} x2={w - pad} y1={h - pad - t * (h - pad * 2)} y2={h - pad - t * (h - pad * 2)} stroke="#eceef2" />
        ))}
        <path d={d} fill="none" stroke="#00c7d4" strokeWidth="2.5" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="#00c7d4" />
        ))}
        {last ? (
          <g>
            <rect x={Math.min(Math.max(last[0] - 22, 4), w - 48)} y={Math.max(last[1] - 22, 2)} width="44" height="16" rx="8" fill="#00c7d4" />
            <text
              x={Math.min(Math.max(last[0], 26), w - 26)}
              y={Math.max(last[1] - 11, 13)}
              textAnchor="middle"
              fill="#fff"
              fontSize="9"
              fontWeight="700"
            >
              {compact(data[data.length - 1].amount)}
            </text>
          </g>
        ) : null}
        {data.map((p, i) => (
          <text key={p.date} x={coords[i][0]} y={h - 4} textAnchor="middle" fill="#9ca3af" fontSize="8">
            {p.date?.slice(5) || ''}
          </text>
        ))}
      </svg>
    </div>
  )
}

function BarChart({ values }) {
  const max = Math.max(...values, 1)
  const ticks = [0, 4, 8, 12, 16, 20, 23]
  return (
    <div className="overflow-hidden">
      <div className="flex h-28 items-end gap-[3px]">
        {values.map((v, i) => (
          <div key={i} className="min-w-0 flex-1 rounded-t bg-brand/80" style={{ height: `${Math.max(6, (v / max) * 100)}%`, opacity: v ? 1 : 0.25 }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between overflow-hidden text-[9px] font-bold text-muted">
        {ticks.map((h) => (
          <span key={h} className="shrink-0">
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  )
}

const SOURCE_COLORS = ['#00c7d4', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6']

function Donut({ amount, sources }) {
  const sourceTotal = sources.reduce((s, x) => s + x.amount, 0)
  const parts =
    sourceTotal > 0
      ? sources.map((s, i) => ({
          label: s.label,
          value: s.amount,
          color: SOURCE_COLORS[i % SOURCE_COLORS.length],
          pct: (s.amount / sourceTotal) * 100,
        }))
      : [{ label: 'Ma’lumot yo‘q', value: 0, color: '#e5e7eb', pct: 100 }]
  const r = 42
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex min-w-0 items-center gap-3 overflow-hidden">
      <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" overflow="hidden">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="14" />
        {parts.map((p) => {
          const dash = (p.pct / 100) * c
          const el = (
            <circle
              key={p.label}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          )
          offset += dash
          return el
        })}
        <text x="60" y="58" textAnchor="middle" fontSize="10" fontWeight="800">
          {compact(amount)}
        </text>
        <text x="60" y="72" textAnchor="middle" fontSize="8" fill="#6b7280">
          so‘m
        </text>
      </svg>
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        {parts.map((p) => (
          <div key={p.label} className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">{p.label}</span>
            <span className="shrink-0 text-xs font-extrabold">{formatSom(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function compact(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}K`
  return String(n || 0)
}

function WalletArt() {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">👛</div>
  )
}
