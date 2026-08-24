import { Link } from 'react-router-dom'
import { Headset } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { conversations } from '../data/mock'

export default function Messages() {
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="Xabarlar" back={false} />
      <PageTitle title="Xabarlar" subtitle="Haydovchilar va yordam xizmati" />

      <div className="overflow-hidden rounded-2xl bg-white">
        {conversations.map((item) => (
          <Link key={item.id} to={`/messages/${item.id}`} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
            {item.avatar ? (
              <img src={item.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Headset className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold">{item.name}</p>
                <span className="text-[11px] text-muted">{item.time}</span>
              </div>
              <p className="truncate text-sm text-muted">{item.last}</p>
            </div>
            {item.unread ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {item.unread}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  )
}
