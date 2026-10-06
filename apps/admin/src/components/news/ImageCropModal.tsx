import { useCallback, useEffect, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Crop, Loader2, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'
import { api, API_BASE } from '../../lib/api'

const ASPECTS: { label: string; value: number | null }[] = [
  { label: 'Erkin', value: null },
  { label: '16:9', value: 16 / 9 },
  { label: '16:10', value: 16 / 10 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  { label: '3:4', value: 3 / 4 },
]

const MAX_SIDE = 1800

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Rasmni o‘qib bo‘lmadi'))
    img.src = src
  })
}

// Kesilgan (va burilgan) qismni canvas orqali chizib, WebP sifatida qaytaradi.
async function renderCrop(src: string, area: Area, rotation: number) {
  const img = await loadImage(src)
  const rad = (rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const bw = img.width * cos + img.height * sin
  const bh = img.width * sin + img.height * cos

  const full = document.createElement('canvas')
  full.width = Math.round(bw)
  full.height = Math.round(bh)
  const fctx = full.getContext('2d')!
  fctx.translate(bw / 2, bh / 2)
  fctx.rotate(rad)
  fctx.drawImage(img, -img.width / 2, -img.height / 2)

  const scale = Math.min(1, MAX_SIDE / Math.max(area.width, area.height))
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(area.width * scale))
  out.height = Math.max(1, Math.round(area.height * scale))
  out.getContext('2d')!.drawImage(full, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height)
  return { dataUrl: out.toDataURL('image/webp', 0.85), width: out.width, height: out.height }
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error ?? new Error('Faylni o‘qib bo‘lmadi'))
    r.readAsDataURL(file)
  })
}

export async function uploadNewsImage(dataUrl: string, width?: number, height?: number) {
  const res = await api.post<{ id: string }>('/admin/news/images', { dataUrl, width, height })
  return `${API_BASE}/news/images/${res.id}`
}

/**
 * Rasm kesish oynasi. `lockAspect` berilsa (masalan muqova 16:10), nisbatni o‘zgartirib bo‘lmaydi.
 * `onDone` yuklangan rasmning manzilini qaytaradi.
 */
export function ImageCropModal({
  src,
  title = 'Rasmni kesish',
  lockAspect,
  queueInfo,
  onDone,
  onSkip,
  onCancel,
}: {
  src: string
  title?: string
  lockAspect?: number
  queueInfo?: string
  onDone: (url: string) => void
  onSkip?: () => void
  onCancel: () => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [aspect, setAspect] = useState<number | null>(lockAspect ?? 16 / 9)
  const [natural, setNatural] = useState<number>(16 / 9)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadImage(src)
      .then((img) => setNatural(img.width / img.height))
      .catch(() => setError('Rasmni o‘qib bo‘lmadi'))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
  }, [src])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), [])

  async function apply() {
    if (!area) return
    setBusy(true)
    setError('')
    try {
      const out = await renderCrop(src, area, rotation)
      onDone(await uploadNewsImage(out.dataUrl, out.width, out.height))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rasmni saqlab bo‘lmadi')
    } finally {
      setBusy(false)
    }
  }

  const effectiveAspect = aspect ?? natural

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
              <Crop className="h-4 w-4" />
            </span>
            <div>
              <p className="font-extrabold text-ink">{title}</p>
              {queueInfo ? <p className="text-xs text-muted">{queueInfo}</p> : null}
            </div>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink" aria-label="Yopish">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative h-[52vh] min-h-[280px] bg-[#14181e]">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={effectiveAspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            showGrid
            objectFit="contain"
            style={{ cropAreaStyle: { border: '2px solid #00c7d4', boxShadow: '0 0 0 9999em rgba(10,14,20,0.6)' } }}
          />
        </div>

        <div className="space-y-4 px-5 py-4">
          {!lockAspect ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-20 text-xs font-bold uppercase tracking-wide text-muted">Nisbat</span>
              {ASPECTS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => setAspect(a.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-semibold transition',
                    aspect === a.value ? 'bg-brand text-ink' : 'bg-canvas text-ink hover:bg-line',
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <span className="w-20 text-xs font-bold uppercase tracking-wide text-muted">Masshtab</span>
            <ZoomOut className="h-4 w-4 text-muted" />
            <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[#00c7d4]" aria-label="Masshtab" />
            <ZoomIn className="h-4 w-4 text-muted" />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 text-xs font-bold uppercase tracking-wide text-muted">Burish</span>
            <button type="button" onClick={() => setRotation((r) => (r - 90 + 360) % 360)} className="rounded-lg p-1.5 text-ink hover:bg-canvas" aria-label="Chapga 90°">
              <RotateCcw className="h-4 w-4" />
            </button>
            <input type="range" min={0} max={360} step={1} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="flex-1 accent-[#00c7d4]" aria-label="Burish" />
            <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="rounded-lg p-1.5 text-ink hover:bg-canvas" aria-label="O‘ngga 90°">
              <RotateCw className="h-4 w-4" />
            </button>
            <span className="w-10 text-right text-xs font-semibold text-muted">{rotation}°</span>
          </div>
          {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-canvas/50 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              setCrop({ x: 0, y: 0 })
              setZoom(1)
              setRotation(0)
            }}
            className="text-sm font-semibold text-muted hover:text-ink"
          >
            Asl holatiga qaytarish
          </button>
          <div className="flex gap-2">
            {onSkip ? (
              <Button variant="ghost" onClick={onSkip} disabled={busy}>
                O‘tkazib yuborish
              </Button>
            ) : null}
            <Button variant="outline" onClick={onCancel} disabled={busy}>
              Bekor qilish
            </Button>
            <Button onClick={apply} disabled={busy || !area}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crop className="h-4 w-4" />}
              {busy ? 'Yuklanmoqda…' : 'Kesish va qo‘shish'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
