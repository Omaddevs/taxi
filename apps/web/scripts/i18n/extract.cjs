// Collects every translation key used by the web app and syncs src/i18n/{ru,en}.json.
//   node scripts/i18n/extract.cjs           → report missing / unused keys
//   node scripts/i18n/extract.cjs --check   → exit 1 when a key has no ru/en translation
// Keys: first argument of every t('…') call, plus every other Uzbek-looking literal
// (module-level data is translated where it is rendered: t(item.label)).
const fs = require('fs')
const path = require('path')
const { ts, isUz, parse } = require('./shared.cjs')

const ROOT = path.resolve(__dirname, '../../src')
const I18N = path.join(ROOT, 'i18n')

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (!['locales', 'i18n'].includes(e.name)) walk(p, acc)
    } else if (/\.(jsx|js)$/.test(e.name) && !/\.test\./.test(e.name)) acc.push(p)
  }
  return acc
}

// Literals that look like text but aren't UI copy (class lists, schema.org types, console messages…)
const IGNORE = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'ignore.json'), 'utf8')))

const keys = new Map() // key → first location
function add(key, where) {
  if (!keys.has(key) && !IGNORE.has(key)) keys.set(key, where)
}

for (const file of walk(ROOT)) {
  const src = fs.readFileSync(file, 'utf8')
  if (src.startsWith('// i18n-ignore-file')) continue
  const sf = parse(file, src)
  const rel = path.relative(ROOT, file).replace(/\\/g, '/')
  ;(function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
      const a = node.arguments[0]
      if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) add(a.text, rel)
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && isUz(node.text)) {
      const p = node.parent
      const skip = ts.isImportDeclaration(p) || (ts.isPropertyAssignment(p) && p.name === node) || ts.isBinaryExpression(p)
      if (!skip) add(node.text, rel)
    }
    ts.forEachChild(node, visit)
  })(sf)
}

// Keys the scan can't see: server error messages shown as-is, and short lower-case words used with t()
// from data objects ("km", "chap" …).
const extraFile = path.join(I18N, 'extra-keys.json')
if (fs.existsSync(extraFile)) for (const k of JSON.parse(fs.readFileSync(extraFile, 'utf8'))) add(k, 'extra-keys.json')

const load = (lng) => {
  const f = path.join(I18N, `${lng}.json`)
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}
}

const report = {}
let missingTotal = 0
for (const lng of ['ru', 'en']) {
  const dict = load(lng)
  const missing = [...keys.keys()].filter((k) => !(k in dict))
  const unused = Object.keys(dict).filter((k) => !keys.has(k))
  report[lng] = { missing, unused }
  missingTotal += missing.length
  console.log(`${lng}: ${Object.keys(dict).length} entries, ${missing.length} missing, ${unused.length} unused`)
}
console.log(`total keys: ${keys.size}`)

const outDir = process.env.REPORT_DIR
if (outDir) {
  fs.writeFileSync(path.join(outDir, 'keys.json'), JSON.stringify(Object.fromEntries(keys), null, 1))
  fs.writeFileSync(path.join(outDir, 'missing.json'), JSON.stringify(report, null, 1))
}
if (process.argv.includes('--check') && missingTotal) process.exit(1)
