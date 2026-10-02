import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as walletController from './wallet.controller.js'
import {
  addCardSchema,
  adjustBalanceSchema,
  cardIdParamSchema,
  listAdminTransactionsQuerySchema,
  listTransactionsQuerySchema,
  payoutSchema,
  topupSchema,
} from './wallet.schema.js'

export const walletRouter = Router()

walletRouter.get('/', requireAuth, asyncRoute(walletController.getWallet))
walletRouter.get(
  '/transactions',
  requireAuth,
  validate({ query: listTransactionsQuerySchema }),
  asyncRoute(walletController.listTransactions),
)
walletRouter.post('/topup', requireAuth, validate({ body: topupSchema }), asyncRoute(walletController.topup))
walletRouter.post('/payout', requireAuth, validate({ body: payoutSchema }), asyncRoute(walletController.payout))
walletRouter.get('/cards', requireAuth, asyncRoute(walletController.listCards))
walletRouter.post('/cards', requireAuth, validate({ body: addCardSchema }), asyncRoute(walletController.addCard))
walletRouter.delete(
  '/cards/:id',
  requireAuth,
  validate({ params: cardIdParamSchema }),
  asyncRoute(walletController.deleteCard),
)

export const adminWalletRouter = Router()

adminWalletRouter.get(
  '/transactions',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listAdminTransactionsQuerySchema }),
  asyncRoute(walletController.listAllTransactions),
)
adminWalletRouter.post(
  '/adjust',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: adjustBalanceSchema }),
  asyncRoute(walletController.adjustBalance),
)
