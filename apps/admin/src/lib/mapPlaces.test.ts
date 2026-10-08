import { describe, expect, it } from 'vitest'
import { parseCoordinates } from './mapPlaces.js'

describe('parseCoordinates', () => {
  it('reads plain "lat, lng"', () => {
    expect(parseCoordinates('41.3111, 69.2797')).toEqual([41.3111, 69.2797])
    expect(parseCoordinates('41.3111 69.2797')).toEqual([41.3111, 69.2797])
  })

  it('reads Google Maps links', () => {
    expect(parseCoordinates('https://www.google.com/maps/@41.3111,69.2797,17z')).toEqual([41.3111, 69.2797])
    expect(parseCoordinates('https://maps.google.com/?q=41.3111,69.2797')).toEqual([41.3111, 69.2797])
    expect(
      parseCoordinates('https://www.google.com/maps/place/X/@41.30,69.20,15z/data=!3m1!4b1!4m6!3m5!1s0x0!8m2!3d41.3111!4d69.2797'),
    ).toEqual([41.3111, 69.2797])
  })

  it('reads Yandex links (longitude first)', () => {
    expect(parseCoordinates('https://yandex.uz/maps/?ll=69.2797%2C41.3111&z=16')).toEqual([41.3111, 69.2797])
    expect(parseCoordinates('https://yandex.uz/maps/?pt=69.2797,41.3111&z=17')).toEqual([41.3111, 69.2797])
  })

  it('reads the link Yandex shows in the address bar and ya.ru links', () => {
    expect(
      parseCoordinates(
        'https://yandex.uz/maps/10335/tashkent/?ll=69.212668%2C41.281410&mode=whatshere&whatshere%5Bpoint%5D=69.212668%2C41.281410&z=17',
      ),
    ).toEqual([41.28141, 69.212668])
    expect(parseCoordinates('https://ya.ru/maps/?ll=69.2797,41.3111')).toEqual([41.3111, 69.2797])
  })

  it('prefers the dropped pin over the viewport centre', () => {
    expect(parseCoordinates('https://yandex.uz/maps/?ll=69.20%2C41.20&pt=69.2797%2C41.3111&z=12')).toEqual([41.3111, 69.2797])
  })

  it('rejects junk and out-of-range values', () => {
    expect(parseCoordinates('')).toBeNull()
    expect(parseCoordinates('Chilonzor 5')).toBeNull()
    expect(parseCoordinates('141.3, 69.2')).toBeNull()
  })
})
