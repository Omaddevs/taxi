import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Dices,
  Gift,
  Link2Off,
  Minus,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Trash2,
  Trophy,
  Users,
  UserX,
  X,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, Button, Card } from '../components/ui/Button'
import { StatCard } from '../components/ui/StatCard'
import { Modal } from '../components/ui/Modal'
import { Field, inputClass } from '../components/ui/Chart'
import { FilterPills, SearchInput } from '../components/ui/Filters'
import { EmptyState, SkeletonTable } from '../components/ui/EmptyState'
import { Pagination } from '../components/ui/Pagination'
import { cn, formatDateTime, formatPhoneUz } from '../lib/utils'

// ── Types ───────────────────────────────────────────────────────────────────────────────────

type Prize = 'GOING' | 'RETURN'

interface GiveawaySettings {
  title: string
  prizeText: string | null
  channelChatId: string | null
  channelUrl: string | null
  groupChatId: string | null
  groupUrl: string | null
  entriesOpen: boolean
}

interface Overview {
  settings: GiveawaySettings
  requires: { channel: boolean; group: boolean }
  stats: { total: number; linked: number; unlinked: number; eligible: number; notSubscribed: number; winners: number; draws: number }
}

interface Entry {
  id: string
  firstName: string
  lastName: string
  phone: string
  telegramId: string | null
  telegramUsername: string | null
  linked: boolean
  channelMember: boolean | null
  groupMember: boolean | null
  eligible: boolean
  checkedAt: string | null
  checkError: string | null
  createdAt: string
  wins: number
}

interface Winner {
  id: string
  prize: Prize
  paidAt: string | null
  entry: Entry
}

interface Draw {
  id: string
  prize: Prize
  count: number
  poolSize: number
  createdByName: string | null
  createdAt: string
  winners: Winner[]
}

type Filter = 'all' | 'eligible' | 'not_subscribed' | 'unlinked' | 'winners'

const PRIZE_LABEL: Record<Prize, string> = { GOING: 'Borish yo‘li', RETURN: 'Qaytish yo‘li' }
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Hammasi' },
  { value: 'eligible', label: 'Obuna bo‘lgan' },
  { value: 'not_subscribed', label: 'Obuna bo‘lmagan' },
  { value: 'unlinked', label: 'Botga ulanmagan' },
  { value: 'winners', label: 'G‘oliblar' },
]

const fullName = (e: Pick<Entry, 'firstName' | 'lastName'>) => `${e.firstName} ${e.lastName}`

// ── Small UI bits ───────────────────────────────────────────────────────────────────────────

function MemberMark({ value, required }: { value: boolean | null; required: boolean }) {
  if (!required) return <span className="text-xs text-muted">—</span>
  if (value === true)
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600" title="Obuna bo‘lgan">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    )
  if (value === false)
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500" title="Obuna bo‘lmagan">
        <X className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    )
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400" title="Tekshirilmagan">
      ?
    </span>
  )
}

function EntryStatus({ entry }: { entry: Entry }) {
  if (!entry.linked) return <Badge tone="gray">Botga ulanmagan</Badge>
  if (entry.eligible) return <Badge tone="green">Ishtirokchi</Badge>
  return <Badge tone="red">Obuna emas</Badge>
}

// ── Drum (baraban) ──────────────────────────────────────────────────────────────────────────

const ITEM_H = 56
const VISIBLE = 5
const SPIN_MS = 4200

function Drum({ names, target, spinKey, onDone }: { names: string[]; target: string | null; spinKey: number; onDone: () => void }) {
  // A long strip of shuffled pool names with the winner placed near the end; translating the
  // strip with a strong ease-out makes it read as a slowing drum that stops on the winner.
  const strip = useMemo(() => {
    if (!target) return names.length ? names.slice(0, VISIBLE) : ['—', '—', '—', '—', '—']
    const pool = names.length ? names : [target]
    const others = pool.filter((n) => n !== target)
    // Random names with no two neighbours equal, so a small pool still reads as a spinning drum.
    const pick = (avoid: string[]) => {
      const choices = pool.filter((n) => !avoid.includes(n))
      const from = choices.length ? choices : pool
      return from[Math.floor(Math.random() * from.length)]
    }
    const out: string[] = []
    while (out.length < 46) out.push(pick([out[out.length - 1], target].slice(0, pool.length > 2 ? 2 : 1)))
    if (out[out.length - 1] === target && others.length) out[out.length - 1] = others[0]
    const after = others.length ? others : pool
    out.push(target, after[0], after[1 % after.length])
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey, target])
  const stopIndex = target ? strip.length - 3 : Math.floor(VISIBLE / 2)
  const [offset, setOffset] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (!target) return
    setAnimating(false)
    setOffset(0)
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setAnimating(true)
        setOffset(-(stopIndex - Math.floor(VISIBLE / 2)) * ITEM_H)
      }),
    )
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey])

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#14181e] ring-1 ring-white/10" style={{ height: ITEM_H * VISIBLE }}>
      <div
        onTransitionEnd={() => target && onDone()}
        className={animating ? 'will-change-transform' : ''}
        style={{
          transform: `translateY(${offset}px)`,
          transition: animating ? `transform ${SPIN_MS}ms cubic-bezier(.08,.82,.17,1)` : 'none',
        }}
      >
        {strip.map((n, i) => (
          <div
            key={`${spinKey}-${i}`}
            className="flex items-center justify-center px-6 text-center text-[19px] font-bold tracking-tight text-white/85"
            style={{ height: ITEM_H }}
          >
            <span className="truncate">{n}</span>
          </div>
        ))}
      </div>
      {/* Markaziy chiziq va silindr effekti */}
      <div
        className="pointer-events-none absolute inset-x-3 rounded-2xl border-2 border-brand bg-brand/10 shadow-[0_0_30px_rgba(0,199,212,0.35)]"
        style={{ top: ITEM_H * Math.floor(VISIBLE / 2), height: ITEM_H }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#14181e] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#14181e] to-transparent" />
      <span className="pointer-events-none absolute left-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[9px] border-l-[12px] border-y-transparent border-l-brand" />
      <span className="pointer-events-none absolute right-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[9px] border-r-[12px] border-y-transparent border-r-brand" />
    </div>
  )
}

function Confetti({ run }: { run: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        dur: 1.6 + Math.random() * 1.4,
        rot: Math.random() * 360,
        color: ['#00c7d4', '#ffffff', '#5ee3eb', '#ffd166', '#1d2229'][i % 5],
        size: 6 + Math.random() * 6,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run],
  )
  if (!run) return null
  return (
    <div key={run} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-4 block rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.45,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            animation: `gw-confetti ${p.dur}s cubic-bezier(.2,.6,.4,1) ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}

function DrawPanel({ overview, onDrawn }: { overview: Overview; onDrawn: () => void }) {
  const [count, setCount] = useState(1)
  const [prize, setPrize] = useState<Prize>('GOING')
  const [exclude, setExclude] = useState(true)
  const [error, setError] = useState('')
  const [reel, setReel] = useState<string[]>([])
  const [queue, setQueue] = useState<Winner[]>([])
  const [revealed, setRevealed] = useState<Winner[]>([])
  const [current, setCurrent] = useState<Winner | null>(null)
  const [lastLanded, setLastLanded] = useState<string | null>(null)
  const [spinKey, setSpinKey] = useState(0)
  const [confetti, setConfetti] = useState(0)
  const spinning = Boolean(current) || queue.length > 0
  const eligible = overview.stats.eligible
  const noRules = !overview.requires.channel && !overview.requires.group
  const timer = useRef<number | null>(null)

  const draw = useMutation({
    mutationFn: () => api.post<{ draw: Draw; reel: string[]; shortBy: number }>('/admin/giveaway/draws', { count, prize, excludePastWinners: exclude }),
    onSuccess: (res) => {
      setError(res.shortBy > 0 ? `Shartga mos ishtirokchilar yetmadi: ${res.draw.winners.length} ta g‘olib tanlandi.` : '')
      setReel(res.reel)
      setRevealed([])
      const [first, ...rest] = res.draw.winners
      setQueue(rest)
      setCurrent(first ?? null)
      setSpinKey((k) => k + 1)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  function onLanded() {
    if (!current) return
    const landed = current
    setLastLanded(fullName(landed.entry))
    setRevealed((r) => [...r, landed])
    timer.current = window.setTimeout(() => {
      if (queue.length) {
        const [next, ...rest] = queue
        setQueue(rest)
        setCurrent(next)
        setSpinKey((k) => k + 1)
      } else {
        setCurrent(null)
        setConfetti((c) => c + 1)
        onDrawn()
      }
    }, 900)
  }

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const max = Math.max(1, Math.min(50, eligible || 1))

  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl bg-sidebar text-white shadow-[0_20px_50px_-20px_rgba(15,29,42,0.5)]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/25 blur-3xl" />
      <div className="relative grid gap-8 p-6 lg:grid-cols-[minmax(0,360px)_1fr] lg:p-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-ink">
              <Dices className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-extrabold">Baraban</p>
              <p className="text-sm text-white/60">
                Ishtirokchilar: <b className="text-white">{eligible}</b> ta
              </p>
            </div>
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-white/50">G‘oliblar soni</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              disabled={spinning || count <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 transition hover:bg-white/20 disabled:opacity-40"
              aria-label="Kamaytirish"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={1}
              max={max}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
              disabled={spinning}
              className="h-11 w-20 rounded-2xl bg-white/10 text-center text-lg font-extrabold outline-none focus:ring-2 focus:ring-brand"
              aria-label="G‘oliblar soni"
            />
            <button
              type="button"
              onClick={() => setCount((c) => Math.min(max, c + 1))}
              disabled={spinning || count >= max}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 transition hover:bg-white/20 disabled:opacity-40"
              aria-label="Ko‘paytirish"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-white/50">Mukofot</p>
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1">
            {(['GOING', 'RETURN'] as Prize[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrize(p)}
                disabled={spinning}
                className={cn(
                  'flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition',
                  prize === p ? 'bg-brand text-ink shadow' : 'text-white/70 hover:text-white',
                )}
              >
                {p === 'GOING' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                {PRIZE_LABEL[p]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/45">G‘olibning {PRIZE_LABEL[prize].toLowerCase()} haqini TaxiLine to‘laydi</p>

          <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-white/80">
            <input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} disabled={spinning} className="h-4 w-4 accent-[#00c7d4]" />
            Avval yutganlarni qatnashtirmaslik
          </label>

          {noRules ? (
            <p className="mt-5 flex gap-2 rounded-2xl bg-amber-400/10 px-3 py-2.5 text-xs text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Kanal va guruh sozlanmagan — obuna tekshirilmaydi. Sozlamalardan kiriting.
            </p>
          ) : null}
          {error ? <p className="mt-4 rounded-2xl bg-red-500/15 px-3 py-2.5 text-sm text-red-200">{error}</p> : null}

          <button
            type="button"
            onClick={() => {
              setError('')
              draw.mutate()
            }}
            disabled={spinning || draw.isPending || eligible === 0}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand text-[16px] font-extrabold uppercase tracking-wide text-ink shadow-[0_14px_30px_-10px_rgba(0,199,212,0.8)] transition hover:bg-[#1ad3df] active:scale-[0.99] disabled:opacity-40"
          >
            <Dices className={cn('h-5 w-5', spinning || draw.isPending ? 'animate-spin' : '')} />
            {spinning ? 'Aylanmoqda…' : draw.isPending ? 'Tekshirilmoqda…' : 'Random'}
          </button>
          {eligible === 0 ? <p className="mt-2 text-center text-xs text-white/45">Ishtirokchi yo‘q — avval obunani tekshiring</p> : null}
        </div>

        <div className="relative">
          <Confetti run={confetti} />
          <Drum names={reel} target={current ? fullName(current.entry) : lastLanded} spinKey={spinKey} onDone={() => current && onLanded()} />
          <div className="mt-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/70">
              <Trophy className="h-4 w-4 text-brand" /> G‘oliblar {revealed.length ? `(${revealed.length})` : ''}
            </p>
            {revealed.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {revealed.map((w, i) => (
                  <li key={w.id} className="flex animate-[gw-pop_.45s_cubic-bezier(.2,1.4,.4,1)] items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-ink">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{fullName(w.entry)}</span>
                      <span className="block text-xs text-white/55">
                        {formatPhoneUz(w.entry.phone)}
                        {w.entry.telegramUsername ? ` · @${w.entry.telegramUsername}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-white/45">
                «Random» tugmasini bosing — baraban faqat obuna bo‘lgan ishtirokchilar orasidan tanlaydi.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Settings modal ──────────────────────────────────────────────────────────────────────────

function SettingsModal({ open, settings, onClose }: { open: boolean; settings: GiveawaySettings; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch('/admin/giveaway/settings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-giveaway'] })
      setError('')
      onClose()
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi'),
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    save.mutate({
      title: String(f.get('title') || '').trim(),
      prizeText: String(f.get('prizeText') || '').trim(),
      channelChatId: String(f.get('channelChatId') || '').trim(),
      channelUrl: String(f.get('channelUrl') || '').trim(),
      groupChatId: String(f.get('groupChatId') || '').trim(),
      groupUrl: String(f.get('groupUrl') || '').trim(),
      entriesOpen: f.get('entriesOpen') === 'on',
    })
  }

  return (
    <Modal open={open} title="O‘yin sozlamalari" onClose={onClose} wide>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Sarlavha">
          <input name="title" defaultValue={settings.title} required className={inputClass} />
        </Field>
        <label className="flex items-end gap-3 pb-2.5 text-sm font-semibold text-ink">
          <input name="entriesOpen" type="checkbox" defaultChecked={settings.entriesOpen} className="h-4 w-4 accent-[#00c7d4]" />
          Saytda qabul ochiq
        </label>
        <div className="sm:col-span-2">
          <Field label="Mukofot matni (saytda ko‘rinadi)">
            <input
              name="prizeText"
              defaultValue={settings.prizeText ?? ''}
              placeholder="Tasodifiy tanlangan mijozlarning borish yoki qaytish yo‘l haqini to‘laymiz!"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Kanal (@username yoki -100… ID)">
          <input name="channelChatId" defaultValue={settings.channelChatId ?? ''} placeholder="@taxiline_uz" className={inputClass} />
        </Field>
        <Field label="Kanal havolasi">
          <input name="channelUrl" defaultValue={settings.channelUrl ?? ''} placeholder="https://t.me/taxiline_uz" className={inputClass} />
        </Field>
        <Field label="Guruh (@username yoki -100… ID)">
          <input name="groupChatId" defaultValue={settings.groupChatId ?? ''} placeholder="-1001234567890" className={inputClass} />
        </Field>
        <Field label="Guruh havolasi">
          <input name="groupUrl" defaultValue={settings.groupUrl ?? ''} placeholder="https://t.me/+AbCdEf…" className={inputClass} />
        </Field>
        <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700 sm:col-span-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Bot kanalda <b>administrator</b>, guruhda esa a’zo bo‘lishi shart — aks holda Telegram obunani tekshirishga ruxsat bermaydi.
        </p>
        {error ? <p className="text-sm font-semibold text-red-500 sm:col-span-2">{error}</p> : null}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={save.isPending}>
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────────────────

export default function Giveaway() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [checkMsg, setCheckMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const pageSize = 50

  const overview = useQuery({ queryKey: ['admin-giveaway'], queryFn: () => api.get<Overview>('/admin/giveaway') })
  const entries = useQuery({
    queryKey: ['admin-giveaway-entries', filter, q, page],
    queryFn: () =>
      api.get<{ items: Entry[]; total: number }>(
        `/admin/giveaway/entries?filter=${filter}&page=${page}&pageSize=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      ),
  })
  const draws = useQuery({ queryKey: ['admin-giveaway-draws'], queryFn: () => api.get<Draw[]>('/admin/giveaway/draws') })

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ['admin-giveaway'] })
    queryClient.invalidateQueries({ queryKey: ['admin-giveaway-entries'] })
    queryClient.invalidateQueries({ queryKey: ['admin-giveaway-draws'] })
  }

  const check = useMutation({
    mutationFn: (ids?: string[]) =>
      api.post<{ checked: number; eligible: number; chatErrors: Record<string, string> }>('/admin/giveaway/entries/check', ids ? { ids } : {}),
    onSuccess: (res) => {
      const errs = Object.entries(res.chatErrors)
      setCheckMsg(
        errs.length
          ? { tone: 'err', text: `Telegram xatosi: ${errs.map(([c, e]) => `${c} — ${e}`).join('; ')}. Bot kanalda admin ekanini tekshiring.` }
          : { tone: 'ok', text: `${res.checked} ta ishtirokchi tekshirildi: ${res.eligible} tasi shartlarni bajargan.` },
      )
      refreshAll()
    },
    onError: (err) => setCheckMsg({ tone: 'err', text: err instanceof ApiError ? err.message : 'Tekshirib bo‘lmadi' }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/giveaway/entries/${id}`),
    onSuccess: refreshAll,
  })

  const setPaid = useMutation({
    mutationFn: (input: { id: string; paid: boolean }) => api.patch(`/admin/giveaway/winners/${input.id}`, { paid: input.paid }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-giveaway-draws'] }),
  })

  const ov = overview.data
  const req = ov?.requires ?? { channel: false, group: false }

  return (
    <div>
      <PageHeader
        title="Random mijozlar"
        subtitle="Saytdagi o‘yin ishtirokchilari, obuna holati va g‘oliblar"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => check.mutate(undefined)} disabled={check.isPending}>
              <RefreshCw className={cn('h-4 w-4', check.isPending && 'animate-spin')} />
              {check.isPending ? 'Tekshirilmoqda…' : 'Obunani tekshirish'}
            </Button>
            <Button variant="dark" onClick={() => setSettingsOpen(true)} disabled={!ov}>
              <Settings2 className="h-4 w-4" /> Sozlamalar
            </Button>
          </div>
        }
      />

      {checkMsg ? (
        <div
          className={cn(
            'mb-5 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm',
            checkMsg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
          )}
        >
          {checkMsg.tone === 'ok' ? <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1">{checkMsg.text}</span>
          <button type="button" onClick={() => setCheckMsg(null)} className="text-current/60 hover:text-current" aria-label="Yopish">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {ov ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard icon={Users} label="Jami" value={String(ov.stats.total)} hint={ov.settings.entriesOpen ? 'Qabul ochiq' : 'Qabul yopiq'} />
            <StatCard icon={BadgeCheck} label="Ishtirokchilar" value={String(ov.stats.eligible)} hint="Shartlar bajarilgan" tone="success" />
            <StatCard icon={UserX} label="Obuna emas" value={String(ov.stats.notSubscribed)} tone="amber" />
            <StatCard icon={Link2Off} label="Botga ulanmagan" value={String(ov.stats.unlinked)} tone="slate" />
            <StatCard icon={Trophy} label="G‘oliblar" value={String(ov.stats.winners)} hint={`${ov.stats.draws} ta o‘yin`} />
          </div>

          <div className="mb-6 flex flex-wrap gap-2 text-sm">
            <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold', req.channel ? 'bg-brand-soft text-brand-dark' : 'bg-slate-100 text-slate-500')}>
              <Send className="h-3.5 w-3.5" /> Kanal: {ov.settings.channelChatId || 'sozlanmagan'}
            </span>
            <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold', req.group ? 'bg-brand-soft text-brand-dark' : 'bg-slate-100 text-slate-500')}>
              <Users className="h-3.5 w-3.5" /> Guruh: {ov.settings.groupChatId || 'sozlanmagan'}
            </span>
          </div>

          <DrawPanel overview={ov} onDrawn={refreshAll} />
        </>
      ) : overview.isLoading ? (
        <SkeletonTable />
      ) : null}

      {/* Ishtirokchilar jadvali */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <FilterPills
            options={FILTERS}
            value={filter}
            onChange={(v) => {
              setFilter(v as Filter)
              setPage(1)
            }}
          />
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v)
              setPage(1)
            }}
            placeholder="Ism, telefon yoki @username"
            className="w-full sm:w-72"
          />
        </div>
        {entries.isLoading ? (
          <div className="p-4">
            <SkeletonTable />
          </div>
        ) : !entries.data?.items.length ? (
          <div className="p-4">
            <EmptyState icon={Gift} title="Ishtirokchilar yo‘q" text="Saytdagi «Random mijoz» formasini to‘ldirganlar shu yerda ko‘rinadi." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Ishtirokchi</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Telegram</th>
                  <th className="px-4 py-3 text-center">Kanal</th>
                  <th className="px-4 py-3 text-center">Guruh</th>
                  <th className="px-4 py-3">Holat</th>
                  <th className="px-4 py-3">Sana</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {entries.data.items.map((e) => (
                  <tr key={e.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-ink">{fullName(e)}</span>
                      {e.wins ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                          <Trophy className="h-3 w-3" /> {e.wins}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink">{formatPhoneUz(e.phone)}</td>
                    <td className="px-4 py-3">
                      {e.linked ? (
                        <span className="text-ink">{e.telegramUsername ? `@${e.telegramUsername}` : `ID ${e.telegramId}`}</span>
                      ) : (
                        <span className="text-muted">Ulanmagan</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <MemberMark value={e.channelMember} required={req.channel && e.linked} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <MemberMark value={e.groupMember} required={req.group && e.linked} />
                    </td>
                    <td className="px-4 py-3">
                      <EntryStatus entry={e} />
                      {e.checkError ? <p className="mt-1 max-w-[220px] truncate text-[11px] text-red-500" title={e.checkError}>{e.checkError}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatDateTime(e.createdAt)}
                      {e.checkedAt ? <span className="block text-[11px]">Tekshirildi: {formatDateTime(e.checkedAt)}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => check.mutate([e.id])}
                          disabled={!e.linked || check.isPending}
                          title="Obunani tekshirish"
                          className="rounded-lg p-2 text-muted transition hover:bg-brand-soft hover:text-brand-dark disabled:opacity-30"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`${fullName(e)} o‘chirilsinmi?`)) remove.mutate(e.id)
                          }}
                          title="O‘chirish"
                          className="rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {entries.data && entries.data.total > pageSize ? (
          <div className="border-t border-line p-4">
            <Pagination page={page} pageSize={pageSize} total={entries.data.total} onPageChange={setPage} />
          </div>
        ) : null}
      </Card>

      {/* O‘yinlar tarixi */}
      <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-ink">
        <Trophy className="h-4 w-4 text-brand-dark" /> O‘yinlar tarixi
      </h2>
      {!draws.data?.length ? (
        <EmptyState icon={Trophy} title="Hali o‘yin o‘tkazilmagan" text="Baraban orqali tanlangan g‘oliblar shu yerda saqlanadi." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {draws.data.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{formatDateTime(d.createdAt)}</p>
                  <p className="text-xs text-muted">
                    {d.poolSize} ishtirokchidan {d.winners.length} ta g‘olib{d.createdByName ? ` · ${d.createdByName}` : ''}
                  </p>
                </div>
                <Badge tone="pink">{PRIZE_LABEL[d.prize]}</Badge>
              </div>
              <ul className="divide-y divide-line">
                {d.winners.map((w) => (
                  <li key={w.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
                      <Trophy className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{fullName(w.entry)}</span>
                      <span className="block text-xs text-muted">
                        {formatPhoneUz(w.entry.phone)}
                        {w.entry.telegramUsername ? ` · @${w.entry.telegramUsername}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPaid.mutate({ id: w.id, paid: !w.paidAt })}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                        w.paidAt ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-canvas text-muted hover:bg-line hover:text-ink',
                      )}
                      title={w.paidAt ? `To‘langan: ${formatDateTime(w.paidAt)}` : 'To‘langan deb belgilash'}
                    >
                      {w.paidAt ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                      {w.paidAt ? 'To‘landi' : 'To‘lanmagan'}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {ov ? <SettingsModal open={settingsOpen} settings={ov.settings} onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  )
}
