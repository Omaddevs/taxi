import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as instagramController from './instagram.controller.js'
import { leadIdParamSchema, sendLeadMessageSchema } from '../leads/leads.schema.js'

// Public — hit directly by Meta, no bearer token. GET is the webhook handshake, POST delivers
// DM/leadgen events (authenticated via X-Hub-Signature-256 instead, see instagram.service).
export const instagramWebhookRouter = Router()
instagramWebhookRouter.get('/', instagramController.webhookVerify)
instagramWebhookRouter.post('/', asyncRoute(instagramController.webhookReceive))

export const adminInstagramRouter = Router()
adminInstagramRouter.get('/', requireAuth, requireRole('ADMIN'), asyncRoute(instagramController.getStatus))
adminInstagramRouter.get('/oauth-url', requireAuth, requireRole('ADMIN'), instagramController.getOauthUrl)
// Meta redirects the admin's browser here after the OAuth dialog — no Authorization header on a
// top-level navigation, so the signed `state` param carries the admin's identity instead.
adminInstagramRouter.get('/callback', asyncRoute(instagramController.oauthCallback))
adminInstagramRouter.delete('/', requireAuth, requireRole('ADMIN'), asyncRoute(instagramController.disconnect))

// Mounted on the same `/admin/leads` prefix as leads.routes.ts (Express stacks routers fine) —
// kept here instead of the leads module so leads.service never has to import instagram.service.
export const adminLeadMessagesRouter = Router()
adminLeadMessagesRouter.get(
  '/:id/messages',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR'),
  validate({ params: leadIdParamSchema }),
  asyncRoute(instagramController.listLeadMessages),
)
adminLeadMessagesRouter.post(
  '/:id/messages',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR'),
  validate({ params: leadIdParamSchema, body: sendLeadMessageSchema }),
  asyncRoute(instagramController.sendLeadMessage),
)
