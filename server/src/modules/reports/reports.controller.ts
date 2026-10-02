import type { Request, Response } from 'express'
import type { z } from 'zod'
import * as reportsService from './reports.service.js'
import type { reportPeriodSchema } from './reports.schema.js'
import type { ReportPeriod } from '../../lib/period.js'

function periodOf(query: z.infer<typeof reportPeriodSchema>): ReportPeriod {
  return query.period || 'day'
}

export async function getReport(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof reportPeriodSchema>
  const report = await reportsService.buildReport(periodOf(query))
  res.json({
    period: report.period,
    label: report.label,
    range: report.range,
    sheets: report.sheets,
  })
}

export async function downloadXlsx(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof reportPeriodSchema>
  const { filename, buffer } = await reportsService.reportToXlsx(periodOf(query))
  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(buffer)
}
