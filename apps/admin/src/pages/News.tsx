import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Eye, EyeOff, Newspaper, Pencil, Pin, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { FilterPills, SearchInput } from '../components/ui/Filters'
import { EmptyState, SkeletonGrid } from '../components/ui/EmptyState'
import { cn, formatDateTime } from '../lib/utils'
import { CATEGORY_LABEL, SITE_URL, type NewsPost } from '../components/news/newsShared'

export default function News() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['admin-news'], queryFn: () => api.get<NewsPost[]>('/admin/news') })

  const patch = useMutation({
    mutationFn: (input: { id: string; data: Record<string, unknown> }) => api.patch(`/admin/news/${input.id}`, input.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-news'] }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/news/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-news'] }),
  })

  const list = (data ?? []).filter(
    (p) =>
      (filter === 'all' || (filter === 'published' ? p.published : !p.published)) &&
      (!q || p.title.toLowerCase().includes(q.toLowerCase())),
  )
  const publishedCount = data?.filter((p) => p.published).length ?? 0

  return (
    <div>
      <PageHeader
        title="Yangiliklar"
        subtitle={data ? `${data.length} ta yangilik · ${publishedCount} tasi saytda` : undefined}
        action={
          <Button onClick={() => navigate('/news/new')}>
            <Plus className="h-4 w-4" /> Yangi yangilik
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterPills
          options={[
            { value: 'all', label: 'Hammasi' },
            { value: 'published', label: 'Chop etilgan' },
            { value: 'draft', label: 'Qoralama' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Sarlavha bo‘yicha qidirish" className="w-full sm:w-72" />
      </div>

      {isLoading ? (
        <SkeletonGrid count={3} />
      ) : !list.length ? (
        <EmptyState icon={Newspaper} title="Yangiliklar yo‘q" text="«Yangi yangilik» tugmasi orqali birinchi e’loningizni yozing." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <Card key={p.id} className="group flex flex-col overflow-hidden transition hover:shadow-[0_18px_40px_-20px_rgba(15,29,42,0.3)]">
              <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-canvas">
                {p.coverUrl ? (
                  <img src={p.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand to-[#00a3ae] text-white/80">
                    <Newspaper className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute left-3 top-3 flex gap-1.5">
                  {p.published ? <Badge tone="green">Saytda</Badge> : <Badge tone="gray">Qoralama</Badge>}
                  {p.pinned ? (
                    <Badge tone="amber" className="gap-1">
                      <Pin className="h-3 w-3" /> Mahkamlangan
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-semibold text-brand-dark">{CATEGORY_LABEL[p.category]}</p>
                <button type="button" onClick={() => navigate(`/news/${p.id}`)} className="mt-1 line-clamp-2 text-left font-bold text-ink hover:text-brand-dark">
                  {p.title}
                </button>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{p.excerpt}</p>
                <p className="mt-3 text-xs text-muted">
                  {p.publishedAt ? `Chop etilgan: ${formatDateTime(p.publishedAt)}` : `Tahrirlangan: ${formatDateTime(p.updatedAt)}`}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-4">
                  <Button size="sm" variant="soft" onClick={() => navigate(`/news/${p.id}`)}>
                    <Pencil className="h-3.5 w-3.5" /> Tahrirlash
                  </Button>
                  <button
                    type="button"
                    onClick={() => patch.mutate({ id: p.id, data: { published: !p.published } })}
                    title={p.published ? 'Saytdan olish' : 'Chop etish'}
                    className="rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
                  >
                    {p.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => patch.mutate({ id: p.id, data: { pinned: !p.pinned } })}
                    title={p.pinned ? 'Mahkamlashni bekor qilish' : 'Tepada mahkamlash'}
                    className={cn('rounded-lg p-2 transition hover:bg-canvas', p.pinned ? 'text-amber-500' : 'text-muted hover:text-ink')}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  {p.published ? (
                    <a
                      href={`${SITE_URL}/news/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Saytda ko‘rish"
                      className="rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`«${p.title}» o‘chirilsinmi?`)) remove.mutate(p.id)
                    }}
                    title="O‘chirish"
                    className="ml-auto rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  )
}
