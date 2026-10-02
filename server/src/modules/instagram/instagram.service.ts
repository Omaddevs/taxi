import { createHmac, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { decryptSecret, encryptSecret } from '../../lib/crypto.js'
import { normalizePhone } from '../../lib/otp.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import type { JwtRole } from '../../lib/jwt.js'
import { pickLeadOwner } from '../leads/leads.service.js'

const GRAPH_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`
const OAUTH_SCOPES = 'instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata,leads_retrieval,pages_messaging'

export function isConfigured(): boolean {
  return Boolean(env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET && env.INSTAGRAM_REDIRECT_URI && env.INSTAGRAM_TOKEN_ENC_KEY)
}

export function getAdminRedirectBase(): string {
  return (env.ADMIN_PANEL_URL || env.CORS_ORIGINS[0] || '').replace(/\/$/, '')
}

// --- Webhook verification (GET handshake + POST signature) -----------------------------------

export function verifyWebhookChallenge(mode?: string, token?: string, challenge?: string): string | null {
  if (mode === 'subscribe' && token && challenge && env.INSTAGRAM_VERIFY_TOKEN && token === env.INSTAGRAM_VERIFY_TOKEN) {
    return challenge
  }
  return null
}

export function verifySignature(rawBody: Buffer | undefined, signatureHeader: string | undefined): boolean {
  if (!env.INSTAGRAM_APP_SECRET || !rawBody || !signatureHeader) return false
  const expected = `sha256=${createHmac('sha256', env.INSTAGRAM_APP_SECRET).update(rawBody).digest('hex')}`
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(signatureHeader)
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}

// --- Inbound event handling --------------------------------------------------------------------

async function getConnectedAccount() {
  return prisma.instagramAccount.findFirst()
}

async function fetchIgUsername(pageAccessTokenEnc: string, igUserId: string): Promise<string | undefined> {
  try {
    const token = decryptSecret(pageAccessTokenEnc)
    const res = await fetch(`${GRAPH_BASE}/${igUserId}?fields=username&access_token=${encodeURIComponent(token)}`)
    if (!res.ok) return undefined
    const json = (await res.json()) as { username?: string }
    return json.username
  } catch {
    return undefined
  }
}

async function handleMessagingEvent(account: { pageAccessTokenEnc: string }, item: any) {
  const senderId: string | undefined = item?.sender?.id
  const text: string | undefined = item?.message?.text
  const mid: string | undefined = item?.message?.mid
  if (!senderId || !text || item?.message?.is_echo) return

  if (mid) {
    const dup = await prisma.leadMessage.findUnique({ where: { igMessageId: mid } })
    if (dup) return
  }

  let lead = await prisma.lead.findUnique({ where: { igUserId: senderId } })
  if (!lead) {
    const [ownerId, igUsername] = await Promise.all([pickLeadOwner(), fetchIgUsername(account.pageAccessTokenEnc, senderId)])
    lead = await prisma.lead.create({
      data: {
        igUserId: senderId,
        igUsername,
        name: igUsername,
        channel: 'INSTAGRAM_DM',
        leadType: 'PASSENGER',
        note: 'Instagram Direct orqali yozdi',
        ownerId,
      },
    })
  }

  await prisma.leadMessage.create({ data: { leadId: lead.id, direction: 'IN', body: text, igMessageId: mid } })
}

async function handleLeadgenEvent(account: { pageAccessTokenEnc: string }, leadgenId: string) {
  const existing = await prisma.lead.findUnique({ where: { externalId: leadgenId } })
  if (existing) return

  const token = decryptSecret(account.pageAccessTokenEnc)
  const res = await fetch(`${GRAPH_BASE}/${leadgenId}?access_token=${encodeURIComponent(token)}`)
  if (!res.ok) {
    console.error('[instagram] failed to fetch lead', leadgenId, await res.text().catch(() => ''))
    return
  }
  const data = (await res.json()) as {
    field_data?: { name: string; values?: string[] }[]
    ad_name?: string
    form_name?: string
  }
  const fields = data.field_data ?? []
  const get = (key: string) => fields.find((f) => f.name?.toLowerCase() === key)?.values?.[0]
  const name = get('full_name') ?? get('name')
  const phoneRaw = get('phone_number') ?? get('phone')
  const isDriver = fields.some((f) => f.values?.some((v) => /haydovchi|driver/i.test(v)))

  const ownerId = await pickLeadOwner()
  await prisma.lead.create({
    data: {
      externalId: leadgenId,
      name,
      phone: phoneRaw ? normalizePhone(phoneRaw) : undefined,
      channel: 'INSTAGRAM_LEAD_AD',
      leadType: isDriver ? 'DRIVER' : 'PASSENGER',
      adName: data.ad_name,
      formName: data.form_name,
      note: 'Instagram lead-forma orqali',
      ownerId,
    },
  })
}

export async function handleWebhookEvent(payload: any): Promise<void> {
  const account = await getConnectedAccount()
  if (!account) return

  const entries = payload?.entry ?? []
  for (const entry of entries) {
    if (payload.object === 'instagram') {
      for (const item of entry.messaging ?? []) {
        await handleMessagingEvent(account, item).catch((err) => console.error('[instagram] messaging event failed', err))
      }
    } else if (payload.object === 'page') {
      for (const change of entry.changes ?? []) {
        const leadgenId = change?.field === 'leadgen' ? change.value?.leadgen_id : undefined
        if (leadgenId) {
          await handleLeadgenEvent(account, String(leadgenId)).catch((err) => console.error('[instagram] leadgen event failed', err))
        }
      }
    }
  }
}

// --- OAuth connect / disconnect ------------------------------------------------------------------

export function buildOAuthUrl(adminId: string): string {
  if (!isConfigured()) throw new ValidationError('Instagram integratsiyasi hali sozlanmagan')
  const state = jwt.sign({ sub: adminId, purpose: 'instagram_oauth' }, env.JWT_ACCESS_SECRET, { expiresIn: '10m' })
  const params = new URLSearchParams({
    client_id: env.INSTAGRAM_APP_ID,
    redirect_uri: env.INSTAGRAM_REDIRECT_URI,
    scope: OAUTH_SCOPES,
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`
}

export async function exchangeCodeForAccount(code: string, state: string): Promise<{ igUsername: string }> {
  if (!isConfigured()) throw new ValidationError('Instagram integratsiyasi hali sozlanmagan')

  let payload: { sub: string }
  try {
    payload = jwt.verify(state, env.JWT_ACCESS_SECRET) as { sub: string }
  } catch {
    throw new ValidationError('Ulanish so‘rovi eskirgan, qaytadan urinib ko‘ring')
  }

  const tokenRes = await fetch(
    `${GRAPH_BASE}/oauth/access_token?${new URLSearchParams({
      client_id: env.INSTAGRAM_APP_ID,
      client_secret: env.INSTAGRAM_APP_SECRET,
      redirect_uri: env.INSTAGRAM_REDIRECT_URI,
      code,
    })}`,
  )
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: { message?: string } }
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new ValidationError(tokenJson?.error?.message || 'Instagram token almashinuvi muvaffaqiyatsiz tugadi')
  }

  const longLivedRes = await fetch(
    `${GRAPH_BASE}/oauth/access_token?${new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: env.INSTAGRAM_APP_ID,
      client_secret: env.INSTAGRAM_APP_SECRET,
      fb_exchange_token: tokenJson.access_token,
    })}`,
  )
  const longLivedJson = (await longLivedRes.json().catch(() => ({}))) as { access_token?: string }
  const userToken = longLivedJson.access_token ?? tokenJson.access_token

  const pagesRes = await fetch(`${GRAPH_BASE}/me/accounts?access_token=${encodeURIComponent(userToken)}`)
  const pagesJson = (await pagesRes.json()) as { data?: { id: string; access_token?: string }[] }
  const page = pagesJson?.data?.[0]
  if (!page) throw new ValidationError('Facebook sahifasi topilmadi — Instagram akkaunt sahifaga ulanganligini tekshiring')

  const pageDetailRes = await fetch(
    `${GRAPH_BASE}/${page.id}?fields=instagram_business_account{id,username},access_token&access_token=${encodeURIComponent(userToken)}`,
  )
  const pageDetail = (await pageDetailRes.json()) as {
    instagram_business_account?: { id: string; username: string }
    access_token?: string
  }
  const igAccount = pageDetail?.instagram_business_account
  if (!igAccount) throw new ValidationError('Bu Facebook sahifasiga Instagram Professional akkaunt ulanmagan')

  const pageAccessToken = pageDetail.access_token ?? page.access_token
  if (!pageAccessToken) throw new ValidationError('Sahifa uchun access token olinmadi')

  await fetch(
    `${GRAPH_BASE}/${page.id}/subscribed_apps?subscribed_fields=messages,leadgen&access_token=${encodeURIComponent(pageAccessToken)}`,
    { method: 'POST' },
  ).catch(() => {})

  // Single-account MVP — replace whatever was connected before.
  await prisma.instagramAccount.deleteMany({})
  const account = await prisma.instagramAccount.create({
    data: {
      igBusinessId: igAccount.id,
      igUsername: igAccount.username,
      pageId: page.id,
      pageAccessTokenEnc: encryptSecret(pageAccessToken),
      status: 'CONNECTED',
      connectedById: payload.sub,
    },
  })
  return { igUsername: account.igUsername }
}

export async function disconnect(): Promise<void> {
  const account = await prisma.instagramAccount.findFirst()
  if (!account) return
  const token = decryptSecret(account.pageAccessTokenEnc)
  await fetch(`${GRAPH_BASE}/${account.pageId}/subscribed_apps?access_token=${encodeURIComponent(token)}`, {
    method: 'DELETE',
  }).catch(() => {})
  await prisma.instagramAccount.delete({ where: { id: account.id } })
}

export async function getStatus(): Promise<{
  configured: boolean
  connected: boolean
  igUsername?: string
  pageId?: string
  connectedAt?: string
  connectedByName?: string
}> {
  const configured = isConfigured()
  const account = await prisma.instagramAccount.findFirst({ include: { connectedBy: { select: { name: true, phone: true } } } })
  if (!account) return { configured, connected: false }
  return {
    configured,
    connected: true,
    igUsername: account.igUsername,
    pageId: account.pageId,
    connectedAt: account.connectedAt.toISOString(),
    connectedByName: account.connectedBy?.name ?? account.connectedBy?.phone,
  }
}

// --- Lead message thread (used by the CRM reply box) --------------------------------------------

async function ownedLead(leadId: string, actorRole: JwtRole, actorId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) throw new NotFoundError('Lid topilmadi')
  if (actorRole !== 'ADMIN' && lead.ownerId !== actorId) throw new ForbiddenError('Bu lid sizga tegishli emas')
  return lead
}

export async function listMessages(leadId: string, actorRole: JwtRole, actorId: string) {
  await ownedLead(leadId, actorRole, actorId)
  return prisma.leadMessage.findMany({ where: { leadId }, orderBy: { createdAt: 'asc' } })
}

export async function sendReply(leadId: string, actorRole: JwtRole, actorId: string, body: string) {
  const lead = await ownedLead(leadId, actorRole, actorId)
  if (lead.channel !== 'INSTAGRAM_DM' || !lead.igUserId) {
    throw new ValidationError('Bu lidga faqat Instagram Direct orqali yozish mumkin')
  }
  const account = await prisma.instagramAccount.findFirst()
  if (!account) throw new ValidationError('Instagram akkaunt ulanmagan')

  const token = decryptSecret(account.pageAccessTokenEnc)
  const res = await fetch(`${GRAPH_BASE}/me/messages?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: lead.igUserId }, message: { text: body } }),
  })
  const json = (await res.json().catch(() => ({}))) as { message_id?: string; error?: { message?: string } }
  if (!res.ok) throw new ValidationError(json?.error?.message || 'Instagram xabarini yuborib bo‘lmadi')

  return prisma.leadMessage.create({
    data: { leadId: lead.id, direction: 'OUT', body, igMessageId: json.message_id },
  })
}
