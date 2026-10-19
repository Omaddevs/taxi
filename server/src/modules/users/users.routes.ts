import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import { validate } from '../../middleware/validate.js'
import * as usersController from './users.controller.js'
import { phoneClaimTokenSchema, startPhoneClaimSchema, updateMeSchema } from './users.schema.js'
import * as phoneClaims from './phoneClaim.service.js'
import { listUsersQuerySchema, setVerifiedSchema, userIdParamSchema } from './admin.schema.js'

export const usersRouter = Router()

usersRouter.get('/me', requireAuth, asyncRoute(usersController.getMe))
usersRouter.patch('/me', requireAuth, validate({ body: updateMeSchema }), asyncRoute(usersController.updateMe))
// Add / change the phone: proven in @taxiline_kirish_bot, see phoneClaim.service.
usersRouter.post(
  '/me/phone',
  requireAuth,
  rateLimit(60, 10 * 60_000),
  validate({ body: startPhoneClaimSchema }),
  asyncRoute(async (req, res) => {
    res.json(await phoneClaims.startPhoneClaim(req.user!.id, req.body.phone))
  }),
)
usersRouter.get('/me/phone/:token', requireAuth, validate({ params: phoneClaimTokenSchema }), (req, res) => {
  res.json(phoneClaims.phoneClaimStatus(req.user!.id, req.params.token))
})

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
