import { describe, it, expect, afterEach } from 'vitest'
import ru from './ru.json'
import en from './en.json'
import { setI18nLanguage, t } from './index'
import { toCyrillic } from './translit'

const placeholders = (s) => (s.match(/\{\d+\}/g) || []).sort().join()
const forms = (v) => (Array.isArray(v) ? v : [v])

describe('dictionaries', () => {
  it('ru and en cover the same keys', () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort())
  })

  it('keep every {n} placeholder of the key', () => {
    for (const dict of [ru, en]) {
      for (const [key, value] of Object.entries(dict)) {
        for (const form of forms(value)) {
          if (placeholders(key)) expect([key, placeholders(form)]).toEqual([key, placeholders(key)])
        }
      }
    }
  })
})

describe('t()', () => {
  afterEach(() => setI18nLanguage('uz'))

  it('returns the Uzbek key as is', () => {
    setI18nLanguage('uz')
    expect(t('Saqlash')).toBe('Saqlash')
  })

  it('translates and interpolates', () => {
    setI18nLanguage('ru')
    expect(t('Saqlash')).toBe('Сохранить')
    expect(t('Bugun, {0}', '10:30')).toBe('Сегодня, 10:30')
    setI18nLanguage('en')
    expect(t('Saqlash')).toBe('Save')
  })

  it('picks plural forms by count', () => {
    setI18nLanguage('ru')
    expect(t('{0} joy', 1)).toBe('1 место')
    expect(t('{0} joy', 3)).toBe('3 места')
    expect(t('{0} joy', 5)).toBe('5 мест')
    expect(t('{0} joy', 21)).toBe('21 место')
    setI18nLanguage('en')
    expect(t('{0} joy', 1)).toBe('1 seat')
    expect(t('{0} joy', 2)).toBe('2 seats')
  })

  it('transliterates keys to Cyrillic but leaves user data alone', () => {
    setI18nLanguage('oz')
    expect(t('Ro‘yxatdan o‘tish')).toBe('Рўйхатдан ўтиш')
    expect(t('{0} ta bo‘sh joy', 2)).toBe('2 та бўш жой')
    expect(t('Aziz Karimov')).toBe('Aziz Karimov')
  })

  it('passes non-strings through', () => {
    setI18nLanguage('ru')
    expect(t(42)).toBe(42)
    expect(t(null)).toBe(null)
  })
})

describe('toCyrillic', () => {
  it.each([
    ['Yangiliklar', 'Янгиликлар'],
    ['Qo‘ng‘iroq', 'Қўнғироқ'],
    ['Yo‘l va xizmatlar', 'Йўл ва хизматлар'],
    ['Ma’lumotlaringiz', 'Маълумотларингиз'],
    ['Eslatma', 'Эслатма'],
    ['Yetkazib berish', 'Етказиб бериш'],
    ['ARIZA QOLDIRISH', 'АРИЗА ҚОЛДИРИШ'],
    ['Aksiyalar', 'Акциялар'],
    ['qulay taxi', 'қулай такси'],
    ['TaxiLine’ga kirish', 'TaxiLine’га кириш'],
    ['taxiline.uz sayti', 'taxiline.uz сайти'],
  ])('%s → %s', (latin, cyr) => {
    expect(toCyrillic(latin)).toBe(cyr)
  })
})
