import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import { requireBotSecret } from '../bot/bot.middleware.js'
import * as giveawayController from './giveaway.controller.js'
import {
  botLinkSchema,
  botRecheckSchema,
  checkEntriesSchema,
  createEntrySchema,
  drawSchema,
  entryTokenParamSchema,
  idParamSchema,
  listEntriesQuerySchema,
  updateSettingsSchema,
  updateWinnerSchema,
} from './giveaway.schema.js'

export const giveawayRouter = Router()

giveawayRouter.get('/', asyncRoute(giveawayController.getPublic))
giveawayRouter.post(
  '/entries',
  // Mobile carriers put many subscribers behind one IP, so the cap is generous.
  rateLimit(30, 10 * 60_000),
  validate({ body: createEntrySchema }),
  asyncRoute(giveawayController.createEntry),
)
giveawayRouter.get('/entries/:token', validate({ params: entryTokenParamSchema }), asyncRoute(giveawayController.entryStatus))
giveawayRouter.post(
  '/entries/:token/recheck',
  rateLimit(120, 10 * 60_000),
  validate({ params: entryTokenParamSchema }),
  asyncRoute(giveawayController.recheckEntry),
)

// Internal — taxiline-bot only.
export const botGiveawayRouter = Router()
botGiveawayRouter.use(requireBotSecret)
botGiveawayRouter.post('/link', validate({ body: botLinkSchema }), asyncRoute(giveawayController.botLink))
botGiveawayRouter.post('/recheck', validate({ body: botRecheckSchema }), asyncRoute(giveawayController.botRecheck))

export const adminGiveawayRouter = Router()
adminGiveawayRouter.use(requireAuth, requireRole('ADMIN'))
adminGiveawayRouter.get('/', asyncRoute(giveawayController.overview))
adminGiveawayRouter.patch('/settings', validate({ body: updateSettingsSchema }), asyncRoute(giveawayController.updateSettings))
adminGiveawayRouter.get('/entries', validate({ query: listEntriesQuerySchema }), asyncRoute(giveawayController.listEntries))
adminGiveawayRouter.post('/entries/check', validate({ body: checkEntriesSchema }), asyncRoute(giveawayController.checkEntries))
adminGiveawayRouter.delete('/entries/:id', validate({ params: idParamSchema }), asyncRoute(giveawayController.deleteEntry))
adminGiveawayRouter.post('/draws', validate({ body: drawSchema }), asyncRoute(giveawayController.draw))
adminGiveawayRouter.get('/draws', asyncRoute(giveawayController.listDraws))
adminGiveawayRouter.patch(
  '/winners/:id',
  validate({ params: idParamSchema, body: updateWinnerSchema }),
  asyncRoute(giveawayController.updateWinner),
)
