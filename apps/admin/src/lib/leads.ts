import type { LeadRow, LeadStatus } from '../types'

export const LEAD_COLUMNS: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']

// One accent per pipeline stage — column top bar, dot and drop highlight.
export const LEAD_STAGE_COLOR: Record<LeadStatus, string> = {
  NEW: '#64748b',
  CONTACTED: '#f59e0b',
  QUALIFIED: '#8b5cf6',
  CONVERTED: '#10b981',
  LOST: '#f43f5e',
}

export const LOST_REASONS = ['Javob bermadi', 'Narx qimmat', 'Boshqa xizmatni tanladi', 'Kerak emas bo‘lib qoldi', 'Noto‘g‘ri raqam']

export type FollowUpState = 'overdue' | 'today' | 'later'

/** Where a reminder stands relative to `now`: missed, still due today, or in the future. */
export function followUpState(iso: string | null, now = new Date()): FollowUpState | null {
  if (!iso) return null
  const at = new Date(iso)
  if (at.getTime() < now.getTime()) return 'overdue'
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  return at.getTime() <= endOfToday.getTime() ? 'today' : 'later'
}

export type FollowUpPreset = 'hour' | 'tomorrow' | 'threeDays' | 'week'

export const FOLLOW_UP_PRESETS: { value: FollowUpPreset; label: string }[] = [
  { value: 'hour', label: '1 soatdan keyin' },
  { value: 'tomorrow', label: 'Ertaga 10:00' },
  { value: 'threeDays', label: '3 kundan keyin' },
  { value: 'week', label: '1 haftadan keyin' },
]

/** Quick reminder times; day-based ones land at 10:00, when people pick up the phone. */
export function presetFollowUp(preset: FollowUpPreset, now = new Date()): Date {
  const d = new Date(now)
  if (preset === 'hour') {
    d.setHours(d.getHours() + 1, d.getMinutes(), 0, 0)
    return d
  }
  const days = preset === 'tomorrow' ? 1 : preset === 'threeDays' ? 3 : 7
  d.setDate(d.getDate() + days)
  d.setHours(10, 0, 0, 0)
  return d
}

/** "hozir", "12 daq", "3 soat", "5 kun" — how long ago a lead came in. */
export function relativeAge(iso: string, now = new Date()): string {
  const mins = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000))
  if (mins < 1) return 'hozir'
  if (mins < 60) return `${mins} daq`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} soat`
  return `${Math.floor(hours / 24)} kun`
}

/** Share of leads that became customers, among those whose outcome is known or in progress. */
export function conversionRate(leads: Pick<LeadRow, 'status'>[]): number {
  if (!leads.length) return 0
  const won = leads.filter((l) => l.status === 'CONVERTED').length
  return Math.round((won / leads.length) * 100)
}

/** How many leads came in during the last `days` days. */
export function createdWithinDays(leads: Pick<LeadRow, 'createdAt'>[], days: number, now = new Date()): number {
  const since = now.getTime() - days * 24 * 3600_000
  return leads.filter((l) => new Date(l.createdAt).getTime() >= since).length
}

/** Keeps the reason a lead was lost on the lead itself (in its note), newest first. */
export function withLostReason(note: string | null, reason: string): string {
  const line = `Yo‘qotish sababi: ${reason}`
  return note ? `${line}\n${note}`.slice(0, 2000) : line
}

/** The digits wa.me / t.me want: "+998 90 123-45-67" → "998901234567". */
export function phoneDigits(phone: string | null): string {
  return (phone ?? '').replace(/\D/g, '')
}
