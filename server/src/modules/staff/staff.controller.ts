import type { Request, Response } from 'express'
import type { z } from 'zod'
import * as staffService from './staff.service.js'
import type {
  createActivitySchema,
  createStaffSchema,
  listStaffQuerySchema,
  salesDashboardQuerySchema,
  setBusySchema,
  updateMeSchema,
  updateStaffSchema,
  upsertKpiSchema,
} from './staff.schema.js'

export async function listStaff(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listStaffQuerySchema>
  res.json(await staffService.listStaff(query))
}

export async function createStaff(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createStaffSchema>
  res.status(201).json(await staffService.createStaff(body, req.user!.id))
}

export async function myProfile(req: Request, res: Response) {
  res.json(await staffService.getStaffDetail(req.user!.id))
}

export async function updateMe(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateMeSchema>
  res.json(
    await staffService.updateStaff(
      req.user!.id,
      {
        name: body.name,
        phone: body.phone,
        password: body.password,
      },
      req.user!.id,
    ),
  )
}

export async function setMyBusy(req: Request, res: Response) {
  const body = req.body as z.infer<typeof setBusySchema>
  res.json(await staffService.setBusy(req.user!.id, body.busy))
}

export async function heartbeat(req: Request, res: Response) {
  await staffService.heartbeat(req.user!.id)
  res.status(204).end()
}

export async function mySessions(req: Request, res: Response) {
  res.json(await staffService.listSessions(req.user!.id))
}

export async function revokeMySession(req: Request, res: Response) {
  await staffService.revokeSession(req.user!.id, req.params.sessionId, req.user!.id)
  res.status(204).end()
}

export async function staffSessions(req: Request, res: Response) {
  res.json(await staffService.listSessions(req.params.id))
}

export async function revokeStaffSession(req: Request, res: Response) {
  await staffService.revokeSession(req.params.id, req.params.sessionId, req.user!.id)
  res.status(204).end()
}

export async function getStaff(req: Request, res: Response) {
  res.json(await staffService.getStaffDetail(req.params.id))
}

export async function updateStaff(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateStaffSchema>
  res.json(await staffService.updateStaff(req.params.id, body, req.user!.id))
}

export async function upsertKpi(req: Request, res: Response) {
  const body = req.body as z.infer<typeof upsertKpiSchema>
  res.json(await staffService.upsertKpi(req.params.id, body))
}

export async function teamKpi(req: Request, res: Response) {
  const period = (req.query.period as 'DAY' | 'WEEK' | 'MONTH' | undefined) || 'DAY'
  res.json(await staffService.teamKpiOverview(period))
}

export async function myDashboard(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof salesDashboardQuerySchema>
  res.json(await staffService.salesDashboard(req.user!.id, query.period || 'DAY'))
}

export async function logMyActivity(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createActivitySchema>
  res.status(201).json(await staffService.logActivity(req.user!.id, body))
}
