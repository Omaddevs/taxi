// One-off codemod: wraps human-facing Uzbek strings in src/**/*.jsx with t('…').
//   node scripts/i18n/codemod.cjs [--write] [files…]
// Without --write it only reports what it would change.
const fs = require('fs')
const path = require('path')
const { ts, isUz, parse } = require('./shared.cjs')

const ROOT = path.resolve(__dirname, '../../src')
const WRITE = process.argv.includes('--write')
const argFiles = process.argv.slice(2).filter((a) => !a.startsWith('--'))

const DENY_ATTRS = new Set(
  'className class to href src type id key name role variant size tone icon as method target rel inputMode autoComplete pattern d viewBox fill stroke mode color value defaultValue htmlFor accept lang dir style path element kind status code align side position layout theme state tab'.split(' '),
)
const DISPLAY = new Set(
  'label title subtitle sub subTitle desc description text hint caption note badge cta tag short heading lead placeholder message name tagline eyebrow kicker detail info tip unit period action btn button empty emptyText question answer headline excerpt summary chip pill legend helper error success confirmLabel cancelLabel okLabel ariaLabel aria-label alt q a landmark place reward tail feature perk benefit step lines line metric unitLabel statusLabel sourceLabel typeLabel kindLabel priceLabel dateLabel timeLabel caption2 small big top bottom prefix suffix'.split(' '),
)
const DENY_CALL = /^(console\.|api\.|navigate$|use[A-Z]\w*$|localStorage|sessionStorage|document\.|window\.|cn$|clsx$|fetch$|RegExp$|URL$|URLSearchParams$|Intl\.|socket|t$|tr$|require$|import$|lockScroll$|.*\.(includes|startsWith|endsWith|split|replace|replaceAll|indexOf|lastIndexOf|get|has|set|append|delete|getItem|setItem|removeItem|addEventListener|removeEventListener|emit|on|off|once|matchMedia|querySelector|querySelectorAll|toLocaleString|toLocaleDateString|toLocaleTimeString|padStart|padEnd|test|match|matchAll|invalidateQueries|setQueryData|getQueryData|closest|setAttribute|getAttribute|createElement|join|search|localeCompare|filter|find|some|every|setView|flyTo|bindPopup|bindTooltip|openPopup|setContent)$)/
const SETTER_OK = /^set\w*(Error|Err|Msg|Message|Notice|Text|Toast|Hint|Info|Note|Warning|Title|Label|Caption|Flash|Feedback|Alert)$/i

function propName(n) {
  if (!n) return ''
  if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isPrivateIdentifier?.(n)) return n.text
  return ''
}

function inFunction(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isFunctionLike(p)) return true
  }
  return false
}

function attrAncestor(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return p
    if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isFunctionLike(p)) return null
  }
  return null
}

function quote(s) {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`
}

const ENTITIES = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', mdash: '—', ndash: '–', laquo: '«', raquo: '»', hellip: '…', middot: '·', rarr: '→', larr: '←', times: '×' }
function decode(s) {
  return s.replace(/&(#\d+|[a-z]+);/g, (m, e) => (e[0] === '#' ? String.fromCharCode(+e.slice(1)) : ENTITIES[e] ?? m))
}

function processFile(file, report) {
  const src = fs.readFileSync(file, 'utf8')
  const sf = parse(file, src)
  const edits = []
  let tShadow = false

  const callName = (call) => call.expression.getText(sf)

  function literalOk(node) {
    // node: StringLiteral | NoSubstitutionTemplateLiteral | TemplateExpression
    const p = node.parent
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return false
    if (ts.isLiteralTypeNode?.(p)) return false
    const attr = attrAncestor(node)
    if (attr && DENY_ATTRS.has(propName(attr.name))) return false
    if (ts.isBinaryExpression(p) && /^(===|!==|==|!=|in|instanceof)$/.test(p.operatorToken.getText(sf))) return false
    if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && /\.styleb|className$/.test(p.left.getText(sf))) return false
    if (ts.isCaseClause(p)) return false
    if (ts.isElementAccessExpression(p)) return false
    if (ts.isPropertyAssignment(p)) {
      if (p.name === node) return false
      const pn = propName(p.name)
      if (!DISPLAY.has(pn)) return 'report:prop:' + pn
    }
    if (ts.isComputedPropertyName(p)) return false
    if (ts.isArrayLiteralExpression(p)) return 'report:array'
    if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
      const name = callName(p)
      if (/^set[A-Z]/.test(name) && !SETTER_OK.test(name)) return 'report:setter:' + name
      if (DENY_CALL.test(name)) return false
    }
    if (ts.isVariableDeclaration(p)) {
      const vn = p.name.getText(sf)
      if (!/(label|title|text|msg|message|hint|error|caption|note|subtitle|desc|placeholder|heading|cta)$/i.test(vn)) return 'report:var:' + vn
    }
    return true
  }

  function wrapLiteral(node, text, args) {
    const expr = args && args.length ? `t(${quote(text)}, ${args.join(', ')})` : `t(${quote(text)})`
    const inAttr = ts.isJsxAttribute(node.parent)
    edits.push({ start: node.getStart(sf), end: node.getEnd(), text: inAttr ? `{${expr}}` : expr })
  }

  function visit(node) {
    // Detect local bindings named `t` — they would shadow the import.
    if ((ts.isParameter(node) || ts.isVariableDeclaration(node) || ts.isBindingElement(node)) && node.name && ts.isIdentifier(node.name) && node.name.text === 't') tShadow = true

    if (ts.isJsxText(node)) {
      const raw = node.getText(sf)
      if (isUz(decode(raw))) {
        const m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/)
        const [, lead, body, trail] = m
        const text = decode(body.replace(/\s*\n\s*/g, ' '))
        const keep = (ws) => (ws && !ws.includes('\n') ? "{' '}" : ws)
        edits.push({ start: node.getStart(sf, true) , end: node.getEnd(), text: `${keep(lead)}{t(${quote(text)})}${keep(trail)}` })
        report.wrapped.push(text)
      }
      return
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text
      if (!isUz(text)) return
      const fnScope = inFunction(node)
      const p = node.parent
      if (ts.isJsxAttribute(p)) {
        if (!DENY_ATTRS.has(propName(p.name))) {
          wrapLiteral(node, text)
          report.wrapped.push(text)
        }
        return
      }
      if (!fnScope) {
        report.static.push(text)
        return
      }
      const ok = literalOk(node)
      if (ok === true) {
        wrapLiteral(node, text)
        report.wrapped.push(text)
      } else if (typeof ok === 'string') report.skipped.push(`${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} [${ok.slice(7)}] ${text}`)
      return
    }

    if (ts.isTemplateExpression(node)) {
      let text = node.head.text
      const args = []
      node.templateSpans.forEach((span, i) => {
        text += `{${i}}` + span.literal.text
        args.push(span.expression.getText(sf))
      })
      const plain = text.replace(/\{\d+\}/g, ' ')
      if (isUz(plain) && /[A-Za-z]{2,}/.test(plain) && inFunction(node)) {
        const ok = literalOk(node)
        const attrSlot = ts.isJsxExpression(node.parent) && ts.isJsxAttribute(node.parent.parent)
        if (ok === true && !(attrSlot && DENY_ATTRS.has(propName(node.parent.parent.name)))) {
          wrapLiteral(node, text, args)
          report.wrapped.push(text)
          // don't descend: nested literals are part of the args already
          return
        } else if (typeof ok === 'string') report.skipped.push(`${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} [${ok.slice(7)}] \`${text}\``)
      }
    }

    // {item.label} / {title} in JSX children or display attributes → {t(item.label)}
    if (ts.isJsxExpression(node) && node.expression) {
      const e = node.expression
      const p = node.parent
      const displaySlot = ts.isJsxElement(p) || ts.isJsxFragment(p) || (ts.isJsxAttribute(p) && DISPLAY.has(propName(p.name)))
      let name = ''
      if (ts.isPropertyAccessExpression(e)) name = e.name.text
      else if (ts.isIdentifier(e)) name = e.text
      // .map((item) => <li>{item}</li>) over string lists
      const listItem = ts.isIdentifier(e) && /^(item|p|f|s|feature|perk|line|word|tag|chip|point|bullet|reason|rule|hint|tip|note|b|x)$/.test(name)
      if (displaySlot && name && (DISPLAY.has(name) || listItem)) {
        edits.push({ start: e.getStart(sf), end: e.getEnd(), text: `t(${e.getText(sf)})` })
        report.members++
        return
      }
    }

    ts.forEachChild(node, visit)
  }
  visit(sf)

  if (!edits.length) return
  edits.sort((a, b) => b.start - a.start)
  let out = src
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end)
  if (tShadow) report.shadow.push(path.relative(ROOT, file))
  if (!/import \{[^}]*\bt\b[^}]*\} from '[./]+\/?i18n'/.test(out)) {
    const rel = path.relative(path.dirname(file), path.join(ROOT, 'i18n')).replace(/\\/g, '/')
    const spec = rel.startsWith('.') ? rel : './' + rel
    const imports = [...sf.statements].filter((s) => ts.isImportDeclaration(s))
    const line = `import { t } from '${spec}'\n`
    if (imports.length) {
      const last = imports[imports.length - 1]
      const pos = last.getEnd()
      out = out.slice(0, pos) + '\n' + line.trimEnd() + out.slice(pos)
    } else out = line + out
  }
  report.files.push(path.relative(ROOT, file))
  if (WRITE) fs.writeFileSync(file, out)
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'locales' && e.name !== 'i18n') walk(p, acc)
    } else if (/\.jsx$/.test(e.name)) acc.push(p)
  }
  return acc
}

const files = argFiles.length ? argFiles.map((f) => path.resolve(f)) : walk(ROOT)
const report = { wrapped: [], static: [], skipped: [], shadow: [], files: [], members: 0 }
for (const f of files) processFile(f, report)
console.log(`files changed: ${report.files.length}`)
console.log(`wrapped literals: ${report.wrapped.length} (unique ${new Set(report.wrapped).size})`)
console.log(`wrapped member/ident render sites: ${report.members}`)
console.log(`module-scope literals (not wrapped): ${report.static.length}`)
console.log(`files with local 't' binding: ${report.shadow.join(', ')}`)
const out = process.env.REPORT_DIR || __dirname
fs.writeFileSync(path.join(out, 'skipped.txt'), report.skipped.join('\n'))
fs.writeFileSync(path.join(out, 'static.txt'), [...new Set(report.static)].join('\n'))
fs.writeFileSync(path.join(out, 'wrapped.txt'), [...new Set(report.wrapped)].join('\n'))
