import { describe, expect, it } from 'vitest'
import { MAX_RED, MAX_WALK, getRoute } from './routeGen'
import { intersectionWalk, lightState, midWalk } from './traffic'

const LEGS = Array.from({ length: 13 }, (_, i) => i)
const crossing = (route, d) => route.timeline.find((e) => e.d >= d)

describe('the van keeps the traffic rules on every leg', () => {
  it('never passes a stop line on red', () => {
    for (const leg of LEGS) {
      const r = getRoute(leg)
      for (const g of r.gates.filter((x) => x.kind === 'light')) {
        const e = crossing(r, g.d + 0.5)
        expect(lightState(g.i, g.j, g.axis, e.t, r.ctl), `leg ${leg} node ${g.i},${g.j}`).not.toBe('red')
      }
    }
  })

  it('never drives onto a crosswalk with people on it', () => {
    for (const leg of LEGS) {
      const r = getRoute(leg)
      for (const g of r.gates.filter((x) => x.kind !== 'light')) {
        const e = crossing(r, g.d + 0.5)
        const walk = g.kind === 'walk' ? intersectionWalk(g.i, g.j, g.axis, g.side, e.t, 0, r.ctl) : midWalk(g.axis, g.street, g.m, e.t, 0, r.ctl)
        expect(walk.people.filter((p) => !p.waiting).length, `leg ${leg} ${g.kind} gate at ${g.d.toFixed(0)} m`).toBe(0)
      }
    }
  })

  it('reaches the square and stops there', () => {
    for (const leg of LEGS) {
      const r = getRoute(leg)
      const last = r.timeline[r.timeline.length - 1]
      expect(last.d).toBeCloseTo(r.length, 1)
      expect(last.v).toBe(0)
      expect(r.duration).toBeLessThan(200)
    }
  })

  it(`stops for red at most ${MAX_RED} times and for people at most ${MAX_WALK} on the whole tour`, () => {
    const total = { light: 0, walk: 0 }
    for (const leg of LEGS) {
      // A stop = the van standing (wait set) at a new place along the route.
      const stops = { light: 0, walk: 0 }
      let at = -1
      for (const e of getRoute(leg).timeline) {
        if (e.wait && Math.abs(e.d - at) > 3) stops[e.wait]++
        if (e.wait) at = e.d
      }
      total.light += stops.light
      total.walk += stops.walk
    }
    expect(total.light).toBeLessThanOrEqual(MAX_RED)
    expect(total.walk).toBeLessThanOrEqual(MAX_WALK)
  })

  it('takes a different way on each leg', () => {
    const ways = new Set(LEGS.map((leg) => JSON.stringify(getRoute(leg).nodes)))
    expect(ways.size).toBeGreaterThanOrEqual(11)
  })
})
