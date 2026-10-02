import type { Request, Response } from 'express'
import * as walletService from './wallet.service.js'
import type { z } from 'zod'
import type { listAdminTransactionsQuerySchema, listTransactionsQuerySchema } from './wallet.schema.js'

export async function getWallet(req: Request, res: Response) {
  const wallet = await walletService.getWallet(req.user!.id)
  res.json(wallet)
}

export async function listTransactions(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listTransactionsQuerySchema>
  const transactions = await walletService.listTransactions(req.user!.id, query.cursor, query.limit)
  res.json(transactions)
}

export async function topup(req: Request, res: Response) {
  const transaction = await walletService.topup(req.user!.id, req.body.amount, req.body.methodId)
  res.status(201).json(transaction)
}

export async function payout(req: Request, res: Response) {
  const transaction = await walletService.payout(req.user!.id, req.body.amount, req.body.cardId)
  res.status(201).json(transaction)
}

export async function listCards(req: Request, res: Response) {
  const cards = await walletService.listCards(req.user!.id)
  res.json(cards)
}

export async function addCard(req: Request, res: Response) {
  const card = await walletService.addCard(req.user!.id, req.body)
  res.status(201).json(card)
}

export async function deleteCard(req: Request, res: Response) {
  await walletService.deleteCard(req.user!.id, req.params.id)
  res.status(204).end()
}

export async function listAllTransactions(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listAdminTransactionsQuerySchema>
  res.json(await walletService.listAllTransactions(query))
}

export async function adjustBalance(req: Request, res: Response) {
  const transaction = await walletService.adjustBalance(req.body.userId, req.body.amount, req.body.title)
  res.status(201).json(transaction)
}
