import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  ExternalLink,
  ImagePlus,
  Loader2,
  Pin,
  RefreshCw,
  Send,
  Trash2,
  Type,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { fileToDataUrl, ImageCropModal } from '../components/news/ImageCropModal'
import { RichEditor } from '../components/news/RichEditor'
import { Badge, Button, Card } from '../components/ui/Button'
import { cn, formatDateTime } from '../lib/utils'
import {
  CATEGORY_LABEL,
  parseBlocks,
  SITE_URL,
  slugify,
  type NewsCategory,
  type NewsPost,
} from '../components/news/newsShared'

interface Draft {
  title: string
  slug: string
  excerpt: string
  body: string
  coverUrl: string
  category: NewsCategory
  published: boolean
  pinned: boolean
}

const EMPTY: Draft = { title: '', slug: '', excerpt: '', body: '', coverUrl: '', category: 'NEWS', published: false, pinned: false }
const EXCERPT_MAX = 320

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (t: string) => esc(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')

// Eski (oddiy matnli) yangiliklar muharrirda ochilganda HTML'ga aylantiriladi.
function legacyToHtml(body: string) {
  if (/^\s*</.test(body)) return body
  return parseBlocks(body)
    .map((b) => {
      if (b.type === 'h') return `<h2>${inline(b.text)}</h2>`
      if (b.type === 'ul') return `<ul>${b.items.map((i) => `<li><p>${inline(i)}</p></li>`).join('')}</ul>`
      if (b.type === 'quote') return `<blockquote><p>${inline(b.text)}</p></blockquote>`
      return `<p>${inline(b.text)}</p>`
    })
    .join('')
}

function toDraft(p: NewsPost): Draft {
  return {
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    body: legacyToHtml(p.body),
    coverUrl: p.coverUrl ?? '',
    category: p.category,
    published: p.published,
    pinned: p.pinned,
  }
}

// ── Kichik UI qismlari ────────────────────────────────────────────────────────────────────

function SideCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('p-5', className)}>
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">{title}</p>
      {children}
    </Card>
  )
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-canvas"
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-slate-200')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return ref
}

// ── Sahifa ────────────────────────────────────────────────────────────────────────────────

export default function NewsEditor() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const existing = useQuery({
    queryKey: ['admin-news', id],
    queryFn: () => api.get<NewsPost>(`/admin/news/${id}`),
    enabled: !isNew,
  })

  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saved, setSaved] = useState<Draft>(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [stats, setStats] = useState({ words: 0, chars: 0 })
  const [coverSrc, setCoverSrc] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof Draft | 'form', string>>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [coverBusy, setCoverBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const titleRef = useAutoGrow(draft.title)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (existing.data) {
      const d = toDraft(existing.data)
      setDraft(d)
      setSaved(d)
      setSlugTouched(true)
    }
  }, [existing.data])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  useEffect(() => {
    if (!dirty) return undefined
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value }
      if (key === 'title' && !slugTouched) next.slug = slugify(String(value))
      return next
    })
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }))
  }

  function validate(d: Draft) {
    const e: typeof errors = {}
    if (d.title.trim().length < 3) e.title = 'Sarlavha kamida 3 ta belgi bo‘lsin'
    if (d.excerpt.trim().length < 10) e.excerpt = 'Qisqa tavsif kamida 10 ta belgi bo‘lsin'
    if (stats.chars < 20 && !/<img/.test(d.body)) e.body = 'Matn kamida 20 ta belgi bo‘lsin'
    if (d.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug)) e.slug = 'Faqat kichik lotin harflari, raqam va "-"'
    setErrors(e)
    return !Object.keys(e).length
  }

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const payload = {
        title: d.title.trim(),
        ...(d.slug ? { slug: d.slug } : {}),
        excerpt: d.excerpt.trim(),
        body: d.body.trim(),
        coverUrl: d.coverUrl,
        category: d.category,
        published: d.published,
        pinned: d.pinned,
      }
      return isNew ? api.post<NewsPost>('/admin/news', payload) : api.patch<NewsPost>(`/admin/news/${id}`, payload)
    },
    onSuccess: (post, d) => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] })
      const next = { ...d, slug: post.slug }
      setDraft(next)
      setSaved(next)
      setSlugTouched(true)
      setToast(d.published ? 'Saqlandi va saytda chop etildi' : 'Qoralama saqlandi')
      if (isNew) navigate(`/news/${post.id}`, { replace: true })
    },
    onError: (err) => setErrors({ form: err instanceof ApiError ? err.message : 'Saqlab bo‘lmadi' }),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/news/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] })
      navigate('/news', { replace: true })
    },
  })

  const submit = useCallback(
    (publish?: boolean) => {
      const d = publish === undefined ? draft : { ...draft, published: publish }
      if (!validate(d)) return
      save.mutate(d)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, save],
  )

  // Ctrl/Cmd + S — saqlash
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!save.isPending) submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submit, save.isPending])

  async function onPickFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors((e) => ({ ...e, coverUrl: 'Faqat rasm fayli yuklang' }))
      return
    }
    setCoverBusy(true)
    try {
      setCoverSrc(await fileToDataUrl(file))
    } catch (err) {
      setErrors((e) => ({ ...e, coverUrl: err instanceof Error ? err.message : 'Rasmni o‘qib bo‘lmadi' }))
    } finally {
      setCoverBusy(false)
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    onPickFile(e.dataTransfer.files?.[0])
  }

  if (!isNew && existing.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  if (!isNew && existing.isError) {
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <p className="font-bold text-ink">Yangilik topilmadi</p>
        <Button className="mt-4" onClick={() => navigate('/news')}>
          Ro‘yxatga qaytish
        </Button>
      </Card>
    )
  }

  const words = stats.words
  const minutes = Math.max(1, Math.round(words / 180))
  const excerptLeft = EXCERPT_MAX - draft.excerpt.length
  const status = isNew ? 'Yangi' : saved.published ? 'Saytda' : 'Qoralama'

  return (
    <div>
      {/* Yuqori panel */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 lg:sticky lg:top-0 lg:z-10 lg:-mx-8 lg:-mt-8 lg:border-b lg:border-line lg:bg-white/95 lg:px-8 lg:py-4 lg:backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!dirty || window.confirm('Saqlanmagan o‘zgarishlar bor. Chiqib ketilsinmi?')) navigate('/news')
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-ink transition hover:bg-canvas"
            aria-label="Ortga"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-extrabold text-ink">{isNew ? 'Yangi yangilik' : 'Yangilikni tahrirlash'}</h1>
              <Badge tone={status === 'Saytda' ? 'green' : 'gray'}>{status}</Badge>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              {save.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Saqlanmoqda…
                </>
              ) : dirty ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Saqlanmagan o‘zgarishlar · Ctrl+S
                </>
              ) : existing.data ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" /> Saqlangan · {formatDateTime(existing.data.updatedAt)}
                </>
              ) : (
                'Hali saqlanmagan'
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && saved.published ? (
            <a
              href={`${SITE_URL}/news/${saved.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-ink transition hover:bg-canvas"
            >
              <ExternalLink className="h-4 w-4" /> Saytda ko‘rish
            </a>
          ) : null}
          <Button variant="outline" onClick={() => submit(saved.published && !isNew ? undefined : false)} disabled={save.isPending}>
            {saved.published && !isNew ? 'O‘zgarishlarni saqlash' : 'Qoralama saqlash'}
          </Button>
          {!saved.published || isNew ? (
            <Button onClick={() => submit(true)} disabled={save.isPending}>
              <Send className="h-4 w-4" /> Chop etish
            </Button>
          ) : (
            <Button variant="dark" onClick={() => submit(false)} disabled={save.isPending}>
              Saytdan olish
            </Button>
          )}
        </div>
      </div>

      {errors.form ? (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          <AlertCircle className="h-4 w-4" /> {errors.form}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Chap: muharrir */}
        <div className="min-w-0 space-y-5">
          <Card className="p-6 lg:p-8">
            <textarea
              ref={titleRef}
              value={draft.title}
              onChange={(e) => set('title', e.target.value.replace(/\n/g, ' '))}
              placeholder="Yangilik sarlavhasi"
              rows={1}
              maxLength={160}
              className="w-full resize-none overflow-hidden bg-transparent text-[28px] font-extrabold leading-tight tracking-tight text-ink outline-none placeholder:text-slate-300 lg:text-[34px]"
            />
            {errors.title ? <p className="mt-1 text-sm font-semibold text-red-500">{errors.title}</p> : null}

            <div className="mt-3 flex flex-wrap items-center gap-1 text-sm text-muted">
              <span className="shrink-0">{SITE_URL.replace(/^https?:\/\//, '')}/news/</span>
              <input
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-'))
                }}
                placeholder="avtomatik"
                className="min-w-[120px] flex-1 rounded-lg bg-canvas px-2 py-1 font-medium text-ink outline-none focus:ring-2 focus:ring-brand/40"
                aria-label="Havola"
              />
              {slugTouched && draft.title ? (
                <button
                  type="button"
                  onClick={() => {
                    setSlugTouched(false)
                    set('slug', slugify(draft.title))
                  }}
                  title="Sarlavhadan qayta yasash"
                  className="rounded-lg p-1.5 text-muted transition hover:bg-canvas hover:text-ink"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            {errors.slug ? <p className="mt-1 text-sm font-semibold text-red-500">{errors.slug}</p> : null}

            <div className="mt-6">
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="excerpt" className="text-xs font-bold uppercase tracking-wide text-muted">
                  Qisqa tavsif
                </label>
                <span className={cn('text-xs font-semibold', excerptLeft < 20 ? 'text-amber-600' : 'text-muted')}>{excerptLeft}</span>
              </div>
              <textarea
                id="excerpt"
                value={draft.excerpt}
                onChange={(e) => set('excerpt', e.target.value.slice(0, EXCERPT_MAX))}
                rows={2}
                placeholder="Kartochkada va ijtimoiy tarmoqlarda ko‘rinadigan 1–2 jumla"
                className="w-full resize-none rounded-2xl border border-line bg-canvas/50 px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition focus:border-brand focus:bg-white"
              />
              {errors.excerpt ? <p className="mt-1 text-sm font-semibold text-red-500">{errors.excerpt}</p> : null}
            </div>
          </Card>

          <div>
            <RichEditor value={draft.body} onChange={(html) => set('body', html)} onStats={setStats} invalid={Boolean(errors.body)} />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Type className="h-3.5 w-3.5" /> {words} so‘z
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> ~{minutes} daqiqa o‘qish
                </span>
              </span>
              {errors.body ? (
                <span className="font-semibold text-red-500">{errors.body}</span>
              ) : (
                <span>Rasmni muharrirga sudrab tashlash yoki Ctrl+V bilan qo‘yish mumkin</span>
              )}
            </div>
          </div>
        </div>

        {/* O‘ng: sozlamalar */}
        <div className="space-y-5 xl:sticky xl:top-[92px] xl:self-start">
          <SideCard title="Chop etish">
            <Switch
              checked={draft.published}
              onChange={(v) => set('published', v)}
              label="Saytda ko‘rinsin"
              hint={draft.published ? 'Saqlangach hamma ko‘radi' : 'Qoralama — faqat admin ko‘radi'}
            />
            <Switch checked={draft.pinned} onChange={(v) => set('pinned', v)} label="Tepada mahkamlash" hint="Ro‘yxatning boshida turadi" />
            {existing.data?.publishedAt ? (
              <p className="mt-3 border-t border-line pt-3 text-xs text-muted">Chop etilgan: {formatDateTime(existing.data.publishedAt)}</p>
            ) : null}
          </SideCard>

          <SideCard title="Bo‘lim">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CATEGORY_LABEL) as NewsCategory[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('category', c)}
                  aria-pressed={draft.category === c}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition',
                    draft.category === c ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line text-ink hover:bg-canvas',
                  )}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </SideCard>

          <SideCard title="Muqova rasmi">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
            {draft.coverUrl ? (
              <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl bg-canvas">
                <img src={draft.coverUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/50 opacity-0 transition group-hover:opacity-100">
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" /> Almashtirish
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => set('coverUrl', '')}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  'flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition',
                  dragOver ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand/60 hover:bg-canvas',
                )}
              >
                {coverBusy ? (
                  <Loader2 className="h-6 w-6 animate-spin text-brand-dark" />
                ) : (
                  <>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
                      <ImagePlus className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-ink">Rasmni tashlang yoki tanlang</span>
                    <span className="text-xs text-muted">16:10 · JPG, PNG, WebP</span>
                  </>
                )}
              </button>
            )}
            {errors.coverUrl ? <p className="mt-2 text-xs font-semibold text-red-500">{errors.coverUrl}</p> : null}
            {!draft.coverUrl ? <p className="mt-2 text-xs text-muted">Rasm bo‘lmasa, saytda brend rangidagi fon va taksi ko‘rsatiladi.</p> : null}
          </SideCard>

          <SideCard title="Saytdagi kartochka">
            <div className="overflow-hidden rounded-2xl ring-1 ring-line">
              <div className="relative aspect-[16/10] bg-gradient-to-br from-brand to-[#00a3ae]">
                {draft.coverUrl ? <img src={draft.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                <span className="absolute left-3 top-3 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                  {CATEGORY_LABEL[draft.category]}
                </span>
                {draft.pinned ? (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink">
                    <Pin className="h-3 w-3" />
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <p className="text-[11px] text-muted">Bugun · {minutes} daqiqa</p>
                <p className="mt-1 line-clamp-2 text-[15px] font-extrabold leading-snug text-ink">{draft.title || 'Sarlavha'}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{draft.excerpt || 'Qisqa tavsif shu yerda ko‘rinadi'}</p>
              </div>
            </div>
          </SideCard>

          {!isNew ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Yangilik butunlay o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.')) remove.mutate()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Yangilikni o‘chirish
            </button>
          ) : null}
        </div>
      </div>

      {coverSrc ? (
        <ImageCropModal
          src={coverSrc}
          title="Muqova rasmini kesish"
          lockAspect={16 / 10}
          onDone={(url) => {
            set('coverUrl', url)
            setCoverSrc(null)
          }}
          onCancel={() => setCoverSrc(null)}
        />
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-xl">
          <Check className="h-4 w-4 text-brand" /> {toast}
        </div>
      ) : null}
    </div>
  )
}
