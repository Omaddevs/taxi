import { useEffect } from 'react'

// One page-scroll lock for every sheet, picker and modal. Each used to save `body.style.overflow`
// on open and put it back on close; with two open at once (a region sheet → its map picker) they
// closed in the other order, the second one "restored" the first one's `hidden`, and the whole
// app stopped scrolling until a reload. A counter can't get that wrong: the page scrolls again
// as soon as the last lock is released, whatever the order.

let locks = 0

function apply() {
  const value = locks > 0 ? 'hidden' : ''
  document.body.style.overflow = value
  document.documentElement.style.overflow = value
}

/** Locks page scroll; returns the release function (safe to call more than once). */
export function lockScroll() {
  locks += 1
  apply()
  let released = false
  return () => {
    if (released) return
    released = true
    locks = Math.max(0, locks - 1)
    apply()
  }
}

/** Keeps page scroll locked while `active` is true. */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined
    return lockScroll()
  }, [active])
}

/**
 * Safety net, run on every route change: with no lock held, any leftover `overflow: hidden`
 * (an old build in a cached tab, a third-party widget) is cleared so a page can never stay frozen.
 */
export function useScrollUnlockOnNavigate(pathname) {
  useEffect(() => {
    if (locks === 0) apply()
  }, [pathname])
}
