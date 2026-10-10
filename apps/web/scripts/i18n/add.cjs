// Adds or updates translations: node scripts/i18n/add.cjs <file.json>
// where file.json is { "<uz key>": ["<ru>", "<en>"], … }. A null value removes the key.
const fs = require('fs')
const path = require('path')

const I18N = path.resolve(__dirname, '../../src/i18n')
const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
for (const [i, lng] of ['ru', 'en'].entries()) {
  const file = path.join(I18N, `${lng}.json`)
  const dict = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const [key, value] of Object.entries(input)) {
    if (value === null) delete dict[key]
    else dict[key] = value[i]
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + '\n')
}
console.log(`updated ${Object.keys(input).length} keys`)
