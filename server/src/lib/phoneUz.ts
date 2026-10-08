// Uzbek mobile numbers: +998 followed by exactly 9 digits. Accepts what people actually type —
// "87 735 36 36", "998877353636", "+998 (87) 735-36-36" — and returns "+998877353636", or null.
export function normalizeUzPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('998')) digits = digits.slice(3)
  if (digits.length === 10 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length !== 9) return null
  return `+998${digits}`
}
