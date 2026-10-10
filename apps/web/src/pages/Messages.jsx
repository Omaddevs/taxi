import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Search, SearchX } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Badge } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { avatarOrFallback } from '../lib/adapters'
import { api } from '../lib/api'
import { useSocket } from '../lib/socket'
import { t } from '../i18n'

function timeLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return t('Kecha')
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
}

function lastPreview(msg) {
  if (!msg) return t('Hali xabar yo‘q')
  if (msg.type === 'LOCATION') return t('📍 Joylashuv')
  return msg.text || t('Hali xabar yo‘q')
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-[0_8px_30px_rgba(28,28,40,0.04)]">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-slate-100" />
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <div className="h-3 w-2/5 animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, image, title, subtitle }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-6 py-14 text-center shadow-[0_8px_30px_rgba(28,28,40,0.04)]">
      {image ? (
        <img src={image} alt="" aria-hidden className="h-32 w-auto max-w-full object-contain" />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <div>
        <p className="font-bold">{t(title)}</p>
        {subtitle ? <p className="mt-1 text-sm text-muted">{t(subtitle)}</p> : null}
      </div>
    </div>
  )
}

export default function Messages() {
  const { pathname } = useLocation()
  const queryClient = useQueryClient()
  const inDriver = pathname.startsWith('/driver')
  const [query, setQuery] = useState('')
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations'),
  })

  useSocket({
    'chat:message': () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    'chat:read': () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => {
      const name = (c.otherParticipant?.name || '').toLowerCase()
      const phone = (c.otherParticipant?.phone || '').toLowerCase()
      return name.includes(q) || phone.includes(q)
    })
  }, [conversations, query])

  return (
    <div className={`mx-auto max-w-2xl ${inDriver ? 'bg-white' : ''}`}>
      {inDriver ? (
        <div className="px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-center text-[17px] font-extrabold">{t('Xabarlar')}</h1>
            {totalUnread > 0 ? <Badge tone="pink">{totalUnread}</Badge> : null}
          </div>
        </div>
      ) : (
        <>
          <ScreenHeader title={t('Xabarlar')} back={false} right={totalUnread > 0 ? <Badge tone="pink">{totalUnread}</Badge> : undefined} />
          <PageTitle
            title={t('Xabarlar')}
            subtitle={t('Haydovchi va yo‘lovchi suhbatlari')}
            right={totalUnread > 0 ? <Badge tone="pink">{t('{0} ta o‘qilmagan', totalUnread)}</Badge> : undefined}
          />
        </>
      )}

      <div className={inDriver ? 'space-y-3 px-4 pb-6 pt-1' : 'space-y-3'}>
        {!isLoading && conversations.length > 0 ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Ism yoki telefon bo‘yicha qidirish')}
              aria-label={t('Suhbatlarni qidirish')}
              className="pl-10"
            />
          </div>
        ) : null}

        {isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : conversations.length === 0 ? (
          <EmptyState
            image="/empty/messages.webp"
            title={t('Hali suhbatlar yo‘q')}
            subtitle={t('Buyurtma bergan yoki qabul qilgan haydovchi bilan yozishmalar shu yerda ko‘rinadi.')}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={SearchX} title={t('Hech narsa topilmadi')} subtitle={t('«{0}» bo‘yicha suhbat topilmadi.', query)} />
        ) : (
          filtered.map((item) => {
            const name = item.otherParticipant?.name || item.otherParticipant?.phone || t('Suhbat')
            return (
              <Link
                key={item.id}
                to={item.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-[0_8px_30px_rgba(28,28,40,0.04)] transition active:scale-[0.99] active:bg-canvas"
              >
                <span className="relative shrink-0">
                  <img
                    src={avatarOrFallback(item.otherParticipant?.avatarUrl, name)}
                    alt=""
                    className="h-12 w-12 rounded-full bg-brand-soft object-cover"
                  />
                  {item.unreadCount ? (
                    <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{t(name)}</p>
                    <span className={`shrink-0 text-[11px] ${item.unreadCount ? 'font-bold text-brand' : 'text-muted'}`}>
                      {timeLabel(item.lastMessageAt)}
                    </span>
                  </div>
                  <p className={`truncate text-sm ${item.unreadCount ? 'font-semibold text-ink' : 'text-muted'}`}>
                    {lastPreview(item.lastMessage)}
                  </p>
                </div>
                {item.unreadCount ? (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                    {item.unreadCount}
                  </span>
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                )}
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
