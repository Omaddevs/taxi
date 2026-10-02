import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Button'
import { Table, type Column } from '../components/ui/Table'
import { FilterPills } from '../components/ui/Filters'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { displayName, formatDateTime } from '../lib/utils'
import { RATING_DIR_LABEL } from '../lib/labels'
import type { RatingDirection, RatingRow } from '../types'

export default function Ratings() {
  const [direction, setDirection] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ratings', direction],
    queryFn: () => api.get<RatingRow[]>(`/admin/ratings${direction ? `?direction=${direction}` : ''}`),
  })

  const columns: Column<RatingRow>[] = [
    {
      header: 'Baho',
      cell: (r) => (
        <span className="inline-flex items-center gap-1 font-bold text-amber-600">
          <Star className="h-3.5 w-3.5 fill-current" />
          {r.stars}
        </span>
      ),
    },
    { header: 'Kimdan', cell: (r) => displayName(r.rater) },
    { header: 'Kimga', cell: (r) => displayName(r.ratee) },
    {
      header: 'Yo‘nalish',
      cell: (r) => <Badge tone="gray">{RATING_DIR_LABEL[r.direction]}</Badge>,
    },
    { header: 'Izoh', cell: (r) => r.comment || r.tags.join(', ') || '—' },
    { header: 'Sana', cell: (r) => formatDateTime(r.createdAt) },
  ]

  return (
    <div>
      <PageHeader title="Reytinglar" subtitle={data ? `${data.length} ta baho` : undefined} />
      <div className="mb-4">
        <FilterPills
          value={direction}
          onChange={setDirection}
          options={[
            { value: '', label: 'Barchasi' },
            ...(Object.keys(RATING_DIR_LABEL) as RatingDirection[]).map((k) => ({
              value: k,
              label: RATING_DIR_LABEL[k],
            })),
          ]}
        />
      </div>
      {isLoading ? (
        <SkeletonTable />
      ) : !data?.length ? (
        <EmptyState icon={Star} title="Baholar yo‘q" text="Yakunlangan safarlardan keyin baholar shu yerda ko‘rinadi." />
      ) : (
        <Table columns={columns} rows={data} />
      )}
    </div>
  )
}
