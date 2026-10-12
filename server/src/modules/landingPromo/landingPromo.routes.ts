import { Router, type Request, type Response } from 'express'
import type { z } from 'zod'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as service from './landingPromo.service.js'
import { createLandingPromoSchema, landingPromoIdParamSchema, updateLandingPromoSchema } from './landingPromo.schema.js'

// Ochiq: landing faqat faol aksiyalarni oladi.
export const landingPromoRouter = Router()

landingPromoRouter.get(
  '/',
  asyncRoute(async (_req: Request, res: Response) => {
    res.json(await service.listPublic())
  }),
)

export const adminLandingPromoRouter = Router()

adminLandingPromoRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  asyncRoute(async (_req: Request, res: Response) => {
    res.json(await service.listAll())
  }),
)
adminLandingPromoRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createLandingPromoSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.status(201).json(await service.create(req.body as z.infer<typeof createLandingPromoSchema>))
  }),
)
adminLandingPromoRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: landingPromoIdParamSchema, body: updateLandingPromoSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await service.update(req.params.id, req.body as z.infer<typeof updateLandingPromoSchema>))
  }),
)
adminLandingPromoRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: landingPromoIdParamSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    await service.remove(req.params.id)
    res.status(204).end()
  }),
)
