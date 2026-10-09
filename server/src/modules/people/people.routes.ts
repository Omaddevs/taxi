import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as peopleController from './people.controller.js'
import {
  createPersonSchema,
  emailAudienceQuerySchema,
  emailBroadcastSchema,
  emailPersonSchema,
  listPeopleQuerySchema,
  personIdParamSchema,
  updatePersonSchema,
} from './people.schema.js'

const viewers = ['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'] as const

export const adminPeopleRouter = Router()

// Email to users — registered before '/:id' so "email" isn't taken for an id.
adminPeopleRouter.get('/email/status', requireAuth, requireRole('ADMIN'), asyncRoute(peopleController.emailStatus))
adminPeopleRouter.get(
  '/email/audience',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: emailAudienceQuerySchema }),
  asyncRoute(peopleController.emailAudience),
)
adminPeopleRouter.post(
  '/email',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: emailBroadcastSchema }),
  asyncRoute(peopleController.emailBroadcast),
)
adminPeopleRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'),
  validate({ body: createPersonSchema }),
  asyncRoute(peopleController.createPerson),
)

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

adminPeopleRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: personIdParamSchema }),
  asyncRoute(peopleController.deletePerson),
)
adminPeopleRouter.post(
  '/:id/email',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'),
  validate({ params: personIdParamSchema, body: emailPersonSchema }),
  asyncRoute(peopleController.emailPerson),
)
