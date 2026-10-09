import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PhoneCall, X } from 'lucide-react'
import { api } from '../../lib/api'
import { cn, formatDateTime } from '../../lib/utils'
import { Badge, Card } from '../ui/Button'
import { FilterPills } from '../ui/Filters'
import { EmptyState, SkeletonTable } from '../ui/EmptyState'
import type { CallReport } from '../../types'

const PERIODS = [
  { value: '1', label: 'Bugun (24 soat)' },
  { value: '7', label: '7 kun' },
  { value: '30', label: '30 kun' },
  { value: '90', label: '90 kun' },
]

function telegramLink(username: string | null, id: string | null) {
  if (username) return `https://t.me/${username}`
  if (id) return `tg://user?id=${id}`
  return null
}

function Person({ name, username, id, fallback }: { name: string | null; username: string | null; id: string | null; fallback: string }) {
  const href = telegramLink(username, id)
  const label = name || (username ? `@${username}` : fallback)
  const sub = username ? `@${username}` : id ? `ID ${id}` : null
  return (
    <span className="min-w-0">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-brand-dark hover:underline">
          {label}
        </a>
      ) : (
        <span className="font-semibold text-ink">{label}</span>
      )}
      {sub && sub !== label ? <span className="ml-1 text-xs text-muted">{sub}</span> : null}
    </span>
  )
}

// Bot sozlamalari → Aloqa: who was called how many times, and by whom.
export function CallsReport() {
  const [days, setDays] = useState('7')
  const [phone, setPhone] = useState<string | null>(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['bot-calls', days, phone],
    queryFn: () => api.get<CallReport>(`/admin/bot-settings/calls?days=${days}${phone ? `&phone=${encodeURIComponent(phone)}` : ''}`),
    refetchInterval: 30_000,
  })
  const totals = data?.totals
  const selected = phone ? data?.summary.find((row) => row.phone === phone) : null

  return (
    <div className="space-y-4">
      {data && !data.loginButtons ? (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <b>Kim qo‘ng‘iroq qilgani hozircha aniqlanmayapti</b> — qo‘ng‘iroqlar sanalmoqda, lekin qo‘ng‘iroqchi “Noma’lum” bo‘lib yoziladi.
          Yoqish uchun: Telegram’da <b>@BotFather</b> → botingiz → <b>/setdomain</b> → <b>taxiline.uz</b>, so‘ng “Funksiyalar” bo‘limida
          “Qo‘ng‘iroq qilganni aniqlash” yoqilganini tekshiring va botni qayta ishga tushiring.
        </Card>
      ) : null}
      <FilterPills value={days} onChange={setDays} options={PERIODS} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Qo‘ng‘iroqlar" value={totals?.calls} />
        <Stat label="Qo‘ng‘iroq qilingan raqamlar" value={totals?.numbers} />
        <Stat label="Qo‘ng‘iroq qilgan odamlar" value={totals?.uniqueCallers} />
        <Stat
          label="Kim qilgani aniq"
          value={totals ? `${totals.calls ? Math.round((totals.identifiedCalls / totals.calls) * 100) : 0}%` : undefined}
        />
      </div>
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error instanceof Error ? error.message : 'Bot xizmatiga ulanib bo‘lmadi'}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-bold text-ink">Kimga necha marta qo‘ng‘iroq qilindi</h2>
          <p className="text-xs text-muted">Qatorni bossangiz, pastda o‘sha raqamga kim qo‘ng‘iroq qilgani chiqadi</p>
        </div>
        {isLoading ? (
          <div className="p-4">
            <SkeletonTable />
          </div>
        ) : !data?.summary.length ? (
          <EmptyState icon={PhoneCall} title="Hozircha qo‘ng‘iroq yo‘q" text="E’lon kartochkalaridagi “📞 Tel qilish” bosilganda shu yerda ko‘rinadi." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-canvas text-left text-xs font-semibold text-muted">
                <tr>
                  <th className="px-4 py-2">Raqam</th>
                  <th className="px-4 py-2">E’lon egasi</th>
                  <th className="px-4 py-2">Guruh</th>
                  <th className="px-4 py-2 text-right">Qo‘ng‘iroqlar</th>
                  <th className="px-4 py-2 text-right">Aniq odamlar</th>
                  <th className="px-4 py-2">Oxirgisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.summary.map((row) => (
                  <tr
                    key={row.phone}
                    onClick={() => setPhone(row.phone === phone ? null : row.phone)}
                    className={cn('cursor-pointer hover:bg-canvas', row.phone === phone && 'bg-brand-soft/60')}
                  >
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap text-ink">{row.phoneDisplay}</td>
                    <td className="px-4 py-2.5">
                      <Person name={row.ownerName} username={row.ownerUsername} id={row.ownerTelegramId} fallback="—" />
                      {row.ownerRole ? (
                        <Badge tone="gray" className="ml-2">
                          {row.ownerRole === 'PASSENGER' ? 'Yo‘lovchi' : 'Haydovchi'}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{row.chatTitle || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-base font-extrabold text-ink">{row.calls}</td>
                    <td className="px-4 py-2.5 text-right text-muted">{row.knownCallers}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted">{formatDateTime(row.lastAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-ink">Qo‘ng‘iroqlar jurnali — kim tomonidan</h2>
            <p className="text-xs text-muted">Oxirgi 300 ta qo‘ng‘iroq</p>
          </div>
          {phone ? (
            <button
              type="button"
              onClick={() => setPhone(null)}
              className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark"
            >
              {selected?.phoneDisplay ?? phone} <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
        {isLoading ? null : !data?.calls.length ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Bu davrda qo‘ng‘iroq yo‘q</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.calls.map((call) => (
              <li key={call.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                <span className="w-32 shrink-0 text-xs text-muted">{formatDateTime(call.createdAt)}</span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <Person name={call.callerName} username={call.callerUsername} id={call.callerTelegramId} fallback="Noma’lum" />
                  {call.callerIsDriver ? <Badge tone="green">Haydovchi</Badge> : null}
                </span>
                <span className="text-muted">→</span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <Person name={call.ownerName} username={call.ownerUsername} id={null} fallback="—" />
                  <span className="font-semibold whitespace-nowrap text-ink">{call.phoneDisplay}</span>
                </span>
                {call.chatTitle ? <span className="ml-auto text-xs text-muted">{call.chatTitle}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink">{value ?? '—'}</p>
    </Card>
  )
}
