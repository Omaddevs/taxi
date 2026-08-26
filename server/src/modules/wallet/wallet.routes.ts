import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as walletController from './wallet.controller.js'
import { addCardSchema, cardIdParamSchema, listTransactionsQuerySchema, topupSchema } from './wallet.schema.js'

export const walletRouter = Router()

walletRouter.get('/', requireAuth, asyncRoute(walletController.getWallet))
walletRouter.get(
  '/transactions',
  requireAuth,
  validate({ query: listTransactionsQuerySchema }),
  asyncRoute(walletController.listTransactions),
)
walletRouter.post('/topup', requireAuth, validate({ body: topupSchema }), asyncRoute(walletController.topup))
walletRouter.get('/cards', requireAuth, asyncRoute(walletController.listCards))
walletRouter.post('/cards', requireAuth, validate({ body: addCardSchema }), asyncRoute(walletController.addCard))
walletRouter.delete(
  '/cards/:id',
  requireAuth,
  validate({ params: cardIdParamSchema }),
  asyncRoute(walletController.deleteCard),
)
