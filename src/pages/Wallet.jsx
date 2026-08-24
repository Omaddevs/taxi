import { Plus } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { transactions } from '../data/mock'
import { formatSom } from '../lib/utils'
import { useApp } from '../context/AppContext'

export default function Wallet() {
  const { user, setPaymentMethod } = useApp()

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="To‘lovlar" />
      <PageTitle title="To‘lovlar" subtitle="Hisob, kartalar va tranzaksiyalar" />

      <Card className="bg-gradient-to-br from-brand to-brand-dark p-6 text-white">
        <p className="text-sm text-white/80">Joriy balans</p>
        <p className="mt-2 text-3xl font-extrabold">{formatSom(user.balance)}</p>
        <Button variant="dark" className="mt-5 bg-white text-brand hover:bg-pink-50">
          <Plus className="h-4 w-4" /> To‘ldirish
        </Button>
      </Card>

      <p className="mb-2 mt-5 text-sm font-bold">To‘lov usullari</p>
      <div className="no-scrollbar flex gap-3 overflow-x-auto">
        {['Naqd', 'UzCard', 'Humo', 'Click'].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setPaymentMethod(name === 'Naqd' ? 'cash' : name.toLowerCase())}
            className="min-w-[110px] rounded-2xl bg-white px-4 py-4 text-left"
          >
            <p className="text-sm font-bold">{name}</p>
            <p className="text-xs text-muted">Tanlash</p>
          </button>
        ))}
      </div>

      <p className="mb-2 mt-6 text-sm font-bold">So‘nggi tranzaksiyalar</p>
      <Card className="divide-y divide-line">
        {transactions.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-muted">
                {item.route} · {item.date}
              </p>
            </div>
            <p className={`text-sm font-bold ${item.type === 'in' ? 'text-success' : 'text-ink'}`}>
              {item.amount > 0 ? '+' : ''}
              {formatSom(item.amount)}
            </p>
          </div>
        ))}
      </Card>
    </div>
  )
}
