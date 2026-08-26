import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as notificationsController from './notifications.controller.js'
import { notificationIdParamSchema } from './notifications.schema.js'

export const notificationsRouter = Router()

notificationsRouter.get('/', requireAuth, asyncRoute(notificationsController.listNotifications))
notificationsRouter.patch('/read-all', requireAuth, asyncRoute(notificationsController.markAllRead))
notificationsRouter.patch(
  '/:id/read',
  requireAuth,
  validate({ params: notificationIdParamSchema }),
  asyncRoute(notificationsController.markRead),
)
