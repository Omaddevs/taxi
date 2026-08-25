import { useState } from 'react'
import { ChevronDown, Headset, Search } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { faqs } from '../data/mock'

export default function Help() {
  const [open, setOpen] = useState(0)
  const [q, setQ] = useState('')
  const list = faqs.filter((f) => f.q.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="Yordam" />
      <PageTitle title="Yordam markazi" subtitle="Tezkor savollar va qo‘llab-quvvatlash" />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Savol qidiring..." className="pl-10" />
      </div>

      <p className="mb-2 text-sm font-bold">Tezkor savollar</p>
      <div className="space-y-2">
        {list.map((item, i) => (
          <Card key={item.q} className="overflow-hidden">
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold">
              {item.q}
              <ChevronDown className={`h-4 w-4 transition ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i ? <p className="px-4 pb-4 text-sm text-muted">{item.a}</p> : null}
          </Card>
        ))}
      </div>

      <a href="tel:+998877353636">
        <Button size="lg" className="mt-5 w-full">
          <Headset className="h-4 w-4" /> Biz bilan bog‘lanish
        </Button>
      </a>
    </div>
  )
}
