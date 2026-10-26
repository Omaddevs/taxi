import { describe, expect, it } from 'vitest'
import type { Request } from 'express'

const { byBodyPhone, rateLimit } = await import('./rateLimit.js')

function run(limiter: ReturnType<typeof rateLimit>, req: Partial<Request>) {
  let error: unknown = 'not called'
  limiter(req as Request, {} as never, (err?: unknown) => {
    error = err
  })
  return error
}

describe('rateLimit', () => {
  it('lets max requests through per IP, then refuses', () => {
    const limiter = rateLimit(2, 60_000)
    expect(run(limiter, { ip: '1.1.1.1' })).toBeUndefined()
    expect(run(limiter, { ip: '1.1.1.1' })).toBeUndefined()
    expect(run(limiter, { ip: '1.1.1.1' })).toMatchObject({ statusCode: 429 })
    expect(run(limiter, { ip: '2.2.2.2' })).toBeUndefined()
  })

  it('counts one phone number across IPs, however it is written', () => {
    const limiter = rateLimit(2, 60_000, byBodyPhone)
    expect(run(limiter, { ip: '1.1.1.1', body: { phone: '+998 90 123 45 67' } })).toBeUndefined()
    expect(run(limiter, { ip: '2.2.2.2', body: { phone: '901234567' } })).toBeUndefined()
    expect(run(limiter, { ip: '3.3.3.3', body: { phone: '+998901234567' } })).toMatchObject({ statusCode: 429 })
  })

  it('keeps a lockout when flooded with more keys than it can hold', () => {
    const limiter = rateLimit(2, 60_000)
    run(limiter, { ip: '9.9.9.9' })
    run(limiter, { ip: '9.9.9.9' })
    expect(run(limiter, { ip: '9.9.9.9' })).toMatchObject({ statusCode: 429 })
    for (let i = 0; i < 6000; i++) run(limiter, { ip: `10.0.${i >> 8}.${i & 255}` })
    expect(run(limiter, { ip: '9.9.9.9' })).toMatchObject({ statusCode: 429 })
  })

  it('passes requests without a phone to the per-IP limiter instead', () => {
    const limiter = rateLimit(1, 60_000, byBodyPhone)
    expect(run(limiter, { ip: '1.1.1.1', body: {} })).toBeUndefined()
    expect(run(limiter, { ip: '1.1.1.1', body: {} })).toBeUndefined()
  })
})
