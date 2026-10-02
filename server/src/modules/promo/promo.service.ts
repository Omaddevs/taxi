import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'

export async function validatePromo(code: string) {
  const promo = await prisma.promoCode.findUnique({ where: { code } })
  const now = new Date()

  if (!promo || !promo.active) return { valid: false, reason: 'Promo kod topilmadi' }
  if (promo.validFrom > now || promo.validUntil < now) return { valid: false, reason: 'Promo kod muddati o‘tgan' }
  if (promo.maxUses !== null && promo.usesCount >= promo.maxUses) {
    return { valid: false, reason: 'Promo kod limiti tugagan' }
  }

  return { valid: true, discountType: promo.discountType, discountValue: promo.discountValue }
}

// Codes a rider can use right now — same rules as validatePromo, minus the internals.
export async function listAvailablePromos() {
  const now = new Date()
  const promos = await prisma.promoCode.findMany({
    where: { active: true, validFrom: { lte: now }, validUntil: { gte: now } },
    orderBy: { validUntil: 'asc' },
  })
  return promos
    .filter((p) => p.maxUses === null || p.usesCount < p.maxUses)
    .map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      discountType: p.discountType,
      discountValue: p.discountValue,
      validUntil: p.validUntil,
    }))
}

export async function applyPromo(userId: string, code: string, bookingId: string) {
  const result = await validatePromo(code)
  if (!result.valid) throw new ValidationError(result.reason)

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new NotFoundError('Bron topilmadi')
  if (booking.riderId !== userId) throw new ForbiddenError('Bu bron sizga tegishli emas')
  if (booking.promoCodeId) throw new ConflictError('Bu bronga allaqachon promo kod qo‘llangan')

  const promo = await prisma.promoCode.findUnique({ where: { code } })
  if (!promo) throw new NotFoundError('Promo kod topilmadi')

  const discount =
    promo.discountType === 'FIXED' ? promo.discountValue : Math.round((booking.totalPrice * promo.discountValue) / 100)
  const clampedDiscount = Math.min(discount, booking.totalPrice)

  const [updatedBooking] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: {
        promoCodeId: promo.id,
        discountApplied: clampedDiscount,
        totalPrice: booking.totalPrice - clampedDiscount,
      },
    }),
    prisma.promoCode.update({ where: { id: promo.id }, data: { usesCount: { increment: 1 } } }),
  ])

  return updatedBooking
}

export async function listPromos() {
  return prisma.promoCode.findMany({ orderBy: { validFrom: 'desc' } })
}

export async function createPromo(data: {
  code: string
  title: string
  discountType: 'FIXED' | 'PERCENT'
  discountValue: number
  validFrom: Date
  validUntil: Date
  maxUses?: number
}) {
  const existing = await prisma.promoCode.findUnique({ where: { code: data.code } })
  if (existing) throw new ConflictError('Bu kod allaqachon mavjud')
  return prisma.promoCode.create({ data })
}

export async function updatePromo(
  id: string,
  patch: Partial<{
    title: string
    discountType: 'FIXED' | 'PERCENT'
    discountValue: number
    validFrom: Date
    validUntil: Date
    maxUses: number
    active: boolean
  }>,
) {
  const promo = await prisma.promoCode.findUnique({ where: { id } })
  if (!promo) throw new NotFoundError('Promo kod topilmadi')
  return prisma.promoCode.update({ where: { id }, data: patch })
}
