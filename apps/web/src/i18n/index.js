// Ilova tarjimasi. Kalit — o‘zbekcha (lotin) matnning o‘zi:
//   t('Saqlash')                 → "Сохранить" / "Save" / "Сақлаш"
//   t('{0} ta bo‘sh joy', seats) → "3 свободных места" …
// Lug‘atda yo‘q matn (masalan serverdan kelgan ism yoki manzil) o‘zgarishsiz qaytadi,
// shuning uchun t() ni har qanday ko‘rsatiladigan qiymatga xavfsiz qo‘llash mumkin.
// Kirill (oz) uchun alohida lug‘at yo‘q — o‘zbekcha kalit transliteratsiya qilinadi.
import ru from './ru.json'
import en from './en.json'
import ozOverrides from './oz.json'
import { toCyrillic } from './translit'

export const LANG_KEY = 'taxiline-lang'
export const SUPPORTED_LANGUAGES = ['uz', 'oz', 'ru', 'en']
export const DEFAULT_LANGUAGE = 'uz'
// <html lang> va Intl uchun BCP-47 kodlari
export const HTML_LANG = { uz: 'uz', oz: 'uz-Cyrl', ru: 'ru', en: 'en' }
export const LOCALE = { uz: 'uz-Latn-UZ', oz: 'uz-Cyrl-UZ', ru: 'ru-RU', en: 'en-GB' }

const DICTS = { ru, en }
const ozCache = new Map()

export function isSupportedLanguage(code) {
  return SUPPORTED_LANGUAGES.includes(code)
}

function loadStoredLanguage() {
  try {
    const raw = localStorage.getItem(LANG_KEY)
    if (isSupportedLanguage(raw)) return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_LANGUAGE
}

let current = loadStoredLanguage()

export function getLanguage() {
  return current
}

export function setI18nLanguage(code) {
  if (!isSupportedLanguage(code) || code === current) return
  current = code
  if (typeof document !== 'undefined') document.documentElement.lang = HTML_LANG[code]
}

// Lug‘atdagi kalitmi (ya’ni ilova matni, foydalanuvchi ma’lumoti emas)?
function isKey(text) {
  return Object.prototype.hasOwnProperty.call(ru, text) || Object.prototype.hasOwnProperty.call(en, text)
}

function translate(text, lang) {
  if (lang === 'uz') return text
  if (lang === 'oz') {
    if (Object.prototype.hasOwnProperty.call(ozOverrides, text)) return ozOverrides[text]
    if (!isKey(text)) return text
    let out = ozCache.get(text)
    if (out === undefined) {
      out = toCyrillic(text)
      ozCache.set(text, out)
    }
    return out
  }
  const dict = DICTS[lang]
  return Object.prototype.hasOwnProperty.call(dict, text) ? dict[text] : text
}

// Ko‘plik shakllari: lug‘atda qiymat massiv bo‘lsa, birinchi argument soniga qarab tanlanadi.
//   ru: ["{0} место", "{0} места", "{0} мест"]  (one / few / many)
//   en: ["{0} seat", "{0} seats"]              (one / other)
const PLURAL_SLOT = {
  ru: { one: 0, few: 1, many: 2, other: 1 },
  en: { one: 0, other: 1 },
}
const pluralRules = {}

function pickPlural(forms, lang, count) {
  const n = Number(count)
  if (!Number.isFinite(n)) return forms[forms.length - 1]
  pluralRules[lang] ??= new Intl.PluralRules(LOCALE[lang])
  const slot = PLURAL_SLOT[lang]?.[pluralRules[lang].select(n)] ?? forms.length - 1
  return forms[Math.min(slot, forms.length - 1)]
}

export function t(text, ...args) {
  if (typeof text !== 'string' || !text) return text
  let out = translate(text, current)
  if (Array.isArray(out)) out = pickPlural(out, current, args[0])
  if (!args.length) return out
  return out.replace(/\{(\d+)\}/g, (m, i) => (args[i] === undefined || args[i] === null ? '' : String(args[i])))
}

// Joriy tilga mos sana/son formatlash uchun
export function locale() {
  return LOCALE[current]
}

if (typeof document !== 'undefined') document.documentElement.lang = HTML_LANG[current]
