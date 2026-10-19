import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Eye,
  ExternalLink,
  Hash,
  ImagePlus,
  Loader2,
  Megaphone,
  Pin,
  RefreshCw,
  Send,
  Trash2,
  Type,
  UserRound,
  X,
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
  tags: string[]
  authorName: string
  authorRole: string
  authorAvatar: string
  coverCaption: string
  bannerTitle: string
  bannerText: string
  bannerLabel: string
  bannerUrl: string
  bannerImage: string
}

const EMPTY: Draft = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  coverUrl: '',
  category: 'NEWS',
  published: false,
  pinned: false,
  tags: [],
  authorName: '',
  authorRole: '',
  authorAvatar: '',
  coverCaption: '',
  bannerTitle: '',
  bannerText: '',
  bannerLabel: '',
  bannerUrl: '',
  bannerImage: '',
}
const EXCERPT_MAX = 320
const TAGS_MAX = 8

// Kesib yuklanadigan rasmlar: muqova, muallif surati va yon banner rasmi.
type ImageField = 'coverUrl' | 'authorAvatar' | 'bannerImage'
const IMAGE_FIELDS: Record<ImageField, { title: string; aspect: number }> = {
  coverUrl: { title: 'Muqova rasmini kesish', aspect: 16 / 10 },
  authorAvatar: { title: 'Muallif suratini kesish', aspect: 1 },
  bannerImage: { title: 'Banner rasmini kesish', aspect: 4 / 3 },
}

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
    tags: p.tags ?? [],
    authorName: p.authorName ?? '',
    authorRole: p.authorRole ?? '',
    authorAvatar: p.authorAvatar ?? '',
    coverCaption: p.coverCaption ?? '',
    bannerTitle: p.bannerTitle ?? '',
    bannerText: p.bannerText ?? '',
    bannerLabel: p.bannerLabel ?? '',
    bannerUrl: p.bannerUrl ?? '',
    bannerImage: p.bannerImage ?? '',
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

const inputCls =
  'w-full rounded-xl border border-line bg-canvas/50 px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white'

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  )
}

function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [text, setText] = useState('')
  const full = value.length >= TAGS_MAX

  function commit(raw: string) {
    const parts = raw
      .split(',')
      .map((t) => t.replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, 32))
      .filter((t) => t.length >= 2)
    setText('')
    if (!parts.length) return
    const next = [...value]
    for (const tag of parts) {
      if (next.length >= TAGS_MAX) break
      if (!next.some((t) => t.toLowerCase() === tag.toLowerCase())) next.push(tag)
    }
    onChange(next)
  }

  return (
    <div>
      <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-line bg-canvas/50 p-1.5 transition focus-within:border-brand focus-within:bg-white">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-brand-soft py-1 pl-2.5 pr-1 text-xs font-semibold text-brand-dark">
            #{tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="rounded p-0.5 transition hover:bg-white/70"
              aria-label={`${tag} tegini o‘chirish`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {!full ? (
          <input
            value={text}
            onChange={(e) => {
              const v = e.target.value
              if (v.includes(',')) commit(v)
              else setText(v)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit(text)
              } else if (e.key === 'Backspace' && !text && value.length) {
                onChange(value.slice(0, -1))
              }
            }}
            onBlur={() => commit(text)}
            placeholder={value.length ? 'Yana teg…' : 'Masalan: Toshkent, Aksiya'}
            className="min-w-[110px] flex-1 bg-transparent px-1.5 py-1 text-sm text-ink outline-none placeholder:text-slate-400"
            aria-label="Teg qo‘shish"
          />
        ) : null}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        Enter yoki vergul bilan qo‘shing · {value.length}/{TAGS_MAX}
      </p>
    </div>
  )
}

function ImagePickButton({
  url,
  busy,
  onPick,
  onClear,
  shape,
  label,
}: {
  url: string
  busy: boolean
  onPick: () => void
  onClear: () => void
  shape: 'round' | 'wide'
  label: string
}) {
  const box = shape === 'round' ? 'h-14 w-14 rounded-full' : 'aspect-[4/3] w-24 rounded-xl'
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onPick}
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-line bg-canvas text-muted transition hover:border-brand/60 hover:text-brand-dark',
          url && 'border-solid border-transparent',
          box,
        )}
        aria-label={label}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5" />}
      </button>
      <div className="flex flex-col items-start gap-0.5">
        <button type="button" onClick={onPick} className="text-sm font-semibold text-ink hover:text-brand-dark">
          {url ? 'Almashtirish' : label}
        </button>
        {url ? (
          <button type="button" onClick={onClear} className="text-xs font-semibold text-red-500 hover:text-red-600">
            Olib tashlash
          </button>
        ) : (
          <span className="text-[11px] text-muted">JPG, PNG, WebP</span>
        )}
      </div>
    </div>
  )
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
  const [crop, setCrop] = useState<{ src: string; field: ImageField } | null>(null)
  const [pickField, setPickField] = useState<ImageField>('coverUrl')
  const [errors, setErrors] = useState<Partial<Record<keyof Draft | 'form', string>>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [busyField, setBusyField] = useState<ImageField | null>(null)
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
    const link = d.bannerUrl.trim()
    if (link && !/^https?:\/\//.test(link) && !/^\/(?!\/)/.test(link)) e.bannerUrl = 'Havola https:// yoki / bilan boshlansin'
    if (link && !d.bannerTitle.trim()) e.bannerTitle = 'Banner sarlavhasini yozing'
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
        tags: d.tags,
        authorName: d.authorName.trim(),
        authorRole: d.authorRole.trim(),
        authorAvatar: d.authorAvatar,
        coverCaption: d.coverCaption.trim(),
        bannerTitle: d.bannerTitle.trim(),
        bannerText: d.bannerText.trim(),
        bannerLabel: d.bannerLabel.trim(),
        bannerUrl: d.bannerUrl.trim(),
        bannerImage: d.bannerImage,
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

  async function onPickFile(file: File | undefined, field: ImageField = pickField) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors((e) => ({ ...e, [field]: 'Faqat rasm fayli yuklang' }))
      return
    }
    setBusyField(field)
    try {
      setCrop({ src: await fileToDataUrl(file), field })
    } catch (err) {
      setErrors((e) => ({ ...e, [field]: err instanceof Error ? err.message : 'Rasmni o‘qib bo‘lmadi' }))
    } finally {
      setBusyField(null)
    }
  }

  function pickImage(field: ImageField) {
    setPickField(field)
    if (fileRef.current) {
      fileRef.current.value = ''
      fileRef.current.click()
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    onPickFile(e.dataTransfer.files?.[0], 'coverUrl')
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
              <p className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
                <span>Chop etilgan: {formatDateTime(existing.data.publishedAt)}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-ink" title="Ko‘rishlar">
                  <Eye className="h-3.5 w-3.5" /> {existing.data.views ?? 0}
                </span>
              </p>
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
                  <Button size="sm" variant="outline" onClick={() => pickImage('coverUrl')}>
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
                onClick={() => pickImage('coverUrl')}
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
                {busyField === 'coverUrl' ? (
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
            <div className="mt-3">
              <Field label="Rasm izohi" hint="Muqova ostida kichik yozuv bo‘lib chiqadi">
                <input
                  value={draft.coverCaption}
                  onChange={(e) => set('coverCaption', e.target.value.slice(0, 160))}
                  placeholder="Foto: TaxiLine matbuot xizmati"
                  className={inputCls}
                />
              </Field>
            </div>
          </SideCard>

          <SideCard title="Teglar">
            <TagInput value={draft.tags} onChange={(v) => set('tags', v)} />
          </SideCard>

          <SideCard title="Muallif">
            <ImagePickButton
              url={draft.authorAvatar}
              busy={busyField === 'authorAvatar'}
              onPick={() => pickImage('authorAvatar')}
              onClear={() => set('authorAvatar', '')}
              shape="round"
              label="Surat yuklash"
            />
            {errors.authorAvatar ? <p className="mt-2 text-xs font-semibold text-red-500">{errors.authorAvatar}</p> : null}
            <div className="mt-4 space-y-3">
              <Field label="Ismi">
                <input
                  value={draft.authorName}
                  onChange={(e) => set('authorName', e.target.value.slice(0, 60))}
                  placeholder="TaxiLine tahririyati"
                  className={inputCls}
                />
              </Field>
              <Field label="Lavozimi">
                <input
                  value={draft.authorRole}
                  onChange={(e) => set('authorRole', e.target.value.slice(0, 60))}
                  placeholder="Masalan: Matbuot kotibi"
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted">
              <UserRound className="mt-px h-3.5 w-3.5 shrink-0" /> Bo‘sh qolsa, «TaxiLine tahririyati» deb ko‘rsatiladi.
            </p>
          </SideCard>

          <SideCard title="Yon banner">
            <p className="-mt-1 mb-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
              <Megaphone className="mt-px h-3.5 w-3.5 shrink-0" /> Maqolaning o‘ng ustunida chiqadi. Bo‘sh qolsa, standart «TaxiLine bilan yo‘lga chiqing» banneri ko‘rsatiladi.
            </p>
            <div className="space-y-3">
              <ImagePickButton
                url={draft.bannerImage}
                busy={busyField === 'bannerImage'}
                onPick={() => pickImage('bannerImage')}
                onClear={() => set('bannerImage', '')}
                shape="wide"
                label="Fon rasmi"
              />
              {errors.bannerImage ? <p className="text-xs font-semibold text-red-500">{errors.bannerImage}</p> : null}
              <Field label="Sarlavha">
                <input
                  value={draft.bannerTitle}
                  onChange={(e) => set('bannerTitle', e.target.value.slice(0, 80))}
                  placeholder="Shaharlararo safarga joy band qiling"
                  className={inputCls}
                />
              </Field>
              {errors.bannerTitle ? <p className="text-xs font-semibold text-red-500">{errors.bannerTitle}</p> : null}
              <Field label="Matn">
                <textarea
                  value={draft.bannerText}
                  onChange={(e) => set('bannerText', e.target.value.slice(0, 200))}
                  rows={2}
                  placeholder="Qisqa taklif matni"
                  className={cn(inputCls, 'resize-none')}
                />
              </Field>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
                <Field label="Tugma">
                  <input
                    value={draft.bannerLabel}
                    onChange={(e) => set('bannerLabel', e.target.value.slice(0, 30))}
                    placeholder="Batafsil"
                    className={inputCls}
                  />
                </Field>
                <Field label="Havola">
                  <input
                    value={draft.bannerUrl}
                    onChange={(e) => set('bannerUrl', e.target.value.slice(0, 500))}
                    placeholder="/register yoki https://"
                    className={inputCls}
                  />
                </Field>
              </div>
              {errors.bannerUrl ? <p className="text-xs font-semibold text-red-500">{errors.bannerUrl}</p> : null}
            </div>
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
                {draft.tags.length ? (
                  <p className="mt-2 flex flex-wrap gap-1">
                    {draft.tags.slice(0, 3).map((t) => (
                      <span key={t} className="inline-flex items-center rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                        <Hash className="h-2.5 w-2.5" />
                        {t}
                      </span>
                    ))}
                  </p>
                ) : null}
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

      {crop ? (
        <ImageCropModal
          src={crop.src}
          title={IMAGE_FIELDS[crop.field].title}
          lockAspect={IMAGE_FIELDS[crop.field].aspect}
          onDone={(url) => {
            set(crop.field, url)
            setCrop(null)
          }}
          onCancel={() => setCrop(null)}
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
