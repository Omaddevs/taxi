import { randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'

export interface ChargeInput {
  userId: string
  amount: number
  methodId: string
  bookingId?: string
}

export interface ChargeResult {
  success: boolean
  providerRef?: string
  failureReason?: string
}

export interface PaymentProvider {
  charge(input: ChargeInput): Promise<ChargeResult>
}

class MockPaymentProvider implements PaymentProvider {
  async charge(_input: ChargeInput): Promise<ChargeResult> {
    await new Promise((resolve) => setTimeout(resolve, 150))
    return { success: true, providerRef: `mock_${randomUUID()}` }
  }
}

export function getPaymentProvider(): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    case 'mock':
    default:
      return new MockPaymentProvider()
    // 'click' / 'payme' providers plug in here later, same PaymentProvider
    // interface, selected purely via env.PAYMENT_PROVIDER — no call-site changes.
  }
}
