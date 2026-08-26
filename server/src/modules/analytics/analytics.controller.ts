import type { Request, Response } from 'express'
import type { z } from 'zod'
import * as analyticsService from './analytics.service.js'
import type { analyticsSummaryQuerySchema } from './analytics.schema.js'

export async function getSummary(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof analyticsSummaryQuerySchema>
  res.json(await analyticsService.getSummary(query))
}
