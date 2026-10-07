// Wallet top-up, payout, saved cards and online ride payments stay "Tez orada" until a real
// Click/Payme provider is live. Mirrors the server's ONLINE_PAYMENTS_ENABLED flag.
export const ONLINE_PAYMENTS = import.meta.env.VITE_ONLINE_PAYMENTS === 'true'

// SOS (favqulodda yordam) hali ishga tushirilmagan — tugmalar "Tez orada" bo‘lib turadi va
// /sos sahifasi signal yubormaydi. Tayyor bo‘lganda true qiling.
export const SOS_ENABLED = false

// "Do‘stingizni taklif qiling" (referal bonus) hali ishga tushirilmagan — kartalar "Tez orada"
// bo‘lib turadi va taklif sahifasi ochilmaydi. Tayyor bo‘lganda true qiling.
export const REFERRAL_ENABLED = false
