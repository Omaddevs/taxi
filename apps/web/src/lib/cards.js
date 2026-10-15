// Bank card helpers for "Karta qo‘shish". The full number never leaves the device: only the
// network and the last four digits are sent, next to the payment provider's token.

/** Uzcard (8600, 5614) and Humo (9860) are checked before Visa/Mastercard ranges. */
export function cardNetwork(digits) {
  if (/^(8600|5614)/.test(digits)) return 'uzcard'
  if (/^9860/.test(digits)) return 'humo'
  if (/^4/.test(digits)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard'
  return null
}

export const NETWORK_NAME = { uzcard: 'Uzcard', humo: 'Humo', visa: 'Visa', mastercard: 'Mastercard' }

/** Local cards confirm by SMS; international ones need the CVV and the holder's name. */
export const isLocalNetwork = (network) => network === 'uzcard' || network === 'humo'

export function luhnValid(digits) {
  if (!/^\d{13,19}$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

/** A complete number for its network: 16 digits; Visa/Mastercard must also pass Luhn. Uzcard and
 * Humo are confirmed by SMS at the provider, so a local check could only wrongly reject a real one. */
export function cardNumberValid(digits) {
  const network = cardNetwork(digits)
  if (!network || digits.length !== 16) return false
  return isLocalNetwork(network) || luhnValid(digits)
}

export const formatCardNumber = (digits) => digits.replace(/(\d{4})(?=\d)/g, '$1 ')

/** "MMYY" digits → "MM/YY" while typing. */
export function formatExpiry(digits) {
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}` : digits
}

/** Valid month and not past the end of that month. */
export function expiryValid(digits, now = new Date()) {
  if (!/^\d{4}$/.test(digits)) return false
  const month = Number(digits.slice(0, 2))
  const year = 2000 + Number(digits.slice(2))
  if (month < 1 || month > 12) return false
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
}
