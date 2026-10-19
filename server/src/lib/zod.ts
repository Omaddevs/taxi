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

/** Free text from Telegram (names, titles, ads) is cut to size rather than refused: the bot cuts by
 *  Python characters and Telegram allows long names, but an emoji counts twice here — refusing
 *  would sink the whole request. Cut by code point so an emoji is never split; `hardMax` only
 *  stops abuse. */
export function clipped(max: number, hardMax = max * 4) {
  return z
    .string()
    .trim()
    .max(hardMax)
    .transform((v) => Array.from(v).slice(0, max).join(''))
}

export function optionalPassword() {
  return z.preprocess(
    blankToUndefined,
    z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo‘lsin').max(72).optional(),
  )
}
