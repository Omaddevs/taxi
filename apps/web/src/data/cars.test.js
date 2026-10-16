import { describe, expect, it } from 'vitest'
import { ANY_CAR_PHOTO, carForModel, carPhotoFor } from './cars'

describe('carForModel', () => {
  it('reads the picker’s own titles', () => {
    expect(carForModel('Chevrolet Spark')?.id).toBe('spark')
    expect(carForModel('Chevrolet Cobalt')?.id).toBe('cobalt')
    expect(carForModel('Chevrolet Malibu XL')?.id).toBe('malibu-xl')
  })

  it('reads how drivers write their car', () => {
    expect(carForModel('Nexia 3')?.id).toBe('nexia-r3')
    expect(carForModel('Daewoo Nexia R3 2020')?.id).toBe('nexia-r3')
    expect(carForModel('nexia')?.id).toBe('nexia')
    expect(carForModel('Kobalt oq')?.id).toBe('cobalt')
    expect(carForModel('Lasetti')?.id).toBe('lacetti')
  })

  it('knows nothing of "any car" or unknown models', () => {
    expect(carForModel('Farqi yo‘q')).toBeNull()
    expect(carForModel('Kia K5')).toBeNull()
    expect(carForModel('')).toBeNull()
    expect(carForModel(null)).toBeNull()
  })

  it('pictures the TaxiLine car when the model isn’t known', () => {
    expect(carPhotoFor('Chevrolet Spark')).toContain('/cars/models/spark.png')
    expect(carPhotoFor('Farqi yo‘q')).toBe(ANY_CAR_PHOTO)
  })
})
