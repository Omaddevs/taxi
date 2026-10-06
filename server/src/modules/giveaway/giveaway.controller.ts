import type { Request, Response } from 'express'
import type { z } from 'zod'
import * as giveawayService from './giveaway.service.js'
import type { drawSchema, listEntriesQuerySchema, updateSettingsSchema } from './giveaway.schema.js'

// Public (landing page)
export async function getPublic(_req: Request, res: Response) {
  res.json(await giveawayService.getPublicSettings())
}

export async function createEntry(req: Request, res: Response) {
  res.status(201).json(await giveawayService.createEntry(req.body))
}

export async function entryStatus(req: Request, res: Response) {
  res.json(await giveawayService.getEntryStatus(req.params.token))
}

export async function recheckEntry(req: Request, res: Response) {
  res.json(await giveawayService.recheckByToken(req.params.token))
}

// Bot
export async function botLink(req: Request, res: Response) {
  res.json(await giveawayService.linkFromBot(req.body))
}

export async function botRecheck(req: Request, res: Response) {
  res.json(await giveawayService.recheckFromBot(req.body.telegramId))
}

// Admin
export async function overview(_req: Request, res: Response) {
  res.json(await giveawayService.adminOverview())
}

export async function updateSettings(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateSettingsSchema>
  res.json(await giveawayService.updateSettings(body, req.user!.id))
}

export async function listEntries(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listEntriesQuerySchema>
  res.json(await giveawayService.listEntries(query))
}

export async function checkEntries(req: Request, res: Response) {
  res.json(await giveawayService.checkMany(req.body.ids, req.user!.id))
}

export async function draw(req: Request, res: Response) {
  const body = req.body as z.infer<typeof drawSchema>
  res.status(201).json(await giveawayService.draw(body, req.user!.id))
}

export async function listDraws(_req: Request, res: Response) {
  res.json(await giveawayService.listDraws())
}

export async function updateWinner(req: Request, res: Response) {
  res.json(await giveawayService.setWinnerPaid(req.params.id, req.body.paid, req.user!.id))
}

export async function deleteEntry(req: Request, res: Response) {
  await giveawayService.deleteEntry(req.params.id, req.user!.id)
  res.status(204).end()
}
