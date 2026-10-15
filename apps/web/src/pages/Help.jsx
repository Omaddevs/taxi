import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CarFront, ChevronDown, ChevronRight, Folder, Headset, List, MessageCircle, Phone, Search } from 'lucide-react'
import { AccountScreen } from '../components/account/AccountKit'
import { Button, Card } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { faqs } from '../data/mock'
import { api } from '../lib/api'
import { dayMonth, formatSom } from '../lib/utils'
import { DriverHeader } from './driver/ui'
import { t } from '../i18n'

const SUPPORT_PHONE = '+998877353636'

export default function Help() {
  return useLocation().pathname.startsWith('/driver') ? <DriverHelp /> : <PassengerHelp />
}

// Website requests without a district arrive as "-".
const place = (region, district) => [region, district && district !== '-' ? district : null].filter(Boolean).join(', ')

function whenLabel(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${dayMonth(d.getDate(), d.getMonth(), { dash: true, lower: true })}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Menu → Yordam (passenger): the latest ride to ask about, all rides, the chats, a call, then FAQ.
function PassengerHelp() {
  const [open, setOpen] = useState(null)
  const { data: orders = [] } = useQuery({
    queryKey: ['bot-orders', 'mine'],
    queryFn: () => api.get('/bot-orders/mine').then((res) => res.orders),
  })
  const { data: conversations = [] } = useQuery({ queryKey: ['conversations'], queryFn: () => api.get('/conversations') })
  const unread = conversations.some((c) => c.unreadCount > 0)
  const last = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]

  return (
    <AccountScreen title="Sizga qanday yordam kerak?" large>
      <p className="mb-2 px-1 text-[14px] text-muted">{t('Safarlar va buyurtmalar')}</p>
      <div className="space-y-2.5">
        {last ? (
          <Link to={`/order/${last.id}`} className="flex items-center gap-3.5 rounded-[22px] bg-canvas p-3.5 transition active:scale-[0.99]">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
              <CarFront className="h-7 w-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold text-ink">
                {place(last.toRegion, last.toDistrict) || t('Safar')} · {whenLabel(last.departAt || last.createdAt)}
              </span>
              <span className="block truncate text-[14px] text-muted">
                {[last.price ? formatSom(last.price) : null, place(last.fromRegion, last.fromDistrict)].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink">
              <MessageCircle className="h-5 w-5" />
            </span>
          </Link>
        ) : null}
        <HelpRow icon={List} label="Barcha safarlar va buyurtmalar" to="/history" />
      </div>

      <p className="mb-2 mt-6 px-1 text-[14px] text-muted">{t('Boshqa')}</p>
      <div className="space-y-2.5">
        <HelpRow icon={Folder} label="Barcha chatlar" to="/messages" dot={unread} />
        <HelpRow icon={Phone} label="Qo‘llab-quvvatlashga qo‘ng‘iroq" href={`tel:${SUPPORT_PHONE}`} />
      </div>

      <p className="mb-2 mt-6 px-1 text-[14px] text-muted">{t('Ko‘p beriladigan savollar')}</p>
      <div className="overflow-hidden rounded-[22px] bg-canvas">
        {faqs.map((item) => (
          <div key={item.q} className="border-b border-line/80 last:border-b-0">
            <button
              type="button"
              aria-expanded={open === item.q}
              onClick={() => setOpen(open === item.q ? null : item.q)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left text-[16px] text-ink"
            >
              <span className="flex-1">{t(item.q)}</span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-muted transition ${open === item.q ? 'rotate-180' : ''}`} />
            </button>
            {open === item.q ? <p className="px-4 pb-4 text-[15px] leading-6 text-muted">{t(item.a)}</p> : null}
          </div>
        ))}
      </div>
    </AccountScreen>
  )
}

function HelpRow({ icon: Icon, label, to, href, dot = false }) {
  const body = (
    <>
      <Icon className="h-6 w-6 shrink-0 text-ink" strokeWidth={2} />
      <span className="flex min-w-0 flex-1 items-center gap-2 text-[16px] font-medium text-ink">
        <span className="truncate">{t(label)}</span>
        {dot ? <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label={t('O‘qilmagan xabar bor')} /> : null}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink/70" />
    </>
  )
  const cls = 'flex items-center gap-4 rounded-[22px] bg-canvas px-4 py-[18px] transition active:scale-[0.99]'
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <a href={href} className={cls}>
      {body}
    </a>
  )
}

// Driver panel → Yordam: unchanged.
function DriverHelp() {
  const [open, setOpen] = useState(faqs[0]?.q ?? null)
  const [q, setQ] = useState('')
  const list = faqs.filter((f) => f.q.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="overflow-x-clip bg-canvas">
      <DriverHeader title={t('Yordam')} />

      <div className="px-5 pb-6 pt-3">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Savol qidiring...')} className="pl-10" />
        </div>

        <p className="mb-2 text-sm font-bold">{t('Tezkor savollar')}</p>
        <div className="space-y-2">
          {list.map((item) => (
            <Card key={item.q} className="overflow-hidden">
              <button type="button" onClick={() => setOpen(open === item.q ? null : item.q)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold">
                {t(item.q)}
                <ChevronDown className={`h-4 w-4 transition ${open === item.q ? 'rotate-180' : ''}`} />
              </button>
              {open === item.q ? <p className="px-4 pb-4 text-sm text-muted">{t(item.a)}</p> : null}
            </Card>
          ))}
        </div>

        <a href={`tel:${SUPPORT_PHONE}`}>
          <Button size="lg" className="mt-5 w-full">
            <Headset className="h-4 w-4" /> {t('Biz bilan bog‘lanish')}
          </Button>
        </a>
      </div>
    </div>
  )
}
