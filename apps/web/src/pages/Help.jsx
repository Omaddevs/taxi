import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, Headset, Search } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { faqs } from '../data/mock'
import { DriverHeader } from './driver/ui'
import { t } from '../i18n'

export default function Help() {
  const inDriver = useLocation().pathname.startsWith('/driver')
  const [open, setOpen] = useState(faqs[0]?.q ?? null)
  const [q, setQ] = useState('')
  const list = faqs.filter((f) => f.q.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className={inDriver ? 'overflow-x-clip bg-canvas' : 'mx-auto max-w-2xl'}>
      {inDriver ? <DriverHeader title={t('Yordam')} /> : <ScreenHeader title={t('Yordam')} />}
      {inDriver ? null : <PageTitle title={t('Yordam markazi')} subtitle={t('Tezkor savollar va qo‘llab-quvvatlash')} />}

      <div className={inDriver ? 'px-5 pb-6 pt-3' : ''}>
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

        <a href="tel:+998877353636">
          <Button size="lg" className="mt-5 w-full">
            <Headset className="h-4 w-4" /> {t('Biz bilan bog‘lanish')}
          </Button>
        </a>
      </div>
    </div>
  )
}
