// One-time CLI script to create the first admin user.
// Usage: npm run bootstrap:admin -- --phone=+998901112233 --password=secret123 --secret=<ADMIN_BOOTSTRAP_SECRET>
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'
import { normalizePhone } from '../lib/otp.js'

function arg(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length)
}

async function main() {
  const phone = arg('phone')
  const password = arg('password')
  const secret = arg('secret')

  if (!phone || !password || !secret) {
    console.error('Usage: npm run bootstrap:admin -- --phone=+998901112233 --password=secret123 --secret=<ADMIN_BOOTSTRAP_SECRET>')
    process.exit(1)
  }

  if (secret !== env.ADMIN_BOOTSTRAP_SECRET) {
    console.error('Invalid bootstrap secret')
    process.exit(1)
  }

  const normalizedPhone = normalizePhone(phone)
  const passwordHash = await bcrypt.hash(password, 10)

  const admin = await prisma.user.upsert({
    where: { phone: normalizedPhone },
    update: { role: 'ADMIN', passwordHash, verified: true },
    create: { phone: normalizedPhone, role: 'ADMIN', passwordHash, verified: true },
  })

  console.log(`Admin ready: ${admin.phone} (id: ${admin.id})`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
