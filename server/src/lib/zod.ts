import { z } from 'zod'

/** Empty string in JSON becomes "missing", so optional fields do not fail min-length. */
export function blankToUndefined(value: unknown) {
  if (value == null) return undefined
  if (typeof value === 'string' && value.trim() === '') return undefined
  return value
}

export function optionalTrimmed(min: number, max: number, message: string) {
  return z.preprocess(
    blankToUndefined,
    z.string().trim().min(min, message).max(max, message).optional(),
  )
}

export function optionalPassword() {
  return z.preprocess(
    blankToUndefined,
    z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo‘lsin').max(72).optional(),
  )
}
