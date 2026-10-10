import { t } from '../i18n'
// Resizes/compresses a picked photo in the browser and returns a data: URI, so listings can
// store photos in a plain JSON column without a file-upload backend (same as the admin panel).
//
// WebP first; Safari can't encode WebP (its canvas silently returns a huge PNG), so then JPEG
// on white. Quality, then size, drops until the result fits `maxChars` — the server never sees
// an oversized photo.

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      const heic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
      reject(new Error(heic ? t('HEIC formatdagi rasm ochilmadi. JPG yoki PNG tanlang') : t('Rasmni ochib bo‘lmadi. JPG, PNG yoki WEBP tanlang')))
    }
    img.src = url
  })
}

function encode(img, side, type, quality, background) {
  const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(t('Brauzer rasmni qayta ishlay olmadi'))
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL(type, quality)
}

export async function fileToImageDataUrl(file, maxSize = 960, quality = 0.8, maxChars = 700_000) {
  const img = await loadImage(file)
  let side = maxSize
  for (let attempt = 0; attempt < 8; attempt++) {
    const q = Math.max(0.5, quality - attempt * 0.08)
    const webp = encode(img, side, 'image/webp', q)
    const out = webp.startsWith('data:image/webp') ? webp : encode(img, side, 'image/jpeg', q, '#ffffff')
    if (out.length <= maxChars) return out
    if (attempt >= 2) side = Math.round(side * 0.8)
  }
  throw new Error(t('Rasm juda katta. Kichikroq rasm tanlang'))
}
