import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as peopleController from './people.controller.js'
import { listPeopleQuerySchema, personIdParamSchema, updatePersonSchema } from './people.schema.js'

const viewers = ['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'] as const

export const adminPeopleRouter = Router()

adminPeopleRouter.get(
  '/',
  requireAuth,
  requireRole(...viewers),
  validate({ query: listPeopleQuerySchema }),
  asyncRoute(peopleController.listPeople),
)
adminPeopleRouter.get(
  '/:id',
  requireAuth,
  requireRole(...viewers),
  validate({ params: personIdParamSchema }),
  asyncRoute(peopleController.getPerson),
)
adminPeopleRouter.patch(
  '/:id',
  requireAuth,
  requireRole(...viewers),
  validate({ params: personIdParamSchema, body: updatePersonSchema }),
  asyncRoute(peopleController.updatePerson),
)
