import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as paymentsController from './payments.controller.js'
import { chargeSchema } from './payments.schema.js'

export const paymentsRouter = Router()

paymentsRouter.post('/charge', requireAuth, validate({ body: chargeSchema }), asyncRoute(paymentsController.charge))
