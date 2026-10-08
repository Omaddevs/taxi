// Resizes/compresses a picked photo in the browser and returns a data: URI, so listings can
// store photos in a plain JSON column without a file-upload backend (same as the admin panel).
export function fileToImageDataUrl(file, maxSize = 960, quality = 0.8) {
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
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
