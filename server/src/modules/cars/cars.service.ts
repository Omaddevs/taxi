import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { ConflictError, NotFoundError } from '../../errors/AppError.js'

type CarInput = { brand: string; model: string; fuelType: 'BENZIN' | 'ELECTRO_HYBRID'; imageUrl?: string }

function conflictOnDuplicate(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new ConflictError('Bu rusum va model allaqachon qo‘shilgan')
  }
  throw err
}

export async function listCars() {
  return prisma.car.findMany({ orderBy: [{ brand: 'asc' }, { model: 'asc' }] })
}

// Driver.carModel is free text ("Chevrolet Cobalt", "cobalt"), so "selected" means the
// model name appears in it — good enough for the admin's popularity hint.
export async function listCarsWithUsage() {
  const cars = await listCars()
  return Promise.all(
    cars.map(async (car) => ({
      ...car,
      selectionCount: await prisma.driver.count({
        where: { carModel: { contains: car.model, mode: 'insensitive' } },
      }),
    })),
  )
}

export async function createCar(data: CarInput) {
  return prisma.car
    .create({ data: { ...data, imageUrl: data.imageUrl || null } })
    .catch(conflictOnDuplicate)
}

export async function updateCar(id: string, patch: Partial<CarInput>) {
  const car = await prisma.car.findUnique({ where: { id } })
  if (!car) throw new NotFoundError('Mashina topilmadi')
  const data = { ...patch, ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl || null } : {}) }
  return prisma.car.update({ where: { id }, data }).catch(conflictOnDuplicate)
}

export async function deleteCar(id: string) {
  const car = await prisma.car.findUnique({ where: { id } })
  if (!car) throw new NotFoundError('Mashina topilmadi')
  await prisma.car.delete({ where: { id } })
}
