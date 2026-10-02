import type { Request, Response } from 'express'
import type { z } from 'zod'
import * as auditService from './audit.service.js'
import type { listAuditQuerySchema } from './audit.schema.js'

export async function listAudit(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listAuditQuerySchema>
  res.json(await auditService.listAudit(query))
}
