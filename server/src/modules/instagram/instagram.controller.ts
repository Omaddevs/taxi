import type { Request, Response } from 'express'
import * as instagramService from './instagram.service.js'

export function webhookVerify(req: Request, res: Response) {
  const mode = req.query['hub.mode'] as string | undefined
  const token = req.query['hub.verify_token'] as string | undefined
  const challenge = req.query['hub.challenge'] as string | undefined
  const result = instagramService.verifyWebhookChallenge(mode, token, challenge)
  if (result === null) {
    res.status(403).end()
    return
  }
  res.status(200).send(result)
}

export async function webhookReceive(req: Request, res: Response) {
  const signature = req.headers['x-hub-signature-256'] as string | undefined
  if (!instagramService.verifySignature(req.rawBody, signature)) {
    res.status(401).end()
    return
  }
  // Ack immediately — Meta retries aggressively on anything but a fast 2xx, and the actual
  // lead/DM processing (including outbound Graph API calls) shouldn't hold up the response.
  res.status(200).end()
  await instagramService.handleWebhookEvent(req.body).catch((err) => console.error('[instagram] webhook handling failed', err))
}

export async function getStatus(_req: Request, res: Response) {
  res.json(await instagramService.getStatus())
}

export function getOauthUrl(req: Request, res: Response) {
  res.json({ url: instagramService.buildOAuthUrl(req.user!.id) })
}

export async function oauthCallback(req: Request, res: Response) {
  const { code, state, error, error_description: errorDescription } = req.query as Record<string, string | undefined>
  const base = instagramService.getAdminRedirectBase()

  if (error || !code || !state) {
    res.redirect(`${base}/integrations?instagram=error&message=${encodeURIComponent(errorDescription || error || 'Bekor qilindi')}`)
    return
  }

  try {
    await instagramService.exchangeCodeForAccount(code, state)
    res.redirect(`${base}/integrations?instagram=connected`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ulanishda xatolik'
    res.redirect(`${base}/integrations?instagram=error&message=${encodeURIComponent(message)}`)
  }
}

export async function disconnect(_req: Request, res: Response) {
  await instagramService.disconnect()
  res.status(204).end()
}

export async function listLeadMessages(req: Request, res: Response) {
  res.json(await instagramService.listMessages(req.params.id, req.user!.role, req.user!.id))
}

export async function sendLeadMessage(req: Request, res: Response) {
  const { body } = req.body as { body: string }
  res.status(201).json(await instagramService.sendReply(req.params.id, req.user!.role, req.user!.id, body))
}
