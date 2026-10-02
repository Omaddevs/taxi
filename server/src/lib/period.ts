export type ReportPeriod = 'day' | 'week' | 'month'

export function startOfDay(d = new Date()) {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

export function periodRange(period: ReportPeriod, now = new Date()) {
  const to = now
  const from = startOfDay(now)
  if (period === 'week') {
    const day = from.getDay()
    const diff = day === 0 ? 6 : day - 1
    from.setDate(from.getDate() - diff)
  } else if (period === 'month') {
    from.setDate(1)
  }
  return { from, to }
}

export function kpiPeriodStart(period: 'DAY' | 'WEEK' | 'MONTH', now = new Date()) {
  return periodRange(period === 'DAY' ? 'day' : period === 'WEEK' ? 'week' : 'month', now).from
}

export function reportPeriodLabel(period: ReportPeriod) {
  if (period === 'week') return 'haftalik'
  if (period === 'month') return 'oylik'
  return 'kunlik'
}
