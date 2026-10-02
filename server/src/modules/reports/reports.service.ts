import { prisma } from '../../lib/prisma.js'
import { periodRange, reportPeriodLabel, type ReportPeriod } from '../../lib/period.js'
import { actualsFromActivities } from '../staff/staff.service.js'

export type Sheet = { name: string; columns: string[]; rows: Array<Array<string | number>> }

function som(n: number) {
  return n
}

function dt(d: Date) {
  return d.toLocaleString('uz-UZ')
}

function xmlEscape(value: string | number) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cellXml(value: string | number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`
  }
  return `<Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`
}

export function sheetsToSpreadsheetXml(sheets: Sheet[]) {
  const worksheets = sheets
    .map((sheet) => {
      const header = `<Row>${sheet.columns.map((c) => cellXml(c)).join('')}</Row>`
      const body = sheet.rows.map((row) => `<Row>${row.map(cellXml).join('')}</Row>`).join('')
      return `<Worksheet ss:Name="${xmlEscape(sheet.name)}"><Table>${header}${body}</Table></Worksheet>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheets}
</Workbook>`
}

export async function buildReport(period: ReportPeriod): Promise<{ period: ReportPeriod; label: string; range: { from: Date; to: Date }; sheets: Sheet[] }> {
  const { from, to } = periodRange(period)
  const createdAt = { gte: from, lte: to }

  const [bookings, users, drivers, transactions, operators, activities, tickets] = await Promise.all([
    prisma.booking.findMany({
      where: { createdAt },
      orderBy: { createdAt: 'desc' },
      include: {
        rider: { select: { name: true, phone: true } },
        rideOffer: { include: { driver: { include: { user: { select: { name: true, phone: true } } } } } },
      },
      take: 2000,
    }),
    prisma.user.findMany({
      where: { createdAt, staffKind: null },
      orderBy: { createdAt: 'desc' },
      take: 2000,
      select: { name: true, phone: true, role: true, verified: true, createdAt: true },
    }),
    prisma.driver.findMany({
      where: { createdAt },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, phone: true } } },
      take: 2000,
    }),
    prisma.transaction.findMany({
      where: { createdAt },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, phone: true } } },
      take: 2000,
    }),
    prisma.user.findMany({
      where: { staffKind: { not: null } },
      select: { id: true, name: true, phone: true, staffKind: true, staffActive: true },
    }),
    prisma.operatorActivity.findMany({
      where: { createdAt },
      select: { operatorId: true, kind: true, amount: true },
    }),
    prisma.supportTicket.findMany({
      where: { createdAt },
      orderBy: { createdAt: 'desc' },
      include: { assignee: { select: { name: true, phone: true } } },
      take: 2000,
    }),
  ])

  const completed = bookings.filter((b) => b.status === 'COMPLETED').length
  const revenue = transactions.filter((t) => t.type === 'RIDE_PAYMENT' && t.status === 'SUCCESS').reduce((s, t) => s + Math.abs(t.amount), 0)

  const sheets: Sheet[] = [
    {
      name: 'Umumiy',
      columns: ['Ko‘rsatkich', 'Qiymat'],
      rows: [
        ['Davr', reportPeriodLabel(period)],
        ['Dan', dt(from)],
        ['Gacha', dt(to)],
        ['Bronlar', bookings.length],
        ['Yakunlangan', completed],
        ['Daromad (so‘m)', som(revenue)],
        ['Yangi foydalanuvchilar', users.length],
        ['Yangi haydovchilar', drivers.length],
        ['Tranzaksiyalar', transactions.length],
        ['Operatorlar', operators.length],
        ['Yangi murojaatlar', tickets.length],
      ],
    },
    {
      name: 'Bronlar',
      columns: ['Sana', 'Yo‘nalish', 'Mijoz', 'Haydovchi', 'Holat', 'Narx'],
      rows: bookings.map((b) => [
        dt(b.createdAt),
        `${b.fromLabel} → ${b.toLabel}`,
        b.rider.name || b.rider.phone,
        b.rideOffer.driver.user.name || b.rideOffer.driver.user.phone,
        b.status,
        b.totalPrice,
      ]),
    },
    {
      name: 'Foydalanuvchilar',
      columns: ['Sana', 'Ism', 'Telefon', 'Rol', 'Tasdiqlangan'],
      rows: users.map((u) => [dt(u.createdAt), u.name || '—', u.phone, u.role, u.verified ? 'Ha' : 'Yo‘q']),
    },
    {
      name: 'Haydovchilar',
      columns: ['Sana', 'Ism', 'Telefon', 'Mashina', 'Raqam', 'Tasdiqlangan'],
      rows: drivers.map((d) => [
        dt(d.createdAt),
        d.user.name || '—',
        d.user.phone,
        d.carModel,
        d.plate,
        d.approved ? 'Ha' : 'Yo‘q',
      ]),
    },
    {
      name: 'Moliya',
      columns: ['Sana', 'Foydalanuvchi', 'Tur', 'Holat', 'Summa', 'Sarlavha'],
      rows: transactions.map((t) => [
        dt(t.createdAt),
        t.user?.name || t.user?.phone || '—',
        t.type,
        t.status,
        t.amount,
        t.title,
      ]),
    },
    {
      name: 'Sotuv KPI',
      columns: ['Operator', 'Telefon', 'Mijozlar', 'Haydovchilar', 'Bronlar', 'Qo‘ng‘iroqlar', 'Daromad'],
      rows: operators
        .filter((o) => o.staffKind === 'SALES')
        .map((o) => {
          const actual = actualsFromActivities(activities.filter((a) => a.operatorId === o.id))
          return [o.name || '—', o.phone, actual.newUsers, actual.newDrivers, actual.bookings, actual.calls, actual.revenue]
        }),
    },
    {
      name: 'Texnik xizmat',
      columns: ['№', 'Sana', 'Mavzu', 'Kategoriya', 'Ustuvorlik', 'Holat', 'Mas’ul'],
      rows: tickets.map((t) => [
        t.ticketNo,
        dt(t.createdAt),
        t.subject,
        t.category,
        t.priority,
        t.status,
        t.assignee?.name || t.assignee?.phone || '—',
      ]),
    },
  ]

  return { period, label: reportPeriodLabel(period), range: { from, to }, sheets }
}

export async function reportToXlsx(period: ReportPeriod) {
  const report = await buildReport(period)
  const xml = sheetsToSpreadsheetXml(report.sheets)
  return { filename: `taxiline-${report.label}-${report.period}.xls`, buffer: Buffer.from(xml, 'utf8'), report }
}
