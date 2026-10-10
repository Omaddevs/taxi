import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as chatController from './chat.controller.js'
import { conversationIdParamSchema, listMessagesQuerySchema, openDirectSchema, sendMessageSchema } from './chat.schema.js'

export const chatRouter = Router()

chatRouter.get('/', requireAuth, asyncRoute(chatController.listConversations))
// "Haydovchiga yozish" — before '/:id' routes.
chatRouter.post('/direct', requireAuth, validate({ body: openDirectSchema }), asyncRoute(chatController.openDirect))
chatRouter.get(
  '/:id',
  requireAuth,
  validate({ params: conversationIdParamSchema }),
  asyncRoute(chatController.getConversation),
)
chatRouter.get(
  '/:id/messages',
  requireAuth,
  validate({ params: conversationIdParamSchema, query: listMessagesQuerySchema }),
  asyncRoute(chatController.listMessages),
)
chatRouter.post(
  '/:id/messages',
  requireAuth,
  validate({ params: conversationIdParamSchema, body: sendMessageSchema }),
  asyncRoute(chatController.sendMessage),
)
chatRouter.patch(
  '/:id/read',
  requireAuth,
  validate({ params: conversationIdParamSchema }),
  asyncRoute(chatController.markRead),
)
