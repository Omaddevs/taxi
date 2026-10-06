import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { Card } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { ChannelChips } from './ChannelChips'
import { displayName, formatPhoneUz } from '../../lib/utils'
import type { PeopleListResponse } from '../../types'

export function PeopleSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  const { data, isFetching } = useQuery({
    queryKey: ['people-quick', debounced],
    queryFn: () => api.get<PeopleListResponse>(`/admin/people?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
  })

  const items = data?.items.slice(0, 6) ?? []

  return (
    <Card className="mb-6 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-ink">Haydovchi va yo‘lovchilar</h2>
          <p className="text-xs text-muted">Ism, telefon yoki avto raqam orqali qidiring</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(debounced ? `/people?q=${encodeURIComponent(debounced)}` : '/people')}
          className="text-sm font-semibold text-brand-dark hover:underline"
        >
          Katalog →
        </button>
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') navigate(q.trim() ? `/people?q=${encodeURIComponent(q.trim())}` : '/people')
          }}
          placeholder="Masalan: Ali, 90 111 22 33 yoki 01 A 123 AA"
          className="h-12 w-full rounded-2xl border border-line bg-canvas pr-3 pl-10 text-sm outline-none focus:border-brand focus:bg-white"
        />
      </label>
      {debounced.length >= 2 ? (
        <ul className="mt-3 divide-y divide-line">
          {isFetching && !items.length ? (
            <li className="py-3 text-sm text-muted">Qidirilmoqda…</li>
          ) : !items.length ? (
            <li className="py-3 text-sm text-muted">Mos odam topilmadi</li>
          ) : (
            items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/people/${p.id}`)}
                  className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-canvas/80"
                >
                  <Avatar name={p.name || p.phone} src={p.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{displayName(p)}</p>
                    <p className="truncate text-xs text-muted">
                      {formatPhoneUz(p.phone)}
                      {p.driver?.plate ? ` · ${p.driver.plate}` : ''}
                    </p>
                  </div>
                  <ChannelChips person={p} />
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Users className="h-3.5 w-3.5" />
          Bot, guruh va web ilovadan kelgan barcha mijozlar shu yerda
        </p>
      )}
    </Card>
  )
}
