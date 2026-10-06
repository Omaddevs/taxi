import sanitizeHtml from 'sanitize-html'

// Admin muharriri (Tiptap) chiqaradigan HTML uchun oq ro‘yxat. Saytda bu HTML to‘g‘ridan-to‘g‘ri
// chiqariladi, shuning uchun skript, iframe, on* atributlar, javascript: havolalar va boshqa
// har qanday narsa saqlashdan oldin olib tashlanadi.
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i
const ALIGN = /^(left|right|center|justify)$/

export function sanitizeNewsHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'hr', 'br', 'span', 'mark'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'data-size', 'data-align'],
      span: ['style'],
      mark: ['style', 'data-color'],
      p: ['style'],
      h2: ['style'],
      h3: ['style'],
    },
    allowedStyles: {
      span: { color: [COLOR], 'background-color': [COLOR] },
      mark: { color: [COLOR], 'background-color': [COLOR] },
      p: { 'text-align': [ALIGN] },
      h2: { 'text-align': [ALIGN] },
      h3: { 'text-align': [ALIGN] },
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          'data-size': ['25', '50', '75', '100'].includes(attribs['data-size']) ? attribs['data-size'] : '100',
          'data-align': ['left', 'center', 'right'].includes(attribs['data-align']) ? attribs['data-align'] : 'center',
        },
      }),
    },
  })
}

export function isHtmlBody(body: string) {
  return /^\s*</.test(body)
}

export function plainText(body: string) {
  return isHtmlBody(body) ? sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, ' ') : body
}
