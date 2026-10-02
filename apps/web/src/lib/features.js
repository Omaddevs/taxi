// Wallet top-up, payout, saved cards and online ride payments stay "Tez orada" until a real
// Click/Payme provider is live. Mirrors the server's ONLINE_PAYMENTS_ENABLED flag.
export const ONLINE_PAYMENTS = import.meta.env.VITE_ONLINE_PAYMENTS === 'true'
