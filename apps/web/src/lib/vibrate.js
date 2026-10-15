// "Ochilganda tebranish" (Sozlamalar): a short buzz when the app opens. Only where the browser
// can vibrate at all — iOS Safari cannot, so the setting is hidden there.
const KEY = 'taxiline-vibrate'

export const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export function vibrateOnOpenEnabled() {
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

export function setVibrateOnOpen(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // private mode: the choice just isn't remembered
  }
}

let armed = false
/** Once per page load. Browsers ignore vibrate() before the first tap, so it waits for one. */
export function buzzOnOpen() {
  if (armed || !canVibrate || !vibrateOnOpenEnabled()) return
  armed = true
  window.addEventListener('pointerdown', () => navigator.vibrate(18), { once: true, passive: true })
}
