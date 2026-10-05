import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { prisma } from './prisma.js'
import { normalizePhone } from './otp.js'

// Makes sure the admin account from ADMIN_PHONE / ADMIN_PASSWORD (.env) exists and can log in
// to the admin panel, so a fresh deploy doesn't need the manual bootstrapAdmin step. The
// password is only re-hashed when it no longer matches, so restarts are no-ops. An existing
// user with that phone (e.g. the owner's own driver/passenger account) keeps its role and data
// and just gains admin-panel access.
export async function ensureAdminFromEnv(): Promise<void> {
  if (!env.ADMIN_PHONE || !env.ADMIN_PASSWORD) return

  const phone = normalizePhone(env.ADMIN_PHONE)
  const existing = await prisma.user.findUnique({ where: { phone } })
  const passwordOk = existing?.passwordHash ? await bcrypt.compare(env.ADMIN_PASSWORD, existing.passwordHash) : false
  const passwordHash = passwordOk ? existing!.passwordHash! : await bcrypt.hash(env.ADMIN_PASSWORD, 10)

  if (existing && passwordOk && existing.staffKind === 'ADMIN' && existing.staffActive && existing.verified) return

  await prisma.user.upsert({
    where: { phone },
    update: { passwordHash, verified: true, staffKind: 'ADMIN', staffActive: true },
    create: { phone, role: 'PASSENGER', passwordHash, verified: true, staffKind: 'ADMIN', staffActive: true },
  })
  console.log(`Admin account ready: ${phone}`)
}
