import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileSpreadsheet } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Button, Card } from '../components/ui/Button'
import { FilterPills } from '../components/ui/Filters'
import { Spreadsheet } from '../components/ui/Spreadsheet'
import { SkeletonTable } from '../components/ui/EmptyState'
import { formatDateTime } from '../lib/utils'
import type { ReportPreview } from '../types'

const PERIODS = [
  { value: 'day', label: 'Kunlik' },
  { value: 'week', label: 'Haftalik' },
  { value: 'month', label: 'Oylik' },
]

export default function Reports() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [sheet, setSheet] = useState(0)
  const [downloading, setDownloading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-report', period],
    queryFn: () => api.get<ReportPreview>(`/admin/reports?period=${period}`),
  })

  const active = data?.sheets[sheet] ?? data?.sheets[0]

  async function download() {
    setDownloading(true)
    try {
      await api.download(`/admin/reports/xlsx?period=${period}`, `taxiline-${period}.xls`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Hisobotlar"
        subtitle="Kunlik, haftalik va oylik Excel ko‘rinishi va yuklab olish"
        action={
          <Button onClick={download} disabled={downloading}>
            <Download className="h-4 w-4" />
            {downloading ? 'Tayyorlanmoqda…' : 'Excel yuklab olish'}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterPills options={PERIODS} value={period} onChange={(v) => { setPeriod(v as typeof period); setSheet(0) }} />
        {data ? (
          <p className="text-xs text-muted">
            {formatDateTime(data.range.from)} — {formatDateTime(data.range.to)}
          </p>
        ) : null}
      </div>

      {isLoading || !data ? (
        <SkeletonTable />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1">
            {data.sheets.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSheet(i)}
                className={
                  (active?.name === s.name)
                    ? 'rounded-t-lg bg-white px-3 py-2 text-sm font-bold text-brand ring-1 ring-line'
                    : 'rounded-t-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink'
                }
              >
                {s.name}
              </button>
            ))}
          </div>
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-2 text-xs font-semibold text-muted">
              <FileSpreadsheet className="h-4 w-4" />
              Excel varaq · {active?.name} · {active?.rows.length ?? 0} qator
            </div>
            {active ? <Spreadsheet columns={active.columns} rows={active.rows} /> : null}
          </Card>
        </>
      )}
    </div>
  )
}
