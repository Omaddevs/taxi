// Shared helpers for the i18n codemod / extractor (scripts/i18n/*.cjs).
// Source strings are Uzbek (Latin) and double as translation keys.
const ts = require('typescript')

const TAILWIND_WORDS = new Set(
  'flex grid block hidden inline relative absolute fixed sticky truncate italic underline uppercase lowercase capitalize contents transition shadow rounded border grow shrink static invisible visible antialiased outline ring isolate container prose group peer table'.split(' '),
)

const NON_UZ_SINGLE = new Set(
  'Escape Enter Tab Home End Space Backspace Delete Error Date Object Bearer TaxiLine Telegram Google Click Payme Uzum Apple Android Leaflet OpenStreetMap Yandex GET POST PUT PATCH DELETE'.split(' '),
)

function looksClassName(s) {
  const tokens = s.trim().split(/\s+/)
  if (!tokens.every((tk) => /^[!-]?[a-z0-9@[\]().\/:_%#&>*,='"+-]+!?$/i.test(tk) && /^[!-]?[a-z0-9@[(]/.test(tk))) return false
  return tokens.some((tk) => /[-:[\]/]/.test(tk) || TAILWIND_WORDS.has(tk))
}

// Does this literal look like human-facing Uzbek text?
function isUz(raw) {
  const s = raw.trim()
  if (!s || !/[A-Za-z]/.test(s)) return false
  if (/[А-Яа-яЁё]/.test(s)) return false
  if (/^(https?:|mailto:|tel:|sms:|\/|#|\.\/|\.\.\/|data:|blob:|geo:)/.test(s)) return false
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(s)) return false
  if (/^\(?(min|max)-width|^\(prefers/.test(s)) return false
  if (/^&|\b(must be|within|failed|caught|undefined|null)\b/.test(s)) return false // HTML entity / English dev message
  if (/\b(translate|rotate|scale|matrix)(3d|X|Y)?\(|\b(px|deg|ms|rem)\b|rgba?\(/.test(s)) return false // CSS values
  if (looksClassName(s)) return false
  if (/^[MmLlHhVvCcSsQqTtAaZz][\d\s.,MmLlHhVvCcSsQqTtAaZz-]+$/.test(s) && /\d/.test(s)) return false // SVG path
  const hasSpace = /\s/.test(s)
  const hasUzApos = /[oOgG][‘ʻ’'`]/.test(s)
  if (!hasSpace) {
    if (/^[A-Z0-9_]+$/.test(s)) return false // ENUM / ACRONYM
    if (NON_UZ_SINGLE.has(s.replace(/[.!?…:,]+$/, ''))) return false
    if (/^[a-z]+[A-Z]/.test(s)) return false // camelCase identifier
    if (/^[A-Z][a-z]+[A-Z]/.test(s)) return false // PascalCase
    if (/[_./\\=]/.test(s.replace(/[.!?…]+$/, '')) && !hasUzApos) return false
    if (hasUzApos) return true
    // Capitalised single word, optionally with punctuation / emoji / numbers around it
    if (/^[^A-Za-z]*[A-Z][a-zʻ‘’'`-]+[^A-Za-z]*$/.test(s)) return true
    // lower-case single word: only treat as text if it carries trailing punctuation
    return /^[a-z][a-zʻ‘’'`-]+[!?…:]$/.test(s)
  }
  // multi-word
  if (/^[a-z0-9-]+(\s+[a-z0-9-]+)*$/.test(s) && s.split(/\s+/).every((w) => /-/.test(w))) return false
  if (/[{}<>]/.test(s) && !/\{\d+\}/.test(s)) return false
  return true
}

function parse(file, text) {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.JSX : ts.ScriptKind.JS)
}

module.exports = { ts, isUz, parse, looksClassName }
