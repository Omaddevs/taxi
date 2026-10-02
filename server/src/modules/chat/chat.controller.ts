import type { Request, Response } from 'express'
import * as chatService from './chat.service.js'
import type { z } from 'zod'
import type { listMessagesQuerySchema } from './chat.schema.js'

export async function listConversations(req: Request, res: Response) {
  const conversations = await chatService.listConversations(req.user!.id)
  res.json(conversations)
}

export async function getConversation(req: Request, res: Response) {
  const conversation = await chatService.getConversation(req.params.id, req.user!.id)
  res.json(conversation)
}

export async function listMessages(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listMessagesQuerySchema>
  const messages = await chatService.listMessages(req.params.id, req.user!.id, query.cursor, query.limit)
  res.json(messages)
}

export async function sendMessage(req: Request, res: Response) {
  const message = await chatService.sendMessage(req.params.id, req.user!.id, req.body)
  res.status(201).json(message)
}

export async function markRead(req: Request, res: Response) {
  await chatService.markRead(req.params.id, req.user!.id)
  res.status(204).end()
}
