import type { Request, Response } from 'express'
import * as bookingsService from './bookings.service.js'
import type { z } from 'zod'
import type { listBookingsAdminQuerySchema, listBookingsQuerySchema } from './bookings.schema.js'

export async function createBooking(req: Request, res: Response) {
  const booking = await bookingsService.createBooking(req.user!.id, req.body)
  res.status(201).json(booking)
}

export async function getBooking(req: Request, res: Response) {
  const booking = await bookingsService.getBooking(req.params.id, req.user!.id, req.user!.role)
  res.json(booking)
}

export async function listBookings(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listBookingsQuerySchema>
  const bookings = await bookingsService.listBookings(req.user!.id, query)
  res.json(bookings)
}

export async function listAllBookingsAdmin(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listBookingsAdminQuerySchema>
  res.json(await bookingsService.listAllBookingsAdmin(query))
}

export async function adminCancelBooking(req: Request, res: Response) {
  const booking = await bookingsService.adminCancelBooking(req.params.id, req.user!.id, req.body.reason)
  res.json(booking)
}

export async function acceptBooking(req: Request, res: Response) {
  const booking = await bookingsService.acceptBooking(req.params.id, req.user!.id)
  res.json(booking)
}

export async function rejectBooking(req: Request, res: Response) {
  const booking = await bookingsService.rejectBooking(req.params.id, req.user!.id)
  res.json(booking)
}

export async function startBooking(req: Request, res: Response) {
  const booking = await bookingsService.startBooking(req.params.id, req.user!.id)
  res.json(booking)
}

export async function completeBooking(req: Request, res: Response) {
  const booking = await bookingsService.completeBooking(req.params.id, req.user!.id)
  res.json(booking)
}

export async function cancelBooking(req: Request, res: Response) {
  const booking = await bookingsService.cancelBooking(req.params.id, req.user!.id, req.body.reason)
  res.json(booking)
}

export async function getBookingRatingStatus(req: Request, res: Response) {
  res.json(await bookingsService.getBookingRatingStatus(req.params.id, req.user!.id))
}

export async function rateBooking(req: Request, res: Response) {
  await bookingsService.rateBooking(req.params.id, req.user!.id, req.body)
  res.json({ ok: true })
}
