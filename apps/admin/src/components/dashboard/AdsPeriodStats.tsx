import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { MONTHS_UZ } from '../../lib/utils'
import { Card } from '../ui/Button'
import { FilterPills } from '../ui/Filters'
import { Legend, SERIES, StackedBars } from '../ui/DashCharts'
import type { AdsTimeline } from '../../types'

type Unit = AdsTimeline['unit']

const UNITS = [
  { value: 'day', label: 'Kunlik' },
  { value: 'week', label: 'Haftalik' },
  { value: 'month', label: 'Oylik' },
]

const META: Record<Unit, { current: string; previous: string; avg: string; span: string }> = {
  day: { current: 'Bugun', previous: 'Kecha', avg: 'Kunlik o‘rtacha', span: 'So‘nggi 30 kun' },
  week: { current: 'Shu hafta', previous: 'O‘tgan hafta', avg: 'Haftalik o‘rtacha', span: 'So‘nggi 12 hafta' },
  month: { current: 'Shu oy', previous: 'O‘tgan oy', avg: 'Oylik o‘rtacha', span: 'So‘nggi 12 oy' },
}

const nf = (n: number) => n.toLocaleString('uz-UZ')
const short = (m: number) => MONTHS_UZ[m - 1]?.slice(0, 3) ?? ''

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

function addDays(iso: string, n: number) {
  const { y, m, d } = parts(iso)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
}

/** [o‘q ostidagi qisqa yozuv, tooltip/jadvaldagi to‘liq nom] */
function bucketLabels(unit: Unit, start: string): [string, string] {
  const { y, m, d } = parts(start)
  if (unit === 'month') {
    const name = MONTHS_UZ[m - 1] ?? ''
    return [short(m), `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`]
  }
  if (unit === 'week') {
    const end = addDays(start, 6)
    const full = m === end.m ? `${d}–${end.d}-${MONTHS_UZ[m - 1]}` : `${d}-${short(m)} – ${end.d}-${short(end.m)}`
    return [`${d}-${short(m)}`, full]
  }
  return [`${d}`, `${d}-${MONTHS_UZ[m - 1]} ${y}`]
}

function delta(now: number, prev: number) {
  if (!prev) return null
  return Math.round(((now - prev) / prev) * 100)
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted">—</span>
  const tone = value > 0 ? 'bg-emerald-50 text-emerald-700' : value < 0 ? 'bg-red-50 text-red-600' : 'bg-canvas text-muted'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${tone}`}>
      {value > 0 ? '▲' : value < 0 ? '▼' : '•'} {Math.abs(value)}%
    </span>
  )
}

export function AdsPeriodStats() {
  const [unit, setUnit] = useState<Unit>('day')
  const { data, isLoading, error } = useQuery({
    queryKey: ['ads-timeline', unit],
    queryFn: () => api.get<AdsTimeline>(`/admin/bot-settings/ads-timeline?unit=${unit}`),
    refetchInterval: 60_000,
  })

  const rows = useMemo(
    () => (data?.buckets ?? []).map((b) => ({ ...b, labels: bucketLabels(unit, b.start) })),
    [data, unit],
  )
  const meta = META[unit]
  const current = rows[rows.length - 1]
  const previous = rows[rows.length - 2]
  // O‘rtacha va eng yuqori — joriy (hali tugamagan) davrsiz, aks holda o‘rtacha pasayib ketadi.
  const closed = rows.slice(0, -1).filter((r, i, arr) => r.ads > 0 || arr.slice(0, i).some((x) => x.ads > 0))
  const avg = closed.length ? Math.round(closed.reduce((s, r) => s + r.ads, 0) / closed.length) : 0
  const best = rows.reduce<(typeof rows)[number] | null>((b, r) => (!b || r.ads > b.ads ? r : b), null)
  const total = rows.reduce((s, r) => s + r.ads, 0)

  return (
    <Card className="mt-4 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink">E’lonlar statistikasi</h3>
          <p className="mt-0.5 text-xs text-muted">
            {meta.span} · jami {nf(total)} ta e’lon
          </p>
        </div>
        <FilterPills options={UNITS} value={unit} onChange={(v) => setUnit(v as Unit)} />
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error instanceof Error ? error.message : 'Statistikani olib bo‘lmadi'}
        </p>
      ) : isLoading || !current ? (
        <div className="h-72 animate-pulse rounded-2xl bg-canvas" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl bg-canvas px-4 py-3">
              <p className="text-xs text-muted">{meta.current}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="text-2xl font-extrabold text-ink">{nf(current.ads)}</p>
                <DeltaBadge value={previous ? delta(current.ads, previous.ads) : null} />
              </div>
              <p className="text-[11px] text-muted">{meta.previous.toLowerCase()}ga nisbatan · davr hali tugamagan</p>
            </div>
            <div className="rounded-2xl bg-canvas px-4 py-3">
              <p className="text-xs text-muted">{meta.previous}</p>
              <p className="mt-0.5 text-2xl font-extrabold text-ink">{nf(previous?.ads ?? 0)}</p>
              <p className="text-[11px] text-muted">
                {nf(previous?.driver ?? 0)} haydovchi · {nf(previous?.passenger ?? 0)} yo‘lovchi
              </p>
            </div>
            <div className="rounded-2xl bg-canvas px-4 py-3">
              <p className="text-xs text-muted">{meta.avg}</p>
              <p className="mt-0.5 text-2xl font-extrabold text-ink">{nf(avg)}</p>
              <p className="text-[11px] text-muted">tugagan davrlar bo‘yicha</p>
            </div>
            <div className="rounded-2xl bg-canvas px-4 py-3">
              <p className="text-xs text-muted">Eng ko‘p</p>
              <p className="mt-0.5 text-2xl font-extrabold text-ink">{nf(best?.ads ?? 0)}</p>
              <p className="truncate text-[11px] text-muted">{best?.ads ? best.labels[1] : '—'}</p>
            </div>
          </div>

          <div className="mt-5 mb-3 flex justify-end">
            <Legend
              items={[
                { label: 'Haydovchi', color: SERIES.driver },
                { label: 'Yo‘lovchi', color: SERIES.passenger },
              ]}
            />
          </div>
          <StackedBars
            height={210}
            series={[
              { key: 'driver', label: 'Haydovchi', color: SERIES.driver },
              { key: 'passenger', label: 'Yo‘lovchi', color: SERIES.passenger },
            ]}
            items={rows.map((r) => ({
              key: r.start,
              label: r.labels[0],
              tip: r.labels[1],
              values: { driver: r.driver, passenger: r.passenger },
            }))}
          />

          <div className="mt-6 max-h-80 overflow-auto rounded-2xl border border-line">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 bg-canvas text-left text-xs font-semibold text-muted">
                <tr>
                  <th className="px-4 py-2.5">Davr</th>
                  <th className="px-3 py-2.5 text-right">Jami</th>
                  <th className="px-3 py-2.5 text-right">Haydovchi</th>
                  <th className="px-3 py-2.5 text-right">Yo‘lovchi</th>
                  <th className="px-3 py-2.5 text-right">Mualliflar</th>
                  <th className="px-3 py-2.5 text-right">Qo‘ng‘iroq</th>
                  <th className="px-4 py-2.5 text-right">O‘zgarish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...rows].reverse().map((r, i, arr) => {
                  const prev = arr[i + 1]
                  return (
                    <tr key={r.start} className={i === 0 ? 'bg-brand-soft/40' : 'hover:bg-canvas/60'}>
                      <td className="px-4 py-2.5 font-semibold text-ink">
                        {r.labels[1]}
                        {i === 0 ? <span className="ml-2 text-[11px] font-medium text-muted">({meta.current.toLowerCase()})</span> : null}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-ink">{nf(r.ads)}</td>
                      <td className="px-3 py-2.5 text-right text-ink">{nf(r.driver)}</td>
                      <td className="px-3 py-2.5 text-right text-ink">{nf(r.passenger)}</td>
                      <td className="px-3 py-2.5 text-right text-muted">{nf(r.authors)}</td>
                      <td className="px-3 py-2.5 text-right text-muted">{nf(r.calls)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <DeltaBadge value={prev ? delta(r.ads, prev.ads) : null} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}
