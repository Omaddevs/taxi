import { useQuery } from '@tanstack/react-query'
import { Route, Wallet, CheckCircle2, Car } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { formatSom } from '../lib/utils'
import type { AnalyticsSummary } from '../types'

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get<AnalyticsSummary>('/admin/analytics/summary'),
  })

  return (
    <div>
      <PageHeader title="Bosh sahifa" subtitle="Bugungi ko‘rsatkichlar" />
      {isLoading || !data ? (
        <p className="text-muted">Yuklanmoqda…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Route} label="Bronlar" value={String(data.bookingsCount)} />
          <StatCard icon={CheckCircle2} label="Yakunlangan" value={String(data.completedCount)} tone="success" />
          <StatCard icon={Wallet} label="Daromad" value={formatSom(data.revenue)} tone="amber" />
          <StatCard icon={Car} label="Onlayn haydovchilar" value={String(data.activeDrivers)} />
        </div>
      )}
    </div>
  )
}
