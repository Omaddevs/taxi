import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Car, Layers, Mail, Megaphone, Plus, Users } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { SearchInput, FilterPills } from '../components/ui/Filters'
import { Avatar } from '../components/ui/Avatar'
import { StatCard } from '../components/ui/StatCard'
import { EmptyState, SkeletonGrid, SkeletonTable } from '../components/ui/EmptyState'
import { ChannelChips } from '../components/people/ChannelChips'
import { CreatePersonModal, EmailBroadcastModal } from '../components/people/PeopleActions'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { displayName, formatPhoneUz, formatDateTime } from '../lib/utils'
import { ROLE_LABEL, ROLE_TONE } from '../lib/labels'
import type { PeopleListResponse, PersonRow } from '../types'

export default function People() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [debounced, setDebounced] = useState(params.get('q') || '')
  const kind = params.get('kind') || 'all'
  const channel = params.get('channel') || ''
  const { user: actor } = useAuth()
  const isAdmin = actor?.role === 'ADMIN'
  const [creating, setCreating] = useState(false)
  const [emailing, setEmailing] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim())
      const next = new URLSearchParams(params)
      if (q.trim()) next.set('q', q.trim())
      else next.delete('q')
      setParams(next, { replace: true })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-people', debounced, kind, channel],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (debounced) qs.set('q', debounced)
      if (kind && kind !== 'all') qs.set('kind', kind)
      if (channel) qs.set('channel', channel)
      return api.get<PeopleListResponse>(`/admin/people?${qs}`)
    },
  })

  function setFilter(key: 'kind' | 'channel', value: string) {
    const next = new URLSearchParams(params)
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const stats = data?.stats

  return (
    <div>
      <PageHeader
        title="Mijozlar katalogi"
        subtitle="Bot, guruh, web ilova va Google orqali kelgan haydovchi hamda yo‘lovchilar"
        action={
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <Button variant="outline" onClick={() => setEmailing(true)}>
                <Mail className="h-4 w-4" />
                Email yuborish
              </Button>
            ) : null}
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Mijoz qo‘shish
            </Button>
          </div>
        }
      />
      {creating ? <CreatePersonModal onClose={() => setCreating(false)} onCreated={(id) => navigate(`/people/${id}`)} /> : null}
      {emailing ? <EmailBroadcastModal onClose={() => setEmailing(false)} /> : null}

      {stats ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          <StatCard icon={Users} label="Jami" value={String(stats.total)} />
          <StatCard icon={Users} label="Yo‘lovchi" value={String(stats.passengers)} tone="slate" />
          <StatCard icon={Car} label="Haydovchi" value={String(stats.drivers)} />
          <StatCard icon={Layers} label="Web" value={String(stats.webapp)} tone="slate" />
          <StatCard icon={Megaphone} label="Bot" value={String(stats.bot)} tone="amber" />
          <StatCard icon={Users} label="Guruh" value={String(stats.group)} tone="success" />
          <StatCard icon={Mail} label="Google" value={String(stats.google ?? 0)} tone="slate" />
        </div>
      ) : (
        <div className="mb-6">
          <SkeletonGrid count={7} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Ism, telefon, email, Telegram yoki avto raqam"
          className="max-w-xl"
        />
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <FilterPills
            value={kind}
            onChange={(v) => setFilter('kind', v)}
            options={[
              { value: 'all', label: 'Barchasi' },
              { value: 'passenger', label: 'Yo‘lovchilar' },
              { value: 'driver', label: 'Haydovchilar' },
            ]}
          />
          <FilterPills
            value={channel}
            onChange={(v) => setFilter('channel', v)}
            options={[
              { value: '', label: 'Barcha kanallar' },
              { value: 'WEBAPP', label: 'Web ilova' },
              { value: 'BOT', label: 'Bot' },
              { value: 'GROUP', label: 'Guruh' },
              { value: 'GOOGLE', label: 'Google' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : !data?.items.length ? (
        <EmptyState
          icon={Users}
          title="Hech kim topilmadi"
          text="Ism, telefon raqam yoki mashina raqamini boshqacha yozib ko‘ring."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((p) => (
            <PersonCard key={p.id} person={p} onOpen={() => navigate(`/people/${p.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function PersonCard({ person, onOpen }: { person: PersonRow; onOpen: () => void }) {
  const isDriver = Boolean(person.driver) || person.role === 'DRIVER'
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-2xl border border-line bg-white p-4 text-left shadow-[0_8px_30px_rgba(28,28,40,0.04)] transition hover:border-brand/40 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <Avatar name={displayName(person)} src={person.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold text-ink">{displayName(person)}</p>
            <Badge tone={ROLE_TONE[isDriver ? 'DRIVER' : 'PASSENGER']}>
              {ROLE_LABEL[isDriver ? 'DRIVER' : 'PASSENGER']}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm font-medium text-ink">{person.phone ? formatPhoneUz(person.phone) : 'Raqam qo‘shilmagan'}</p>
          {person.email ? <p className="mt-0.5 truncate text-xs text-muted">{person.email}</p> : null}
          {person.driver ? (
            <p className="mt-0.5 truncate text-xs text-muted">
              {person.driver.carModel} · {person.driver.plate}
              {person.driver.approved ? '' : ' · tasdiqlanmagan'}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <ChannelChips person={person} />
        <span className="text-[11px] text-muted">{formatDateTime(person.lastSeenAt || person.createdAt)}</span>
      </div>
    </button>
  )
}
