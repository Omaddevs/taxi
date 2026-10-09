import { prisma } from '../../lib/prisma.js'
import { writeAudit } from '../../lib/audit.js'
import { mailerConfigured, mailerFrom, sendEmail, verifyMailer } from '../../lib/mailer.js'
import { NotFoundError, ValidationError } from '../../errors/AppError.js'

const MAX_BULK = 1000
const CONCURRENCY = 3

export async function emailStatus() {
  if (!mailerConfigured()) return { configured: false as const, from: null, ok: false, error: null }
  try {
    await verifyMailer()
    return { configured: true as const, from: mailerFrom(), ok: true, error: null }
  } catch (err) {
    return { configured: true as const, from: mailerFrom(), ok: false, error: (err as Error).message }
  }
}

export async function emailPerson(id: string, subject: string, message: string, actorId?: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { email: true, name: true, deletedAt: true, staffKind: true } })
  if (!user || user.deletedAt || user.staffKind) throw new NotFoundError('Foydalanuvchi topilmadi')
  if (!user.email) throw new ValidationError('Bu foydalanuvchining emaili yo‘q')
  await sendEmail(user.email, subject, message, user.name)
  await writeAudit({ actorId, action: 'PERSON_EMAILED', targetType: 'User', targetId: id, meta: { subject } })
  return { sent: 1 }
}

export type EmailAudience = 'google' | 'with_email' | 'selected'

export async function audienceCount(audience: EmailAudience, ids?: string[]) {
  return prisma.user.count({ where: audienceWhere(audience, ids) })
}

function audienceWhere(audience: EmailAudience, ids?: string[]) {
  return {
    staffKind: null,
    deletedAt: null,
    email: { not: null },
    ...(audience === 'google' ? { googleId: { not: null } } : {}),
    ...(audience === 'selected' ? { id: { in: ids ?? [] } } : {}),
  }
}

/** Sends one personalised email per recipient (a few at a time); failures are counted, not fatal. */
export async function emailBroadcast(audience: EmailAudience, subject: string, message: string, ids: string[] | undefined, actorId?: string) {
  const recipients = await prisma.user.findMany({
    where: audienceWhere(audience, ids),
    select: { id: true, email: true, name: true },
    take: MAX_BULK,
    orderBy: { createdAt: 'desc' },
  })
  if (!recipients.length) throw new ValidationError('Emaili bor foydalanuvchi topilmadi')

  let sent = 0
  const failed: { id: string; email: string; error: string }[] = []
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    await Promise.all(
      recipients.slice(i, i + CONCURRENCY).map(async (r) => {
        try {
          await sendEmail(r.email!, subject, message, r.name)
          sent += 1
        } catch (err) {
          failed.push({ id: r.id, email: r.email!, error: (err as Error).message.slice(0, 160) })
        }
      }),
    )
  }
  await writeAudit({ actorId, action: 'PEOPLE_EMAIL_BROADCAST', targetType: 'User', meta: { audience, subject, sent, failed: failed.length } })
  return { total: recipients.length, sent, failed: failed.length, failures: failed.slice(0, 20) }
}
