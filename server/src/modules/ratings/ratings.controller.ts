import type { Request, Response } from 'express'
import type { z } from 'zod'
import * as ratingsService from './ratings.service.js'
import type { listRatingsQuerySchema } from './ratings.schema.js'

export async function listAllRatings(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listRatingsQuerySchema>
  res.json(await ratingsService.listAllRatings(query.direction))
}
