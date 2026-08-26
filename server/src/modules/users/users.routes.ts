import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as usersController from './users.controller.js'
import { updateMeSchema } from './users.schema.js'
import { listUsersQuerySchema, setVerifiedSchema, userIdParamSchema } from './admin.schema.js'

export const usersRouter = Router()

usersRouter.get('/me', requireAuth, asyncRoute(usersController.getMe))
usersRouter.patch('/me', requireAuth, validate({ body: updateMeSchema }), asyncRoute(usersController.updateMe))

export const adminUsersRouter = Router()

adminUsersRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listUsersQuerySchema }),
  asyncRoute(usersController.listUsers),
)
adminUsersRouter.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: userIdParamSchema }),
  asyncRoute(usersController.getUserById),
)
adminUsersRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: userIdParamSchema, body: setVerifiedSchema }),
  asyncRoute(usersController.setVerified),
)
