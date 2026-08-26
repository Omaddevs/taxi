import { Link } from 'react-router-dom'
import { Headset } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { api } from '../lib/api'

function timeLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
}

export default function Messages() {
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations'),
  })

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="Xabarlar" back={false} />
      <PageTitle title="Xabarlar" subtitle="Haydovchilar va yordam xizmati" />

      {conversations.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Hali suhbatlar yo‘q.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white">
          {conversations.map((item) => (
            <Link key={item.id} to={`/messages/${item.id}`} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
              {item.otherParticipant?.avatarUrl ? (
                <img src={item.otherParticipant.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Headset className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold">{item.otherParticipant?.name || item.otherParticipant?.phone}</p>
                  <span className="text-[11px] text-muted">{timeLabel(item.lastMessageAt)}</span>
                </div>
                <p className="truncate text-sm text-muted">{item.lastMessage?.text || 'Hali xabar yo‘q'}</p>
              </div>
              {item.unreadCount ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {item.unreadCount}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
