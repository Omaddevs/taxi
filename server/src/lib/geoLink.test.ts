import { describe, expect, it } from 'vitest'
import { isMapLink, parseCoordinates, parseCoordinatesFromHtml } from './geoLink.js'

describe('parseCoordinates', () => {
  it('reads plain coordinates', () => {
    expect(parseCoordinates('41.281410, 69.212668')).toEqual([41.28141, 69.212668])
    expect(parseCoordinates('41.28141 69.212668')).toEqual([41.28141, 69.212668])
  })

  it('reads full Yandex links (longitude first)', () => {
    expect(
      parseCoordinates(
        'https://yandex.uz/maps/10335/tashkent/?ll=69.212668%2C41.281410&mode=whatshere&whatshere%5Bpoint%5D=69.212668%2C41.281410&whatshere%5Bzoom%5D=17&z=17',
      ),
    ).toEqual([41.28141, 69.212668])
    expect(parseCoordinates('https://yandex.uz/maps/?pt=69.2797,41.3111&z=17')).toEqual([41.3111, 69.2797])
    expect(parseCoordinates('https://yandex.ru/maps/?rtext=41.3111,69.2797~41.2,69.1&rtt=auto')).toEqual([41.3111, 69.2797])
  })

  it('prefers the dropped pin / route start over the viewport centre', () => {
    expect(parseCoordinates('https://yandex.uz/maps/?ll=69.20%2C41.20&pt=69.2797%2C41.3111&z=12')).toEqual([41.3111, 69.2797])
    expect(
      parseCoordinates('https://yandex.ru/maps/?ll=30.284506%2C59.962915&mode=routes&rtext=59.960987%2C30.292103~59.964377%2C30.277339'),
    ).toEqual([59.960987, 30.292103])
  })

  it('reads Google links', () => {
    expect(parseCoordinates('https://www.google.com/maps/@41.3111,69.2797,17z')).toEqual([41.3111, 69.2797])
    expect(parseCoordinates('https://maps.google.com/?q=41.3111,69.2797')).toEqual([41.3111, 69.2797])
    expect(parseCoordinates('https://www.google.com/maps/search/41.3111,+69.2797')).toEqual([41.3111, 69.2797])
    expect(
      parseCoordinates('https://www.google.com/maps/place/X/@41.30,69.20,15z/data=!3m1!4b1!4m6!3m5!1s0x0!8m2!3d41.3111!4d69.2797'),
    ).toEqual([41.3111, 69.2797])
  })

  it('finds nothing in short links — those need resolving', () => {
    expect(parseCoordinates('https://yandex.uz/maps/-/CHq7RB~a')).toBeNull()
    expect(parseCoordinates('https://maps.app.goo.gl/AbCdEf123')).toBeNull()
  })
})

describe('parseCoordinatesFromHtml', () => {
  it('never reads a captcha page as a location', () => {
    expect(parseCoordinatesFromHtml('<div class="CheckboxCaptcha">SmartCaptcha ll=63.150118%2C41.765066</div>')).toBeNull()
    expect(parseCoordinatesFromHtml('<a href="/maps/?ll=63.15%2C41.76">default view</a>')).toBeNull()
  })

  it('reads a Yandex org page and a Google place page', () => {
    expect(parseCoordinatesFromHtml('..."coordinates":[69.212668,41.28141],"type":"Point"...')).toEqual([41.28141, 69.212668])
    expect(parseCoordinatesFromHtml('<meta content="https://maps.google.com/maps/api/staticmap?center=41.3111%2C69.2797&amp;zoom=15">')).toEqual([
      41.3111, 69.2797,
    ])
  })
})

describe('isMapLink', () => {
  it('only allows map services', () => {
    expect(isMapLink('https://yandex.uz/maps/-/CHq7RB~a')).toBe(true)
    expect(isMapLink('https://maps.app.goo.gl/AbCdEf123')).toBe(true)
    expect(isMapLink('https://www.google.com/maps/place/x')).toBe(true)
    expect(isMapLink('http://169.254.169.254/latest/meta-data')).toBe(false)
    expect(isMapLink('https://evil.com/?q=yandex.uz')).toBe(false)
    expect(isMapLink('file:///etc/passwd')).toBe(false)
  })
})
