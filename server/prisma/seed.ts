import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SERVICES = [
  { id: 'standart', title: 'Standart Taxi', description: 'Qulay kundalik safarlar', icon: 'car', basePrice: 180000, sortOrder: 1 },
  { id: 'women', title: 'Ayollar uchun', description: 'Faqat ayol haydovchilar', icon: 'heart', basePrice: 200000, sortOrder: 2 },
  { id: 'family', title: 'Oilaviy Taxi', description: 'Katta oila uchun joy', icon: 'users', basePrice: 280000, sortOrder: 3 },
  { id: 'minivan', title: 'Minivan', description: '6–8 yo‘lovchi sig‘imi', icon: 'bus', basePrice: 320000, sortOrder: 4 },
  { id: 'premium', title: 'Premium', description: 'Biznes klass avtomobillar', icon: 'sparkles', basePrice: 450000, sortOrder: 5 },
  // 'cargo' intentionally excluded — deferred out of v1 scope per the approved plan.
]

const SUBSCRIPTION_PLANS = [
  { id: 'monthly', title: '1 oylik', durationDays: 30, price: 60000, sortOrder: 1 },
  { id: 'quarterly', title: '3 oylik', durationDays: 90, price: 160000, sortOrder: 2 },
  { id: 'yearly', title: '1 yillik', durationDays: 365, price: 550000, sortOrder: 3 },
]

// Production runs this on every container start: it only creates missing services/plans (never
// overwrites prices an admin edited) and skips the demo users/offers below.
const PRODUCTION = process.env.NODE_ENV === 'production'

async function main() {
  for (const service of SERVICES) {
    await prisma.service.upsert({
      where: { id: service.id },
      update: PRODUCTION ? {} : service,
      create: service,
    })
  }

  for (const plan of SUBSCRIPTION_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      update: PRODUCTION ? {} : plan,
      create: plan,
    })
  }

  if (PRODUCTION) {
    console.log('Seed (production): services and subscription plans ensured')
    return
  }

  const driverUser = await prisma.user.upsert({
    where: { phone: '+998912001122' },
    update: {},
    create: {
      phone: '+998912001122',
      name: 'Azizbek',
      firstName: 'Azizbek',
      role: 'DRIVER',
      verified: true,
      avatarUrl: 'https://i.pravatar.cc/160?img=15',
    },
  })

  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      carModel: 'Chevrolet Cobalt',
      plate: '01 A 777 BA',
      ratingAvg: 4.9,
      tripsCount: 1240,
      approved: true,
      online: true,
    },
  })

  const riderUser = await prisma.user.upsert({
    where: { phone: '+998901234567' },
    update: {},
    create: {
      phone: '+998901234567',
      name: 'Otabek Anvarov',
      firstName: 'Otabek',
      email: 'otabek@taxiline.uz',
      role: 'PASSENGER',
      verified: true,
      avatarUrl: 'https://i.pravatar.cc/160?img=12',
      balance: 1250000,
      points: 1250,
      coins: 1250000,
    },
  })

  await prisma.rideOffer.upsert({
    where: { id: 'seed-offer-1' },
    update: {},
    create: {
      id: 'seed-offer-1',
      driverId: driver.id,
      serviceId: 'standart',
      fromLabel: 'Qarshi',
      toLabel: 'Toshkent',
      fromAddress: 'Qarshi, Nasaf ko‘chasi 12',
      toAddress: 'Toshkent, Amir Temur 45',
      departAt: new Date('2026-05-22T18:00:00+05:00'),
      arriveAt: new Date('2026-05-22T23:40:00+05:00'),
      seatsTotal: 3,
      seatsAvailable: 3,
      luggageCapacity: 2,
      pricePerSeat: 350000,
    },
  })

  console.log('Seed complete:', { services: SERVICES.length, driver: driverUser.phone, rider: riderUser.phone })
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
