// O‘zbek lotin → kirill transliteratsiyasi (1995-yilgi alifbo qoidalari asosida).
// Kirill tarjimasi alohida lug‘atsiz, shu funksiya orqali o‘zbekcha matndan yasaladi.

// Lotinda o‘zgacha yoziladigan, kirillda ruscha imlosi saqlanadigan so‘zlar.
const WORDS = {
  aksiya: 'акция',
  aksiyalar: 'акциялар',
  aksiyalari: 'акциялари',
  stansiya: 'станция',
  stansiyalar: 'станциялар',
  stansiyasi: 'станцияси',
  litsenziya: 'лицензия',
  sentabr: 'сентябр',
  oktabr: 'октябр',
  noyabr: 'ноябр',
  dekabr: 'декабр',
  yanvar: 'январ',
  fevral: 'феврал',
  aprel: 'апрел',
  iyun: 'июн',
  iyul: 'июл',
  moderatsiya: 'модерация',
  moderatsiyada: 'модерацияда',
  moderatsiyadan: 'модерациядан',
  lokatsiya: 'локация',
  navigatsiya: 'навигация',
  kompensatsiya: 'компенсация',
  registratsiya: 'регистрация',
  dispetcher: 'диспетчер',
  bonus: 'бонус',
  taxi: 'такси',
  taksi: 'такси',
}

// Kirillga o‘girilmaydigan nomlar (brend, texnik qisqartmalar).
const KEEP = new Set([
  'TaxiLine', 'Taxi', 'Line', 'Telegram', 'Google', 'Click', 'Payme', 'Uzum', 'Humo', 'Uzcard', 'Visa', 'Mastercard', 'Apple', 'Android', 'iOS',
  'WhatsApp', 'Instagram', 'Facebook', 'YouTube', 'Yandex', 'OpenStreetMap', 'GPS', 'SOS', 'AI', 'PRO', 'Plus', 'Premium', 'Start', 'PWA', 'ID', 'SMS',
  'HTTPS', 'IP', 'API', 'EV', 'QR', 'Wi-Fi', 'Email', 'email', 'Chevrolet', 'Cobalt', 'Gentra', 'Lacetti', 'Spark', 'Captiva', 'Malibu', 'XL', 'Daewoo',
  'Nexia', 'R3', 'Damas', 'Labo', 'Yadea', 'Xiaomi', 'Ninebot', 'Segway', 'BYD', 'Kia', 'Hyundai', 'Tesla', 'Bank', 'Admin', 'Bot', 'Cash',
])

const VOWELS = 'aeiouAEIOU'
const APOS = '‘ʻ’\'`ʼ'

const SINGLE = {
  a: 'а', b: 'б', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с',
  t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з', c: 'ц', w: 'в',
}

function convertWord(word) {
  const lower = word.toLowerCase().replace(/[‘ʻ’'`ʼ]/g, '‘')
  if (WORDS[lower]) {
    const out = WORDS[lower]
    if (word === word.toUpperCase()) return out.toUpperCase()
    return word[0] === word[0].toUpperCase() ? out[0].toUpperCase() + out.slice(1) : out
  }
  let out = ''
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]
    const lo = ch.toLowerCase()
    const next = word[i + 1] || ''
    const nextLo = next.toLowerCase()
    const prev = word[i - 1] || ''
    const atStart = i === 0
    // Katta-kichik harf manba harfidan olinadi: Sh → Ш, ya → я, YO → Ё
    const push = (src, cyr) => {
      out += src[0] === src[0].toLowerCase() ? cyr : cyr.toUpperCase()
    }

    // o‘ / g‘
    if ((lo === 'o' || lo === 'g') && APOS.includes(next) && next) {
      push(ch, lo === 'o' ? 'ў' : 'ғ')
      i++
      continue
    }
    // tutuq belgisi → ъ
    if (APOS.includes(ch)) {
      if (prev && /[A-Za-z]/.test(prev) && next && /[A-Za-z]/.test(next)) out += prev === prev.toUpperCase() && next === next.toUpperCase() ? 'Ъ' : 'ъ'
      else out += ch
      continue
    }
    if (lo === 's' && nextLo === 'h') {
      push(ch + next, 'ш')
      i++
      continue
    }
    if (lo === 'c' && nextLo === 'h') {
      push(ch + next, 'ч')
      i++
      continue
    }
    if (lo === 'y') {
      // yo‘ → йў (ё emas)
      if (nextLo === 'o' && APOS.includes(word[i + 2] || '')) {
        push(ch, 'й')
        continue
      }
      const map = { o: 'ё', u: 'ю', a: 'я', e: 'е' }
      if (map[nextLo]) {
        push(ch + next, map[nextLo])
        i++
        continue
      }
    }
    if (lo === 't' && nextLo === 's' && /^iya/i.test(word.slice(i + 2))) {
      push(ch, 'ц')
      i++
      continue
    }
    if (lo === 'e') {
      push(ch, atStart || VOWELS.includes(prev) ? 'э' : 'е')
      continue
    }
    if (SINGLE[lo]) {
      push(ch, SINGLE[lo])
      continue
    }
    out += ch
  }
  return out
}

const TOKEN = /(https?:\/\/\S+|[\w.+-]+@[\w-]+\.[\w.]+|@\w+|\{\d+\}|[\w.-]+\.(?:uz|com|ru|org|net)\b|[A-Za-z]+(?:[‘ʻ’'`ʼ][A-Za-z]+)*[‘ʻ’'`ʼ]?)/g

export function toCyrillic(text) {
  if (!text) return text
  return text.replace(TOKEN, (tok) => {
    if (!/^[A-Za-z]/.test(tok) || /[/@.]/.test(tok) || KEEP.has(tok)) return tok
    // Brend + qo‘shimcha: TaxiLine’ga → TaxiLine’га
    for (const k of KEEP) {
      if (k.length > 2 && tok.startsWith(k) && tok.length > k.length) {
        const rest = tok.slice(k.length)
        if (/^[‘ʻ’'`ʼ]/.test(rest)) return k + rest[0] + convertWord(rest.slice(1))
      }
    }
    // Lotincha qisqartmalar (raqamli): "1C", "A4" va h.k. — o‘zgarishsiz
    if (/^[A-Z]{2,}$/.test(tok) && tok.length <= 4 && !/[AEIOU]/.test(tok)) return tok
    return convertWord(tok)
  })
}
