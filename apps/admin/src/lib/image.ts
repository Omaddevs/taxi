// Resizes/compresses a picked image file client-side and returns it as a data: URI, so it can be
// stored directly in a plain string column (e.g. Car.imageUrl) without needing a file-upload
// backend.
//
// WebP first (keeps transparency for car cut-outs). Safari can't *encode* WebP — its canvas
// silently hands back a huge PNG instead — so then we fall back to PNG (if it fits and
// transparency matters) or JPEG on white. Quality, then size, is lowered until the result fits
// `maxChars`, so the server's size limit is never hit.

export interface ImageOptions {
  maxSize?: number
  quality?: number
  /** Upper bound for the data: URI length (≈ 0.75 × bytes). */
  maxChars?: number
  /** Keep transparency where possible (car cut-outs). */
  keepAlpha?: boolean
}

function loadImage(file: File): Promise<HTMLImageElement> {
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
      reject(new Error(heic ? 'HEIC formatdagi rasm ochilmadi. JPG yoki PNG tanlang' : 'Rasmni ochib bo‘lmadi. JPG, PNG yoki WEBP tanlang'))
    }
    img.src = url
  })
}

function encode(img: HTMLImageElement, side: number, type: string, quality: number, background?: string) {
  const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Brauzer rasmni qayta ishlay olmadi')
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL(type, quality)
}

export async function fileToImageDataUrl(file: File, maxSize = 480, quality = 0.82, opts: ImageOptions = {}): Promise<string> {
  const { maxChars = 700_000, keepAlpha = false } = opts
  const img = await loadImage(file)

  let side = maxSize
  for (let attempt = 0; attempt < 8; attempt++) {
    const q = Math.max(0.5, quality - attempt * 0.08)
    const webp = encode(img, side, 'image/webp', q)
    if (webp.startsWith('data:image/webp')) {
      if (webp.length <= maxChars) return webp
    } else {
      // No WebP encoder (Safari).
      if (keepAlpha) {
        const png = encode(img, side, 'image/png', 1)
        if (png.length <= maxChars) return png
      }
      const jpeg = encode(img, side, 'image/jpeg', q, '#ffffff')
      if (jpeg.length <= maxChars) return jpeg
    }
    if (attempt >= 2) side = Math.round(side * 0.8)
  }
  throw new Error('Rasm juda katta. Kichikroq rasm tanlang')
}
