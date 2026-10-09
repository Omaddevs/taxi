import { PhoneRequiredError } from '../errors/AppError.js'
import { prisma } from './prisma.js'

/** The account's phone, or PHONE_REQUIRED for a Google sign-up that hasn't added one yet. */
export async function requireUserPhone(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } })
  if (!user?.phone) throw new PhoneRequiredError()
  return user.phone
}
