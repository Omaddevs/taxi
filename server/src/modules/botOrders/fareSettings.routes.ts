import { Router, type Request, type Response } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { previewFareSchema, updateFareSettingsSchema } from './fareSettings.schema.js'
import * as service from './fareSettings.service.js'

// Admin panel → "Yo‘l haqi tariflari": the rates behind the fare a passenger is suggested on the
// ride screen (POST /bot-orders/estimate reads them on every call, so a change applies at once).
export const adminFareSettingsRouter = Router()

adminFareSettingsRouter.use(requireAuth, requireRole('ADMIN'))

adminFareSettingsRouter.get(
  '/',
  asyncRoute(async (_req: Request, res: Response) => {
    res.json(await service.getFareSettings())
  }),
)
adminFareSettingsRouter.patch(
  '/',
  validate({ body: updateFareSettingsSchema }),
  asyncRoute(async (req: Request, res: Response) => {
    res.json(await service.updateFareSettings(req.body, req.user!.id))
  }),
)
adminFareSettingsRouter.post('/preview', validate({ body: previewFareSchema }), (req: Request, res: Response) => {
  res.json(service.previewFare(req.body))
})
