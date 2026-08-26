import type { Request, Response } from 'express'
import * as paymentsService from './payments.service.js'

export async function charge(req: Request, res: Response) {
  const transaction = await paymentsService.chargeForBooking(req.user!.id, req.body.bookingId, req.body.methodId)
  res.status(201).json(transaction)
}
