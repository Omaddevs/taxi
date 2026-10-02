// Resizes/compresses a picked image file client-side and returns it as a data: URI, so it can be
// stored directly in a plain string column (e.g. Car.imageUrl) without needing a file-upload
// backend. Downscaling keeps the resulting payload reasonable for a text column.
// WebP keeps transparency (car cut-outs would get a black background as JPEG).
export function fileToImageDataUrl(file: File, maxSize = 480, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Faylni o‘qib bo‘lmadi'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Rasmni o‘qib bo‘lmadi'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas mavjud emas'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/webp', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
