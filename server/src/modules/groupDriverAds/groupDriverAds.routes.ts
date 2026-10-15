import { Router, type Request, type Response } from 'express'
import type { z } from 'zod'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as service from './groupDriverAds.service.js'
import {
  groupAdIdParamSchema,
  listGroupAdsQuerySchema,
  rejectGroupAdSchema,
  updateGroupAdSchema,
} from './groupDriverAds.schema.js'

// Admin panel → "Haydovchilar e’lonlari". The bot's side (POST /bot/group-driver-ads) is in bot.routes.ts.
export const adminGroupDriverAdsRouter = Router()

adminGroupDriverAdsRouter.use(requireAuth, requireRole('ADMIN'))

adminGroupDriverAdsRouter.get(
  '/',
  validate({ query: listGroupAdsQuerySchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await service.listAdmin(req.query as unknown as z.infer<typeof listGroupAdsQuerySchema>))
  }),
)
adminGroupDriverAdsRouter.get(
  '/pending-count',
  asyncRoute(async (_req: Request, res: Response) => {
    res.json(await service.pendingCount())
  }),
)
adminGroupDriverAdsRouter.patch(
  '/:id',
  validate({ params: groupAdIdParamSchema, body: updateGroupAdSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await service.update(req.user!.id, req.params.id, req.body))
  }),
)
adminGroupDriverAdsRouter.post(
  '/:id/publish',
  validate({ params: groupAdIdParamSchema, body: updateGroupAdSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await service.publish(req.user!.id, req.params.id, req.body))
  }),
)
adminGroupDriverAdsRouter.post(
  '/:id/extend',
  validate({ params: groupAdIdParamSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await service.extend(req.user!.id, req.params.id))
  }),
)
adminGroupDriverAdsRouter.post(
  '/:id/reject',
  validate({ params: groupAdIdParamSchema, body: rejectGroupAdSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await service.reject(req.user!.id, req.params.id, req.body.reason))
  }),
)
adminGroupDriverAdsRouter.delete(
  '/:id',
  validate({ params: groupAdIdParamSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await service.remove(req.user!.id, req.params.id))
  }),
)
