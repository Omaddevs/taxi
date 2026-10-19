import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ShieldCheck, Unlock } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import { Badge, Button, Card } from '../ui/Button'
import { FilterPills } from '../ui/Filters'
import { EmptyState, SkeletonTable } from '../ui/EmptyState'

interface RepeatGuardReportData {
  totals: { posts: number; cooldown: number; duplicate: number; mutes: number }
  offenders: {
    chatId: number
    chatTitle: string | null
    telegramId: number
    name: string | null
    strikes: number
    mutes: number
    lastAt: string | null
    mutedUntil: string | null
  }[]
}

const PERIODS = [
  { value: '1', label: 'Bugun (24 soat)' },
  { value: '7', label: '7 kun' },
  { value: '14', label: '14 kun' },
]

function Stat({ label, value, hint }: { label: string; value: number | undefined; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink">{value ?? '—'}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted">{hint}</p> : null}
    </Card>
  )
}

// Bot sozlamalari → Takroriy e'lonlar: what the guard deleted, who breaks the rule, who is muted.
export function RepeatGuardReport() {
  const qc = useQueryClient()
  const [days, setDays] = useState('1')
  const { data, isLoading, error } = useQuery({
    queryKey: ['repeat-guard', days],
    queryFn: () => api.get<RepeatGuardReportData>(`/admin/bot-settings/repeat-guard?days=${days}`),
    refetchInterval: 30_000,
  })
  const unmute = useMutation({
    mutationFn: (row: { chatId: number; telegramId: number }) => api.post('/admin/bot-settings/repeat-guard/unmute', row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repeat-guard'] }),
  })
  const totals = data?.totals

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-ink">Natijalar</h2>
        <FilterPills value={days} onChange={setDays} options={PERIODS} />
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 bg-brand-soft/50 p-4 text-sm text-ink">
        <span>
          Qoidalar har bir guruhda alohida yoqiladi: <b>Guruhlar</b> → guruh kartochkasi → <b>Guruh xizmatlari</b> →
          «Takroriy e’lon», «Bir xil e’lon», «Vaqtincha cheklash».
        </span>
        <Link to="/groups" className="inline-flex items-center gap-1 font-semibold text-brand-dark hover:underline">
          Guruhlarga o‘tish <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Qabul qilingan e’lonlar" value={totals?.posts} />
        <Stat label="Kutish vaqti buzildi" value={totals?.cooldown} hint="o‘chirildi" />
        <Stat label="Bir xil e’lon" value={totals?.duplicate} hint="o‘chirildi" />
        <Stat label="Vaqtincha cheklandi" value={totals?.mutes} />
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error instanceof Error ? error.message : 'Bot xizmatiga ulanib bo‘lmadi'}
        </p>
      ) : null}
      {unmute.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {unmute.error instanceof Error ? unmute.error.message : 'Cheklovni olib bo‘lmadi'}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <p className="font-bold text-ink">Qoidabuzarlar</p>
          <p className="text-xs text-muted">E’loni o‘chirilgan yoki cheklangan foydalanuvchilar, eng ko‘p buzganlar tepada</p>
        </div>
        {isLoading ? (
          <SkeletonTable />
        ) : !data?.offenders.length ? (
          <EmptyState icon={ShieldCheck} title="Qoidabuzarlar yo‘q" text="Bu davrda hech kimning e’loni o‘chirilmadi." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-canvas text-left text-xs font-semibold text-muted">
                <tr>
                  <th className="px-4 py-2.5">Foydalanuvchi</th>
                  <th className="px-4 py-2.5">Guruh</th>
                  <th className="px-4 py-2.5 text-center">O‘chirilgan</th>
                  <th className="px-4 py-2.5 text-center">Jazolar</th>
                  <th className="px-4 py-2.5">Oxirgi marta</th>
                  <th className="px-4 py-2.5">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.offenders.map((row) => (
                  <tr key={`${row.chatId}:${row.telegramId}`}>
                    <td className="px-4 py-3">
                      <a href={`tg://user?id=${row.telegramId}`} className="font-semibold text-brand-dark hover:underline">
                        {row.name || 'Noma’lum'}
                      </a>
                      <span className="ml-1 text-xs text-muted">ID {row.telegramId}</span>
                    </td>
                    <td className="px-4 py-3 text-ink">{row.chatTitle || row.chatId}</td>
                    <td className="px-4 py-3 text-center font-bold text-ink">{row.strikes}</td>
                    <td className="px-4 py-3 text-center text-ink">{row.mutes || '—'}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(row.lastAt)}</td>
                    <td className="px-4 py-3">
                      {row.mutedUntil ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="red">{formatDateTime(row.mutedUntil)} gacha cheklangan</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={unmute.isPending}
                            onClick={() => unmute.mutate({ chatId: row.chatId, telegramId: row.telegramId })}
                          >
                            <Unlock className="h-3.5 w-3.5" /> Cheklovni olish
                          </Button>
                        </div>
                      ) : (
                        <Badge tone="gray">Yoza oladi</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
