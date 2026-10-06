import { useEffect, useRef, useState, type ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { BackgroundColor, Color, TextStyle } from '@tiptap/extension-text-style'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { Image } from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extension-placeholder'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  ChevronDown,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Replace,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { fileToDataUrl, ImageCropModal } from './ImageCropModal'

// ── Rasm: o‘lcham (25–100%) va joylashuv (chap/markaz/o‘ng) atributlari bilan ─────────────

const NewsImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: '100',
        parseHTML: (el) => el.getAttribute('data-size') || '100',
        renderHTML: (attrs) => ({ 'data-size': attrs.size }),
      },
      align: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') || 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs.align }),
      },
    }
  },
}).configure({ inline: false, allowBase64: false })

// ── Ranglar ───────────────────────────────────────────────────────────────────────────────

const TEXT_COLORS = ['#1d2229', '#6b7280', '#00a3ae', '#00c7d4', '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#ef4444', '#f97316', '#f59e0b', '#ffffff']
const HIGHLIGHT_COLORS = ['#e0f9fb', '#c4f1f4', '#dcfce7', '#dbeafe', '#ede9fe', '#fce7f3', '#fee2e2', '#ffedd5', '#fef3c7', '#f3f4f6']

// ── Kichik qismlar ────────────────────────────────────────────────────────────────────────

function Btn({ active, disabled, onClick, label, children }: { active?: boolean; disabled?: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg px-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-35',
        active ? 'bg-brand-soft text-brand-dark' : 'text-ink/75 hover:bg-canvas hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

const Sep = () => <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden="true" />

function Popover({ button, children, open, setOpen }: { button: ReactNode; children: ReactNode; open: boolean; setOpen: (v: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])
  return (
    <div ref={ref} className="relative">
      {button}
      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 rounded-2xl bg-white p-3 shadow-[0_20px_44px_-12px_rgba(15,29,42,0.35)] ring-1 ring-black/5">{children}</div>
      ) : null}
    </div>
  )
}

function ColorPicker({
  editor,
  kind,
  open,
  setOpen,
}: {
  editor: Editor
  kind: 'text' | 'highlight'
  open: boolean
  setOpen: (v: boolean) => void
}) {
  const current: string | undefined =
    kind === 'text' ? editor.getAttributes('textStyle').color : editor.getAttributes('highlight').color
  const colors = kind === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS

  function apply(color: string | null) {
    const chain = editor.chain().focus()
    if (kind === 'text') {
      if (color) chain.setColor(color).run()
      else chain.unsetColor().run()
    } else if (color) chain.setHighlight({ color }).run()
    else chain.unsetHighlight().run()
  }

  return (
    <Popover
      open={open}
      setOpen={setOpen}
      button={
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen(!open)}
          title={kind === 'text' ? 'Matn rangi' : 'Fon rangi (belgilash)'}
          aria-label={kind === 'text' ? 'Matn rangi' : 'Fon rangi'}
          className="flex h-9 items-center gap-0.5 rounded-lg px-2 text-ink/75 transition hover:bg-canvas hover:text-ink"
        >
          <span className="flex flex-col items-center">
            {kind === 'text' ? <Baseline className="h-4 w-4" /> : <Highlighter className="h-4 w-4" />}
            <span className="mt-0.5 h-1 w-4 rounded-full ring-1 ring-black/10" style={{ background: current || (kind === 'text' ? '#1d2229' : 'transparent') }} />
          </span>
          <ChevronDown className="h-3 w-3" />
        </button>
      }
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{kind === 'text' ? 'Matn rangi' : 'Fon rangi'}</p>
      <div className="grid w-[184px] grid-cols-6 gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              apply(c)
              setOpen(false)
            }}
            title={c}
            className={cn(
              'h-7 w-7 rounded-lg ring-1 ring-black/10 transition hover:scale-110',
              current?.toLowerCase() === c ? 'ring-2 ring-ink ring-offset-1' : '',
            )}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold text-ink hover:bg-canvas">
          <input
            type="color"
            defaultValue={current || '#00c7d4'}
            onChange={(e) => apply(e.target.value)}
            className="h-7 w-7 cursor-pointer rounded-md border-0 bg-transparent p-0"
          />
          Boshqa rang
        </label>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            apply(null)
            setOpen(false)
          }}
          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-muted hover:bg-canvas hover:text-ink"
        >
          Olib tashlash
        </button>
      </div>
    </Popover>
  )
}

function LinkPopover({ editor, open, setOpen }: { editor: Editor; open: boolean; setOpen: (v: boolean) => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (open) setUrl(editor.getAttributes('link').href ?? '')
  }, [open, editor])

  function save() {
    const v = url.trim()
    if (!v) editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else {
      const href = /^(https?:|mailto:|tel:)/i.test(v) ? v : `https://${v}`
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    }
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      setOpen={setOpen}
      button={
        <Btn active={editor.isActive('link')} onClick={() => setOpen(!open)} label="Havola qo‘shish">
          <Link2 className="h-4 w-4" />
        </Btn>
      }
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Havola</p>
      <div className="flex w-72 gap-2">
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              save()
            }
          }}
          placeholder="https://…"
          className="h-9 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
        />
        <button type="button" onClick={save} className="h-9 rounded-lg bg-brand px-3 text-sm font-bold text-ink hover:bg-[#00b6c2]">
          OK
        </button>
      </div>
      {editor.isActive('link') ? (
        <button
          type="button"
          onClick={() => {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            setOpen(false)
          }}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:underline"
        >
          <Link2Off className="h-3.5 w-3.5" /> Havolani olib tashlash
        </button>
      ) : null}
    </Popover>
  )
}

// ── Muharrir ──────────────────────────────────────────────────────────────────────────────

export function RichEditor({
  value,
  onChange,
  onStats,
  invalid,
}: {
  value: string
  onChange: (html: string) => void
  onStats?: (s: { words: number; chars: number }) => void
  invalid?: boolean
}) {
  const [cropQueue, setCropQueue] = useState<string[]>([])
  const [replaceMode, setReplaceMode] = useState(false)
  const [pop, setPop] = useState<'text' | 'highlight' | 'link' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const lastEmitted = useRef(value)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      TextStyle,
      Color,
      BackgroundColor,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      NewsImage,
      Placeholder.configure({ placeholder: 'Yangilik matnini yozing… Rasm qo‘shish uchun uni shu yerga tashlang yoki joylang (Ctrl+V).' }),
    ],
    content: value,
    editorProps: {
      attributes: { class: 'news-content min-h-[460px] px-6 py-6 outline-none lg:px-10 lg:py-8' },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'))
        if (!files.length) return false
        event.preventDefault()
        queueFiles(files)
        return true
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
        if (!files.length) return false
        queueFiles(files)
        return true
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? '' : ed.getHTML()
      lastEmitted.current = html
      onChange(html)
    },
  })

  // Tashqaridan kelgan qiymat (masalan, yangilik yuklanganda) muharrirga qo‘yiladi.
  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      lastEmitted.current = value
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return null
      const text = ed.getText()
      return {
        block: ed.isActive('heading', { level: 2 }) ? 'h2' : ed.isActive('heading', { level: 3 }) ? 'h3' : 'p',
        bold: ed.isActive('bold'),
        italic: ed.isActive('italic'),
        underline: ed.isActive('underline'),
        strike: ed.isActive('strike'),
        bullet: ed.isActive('bulletList'),
        ordered: ed.isActive('orderedList'),
        quote: ed.isActive('blockquote'),
        align: (['left', 'center', 'right', 'justify'] as const).find((a) => ed.isActive({ textAlign: a })) ?? 'left',
        image: ed.isActive('image') ? (ed.getAttributes('image') as { size: string; align: string }) : null,
        canUndo: ed.can().undo(),
        canRedo: ed.can().redo(),
        words: text.split(/\s+/).filter(Boolean).length,
        chars: text.length,
      }
    },
  })

  useEffect(() => {
    if (state && onStats) onStats({ words: state.words, chars: state.chars })
  }, [state?.words, state?.chars]) // eslint-disable-line react-hooks/exhaustive-deps

  async function queueFiles(files: File[]) {
    const urls = await Promise.all(files.map(fileToDataUrl))
    setCropQueue((q) => [...q, ...urls])
  }

  function insertImage(url: string) {
    if (!editor) return
    if (replaceMode && editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', { src: url }).run()
    } else {
      // Belgilangan rasm o‘rniga emas, undan keyin qo‘shiladi — ketma-ket bir nechta rasm yo‘qolmaydi.
      const { to } = editor.state.selection
      editor
        .chain()
        .focus()
        .insertContentAt(to, [{ type: 'image', attrs: { src: url, alt: '' } }, { type: 'paragraph' }])
        .run()
    }
  }

  function nextInQueue() {
    setCropQueue((q) => q.slice(1))
    if (cropQueue.length <= 1) setReplaceMode(false)
  }

  if (!editor || !state) return null
  const e = editor
  const setBlock = (b: string) => {
    if (b === 'p') e.chain().focus().setParagraph().run()
    else e.chain().focus().toggleHeading({ level: b === 'h2' ? 2 : 3 }).run()
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-white', invalid ? 'border-red-300' : 'border-line')}>
      {/* Asboblar paneli */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 border-b border-line bg-white/95 px-2 py-1.5 backdrop-blur">
        <Btn onClick={() => e.chain().focus().undo().run()} disabled={!state.canUndo} label="Bekor qilish (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Btn>
        <Btn onClick={() => e.chain().focus().redo().run()} disabled={!state.canRedo} label="Qaytarish (Ctrl+Y)">
          <Redo2 className="h-4 w-4" />
        </Btn>
        <Sep />
        <select
          value={state.block}
          onChange={(ev) => setBlock(ev.target.value)}
          aria-label="Matn turi"
          className="h-9 rounded-lg border-0 bg-transparent px-2 text-sm font-semibold text-ink outline-none hover:bg-canvas"
        >
          <option value="p">Oddiy matn</option>
          <option value="h2">Sarlavha</option>
          <option value="h3">Kichik sarlavha</option>
        </select>
        <Sep />
        <Btn active={state.bold} onClick={() => e.chain().focus().toggleBold().run()} label="Qalin (Ctrl+B)">
          <Bold className="h-4 w-4" />
        </Btn>
        <Btn active={state.italic} onClick={() => e.chain().focus().toggleItalic().run()} label="Kursiv (Ctrl+I)">
          <Italic className="h-4 w-4" />
        </Btn>
        <Btn active={state.underline} onClick={() => e.chain().focus().toggleUnderline().run()} label="Tagiga chizish (Ctrl+U)">
          <UnderlineIcon className="h-4 w-4" />
        </Btn>
        <Btn active={state.strike} onClick={() => e.chain().focus().toggleStrike().run()} label="Ustidan chizish">
          <Strikethrough className="h-4 w-4" />
        </Btn>
        <ColorPicker editor={e} kind="text" open={pop === 'text'} setOpen={(v) => setPop(v ? 'text' : null)} />
        <ColorPicker editor={e} kind="highlight" open={pop === 'highlight'} setOpen={(v) => setPop(v ? 'highlight' : null)} />
        <Sep />
        <Btn active={state.align === 'left'} onClick={() => e.chain().focus().setTextAlign('left').run()} label="Chapga">
          <AlignLeft className="h-4 w-4" />
        </Btn>
        <Btn active={state.align === 'center'} onClick={() => e.chain().focus().setTextAlign('center').run()} label="Markazga">
          <AlignCenter className="h-4 w-4" />
        </Btn>
        <Btn active={state.align === 'right'} onClick={() => e.chain().focus().setTextAlign('right').run()} label="O‘ngga">
          <AlignRight className="h-4 w-4" />
        </Btn>
        <Btn active={state.align === 'justify'} onClick={() => e.chain().focus().setTextAlign('justify').run()} label="Ikki tomonga">
          <AlignJustify className="h-4 w-4" />
        </Btn>
        <Sep />
        <Btn active={state.bullet} onClick={() => e.chain().focus().toggleBulletList().run()} label="Ro‘yxat">
          <List className="h-4 w-4" />
        </Btn>
        <Btn active={state.ordered} onClick={() => e.chain().focus().toggleOrderedList().run()} label="Raqamli ro‘yxat">
          <ListOrdered className="h-4 w-4" />
        </Btn>
        <Btn active={state.quote} onClick={() => e.chain().focus().toggleBlockquote().run()} label="Iqtibos">
          <Quote className="h-4 w-4" />
        </Btn>
        <Btn onClick={() => e.chain().focus().setHorizontalRule().run()} label="Ajratuvchi chiziq">
          <Minus className="h-4 w-4" />
        </Btn>
        <Sep />
        <LinkPopover editor={e} open={pop === 'link'} setOpen={(v) => setPop(v ? 'link' : null)} />
        <Btn
          onClick={() => {
            setReplaceMode(false)
            fileRef.current?.click()
          }}
          label="Rasm qo‘shish (bir nechta tanlash mumkin)"
        >
          <ImagePlus className="h-4 w-4" />
          <span className="hidden xl:inline">Rasm</span>
        </Btn>
        <Btn onClick={() => e.chain().focus().unsetAllMarks().clearNodes().run()} label="Formatlashni tozalash">
          <Eraser className="h-4 w-4" />
        </Btn>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple={!replaceMode}
          className="hidden"
          onChange={(ev) => {
            const files = Array.from(ev.target.files ?? []).filter((f) => f.type.startsWith('image/'))
            ev.target.value = ''
            if (files.length) queueFiles(files)
          }}
        />
      </div>

      {/* Rasm tanlanganda — rasm paneli */}
      {state.image ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-line bg-brand-soft/50 px-3 py-1.5">
          <span className="mr-2 text-xs font-bold uppercase tracking-wide text-brand-dark">Rasm</span>
          {['25', '50', '75', '100'].map((s) => (
            <Btn key={s} active={state.image?.size === s} onClick={() => e.chain().focus().updateAttributes('image', { size: s }).run()} label={`Kenglik ${s}%`}>
              {s}%
            </Btn>
          ))}
          <Sep />
          {(
            [
              ['left', AlignLeft, 'Chapda'],
              ['center', AlignCenter, 'Markazda'],
              ['right', AlignRight, 'O‘ngda'],
            ] as const
          ).map(([a, Icon, label]) => (
            <Btn key={a} active={state.image?.align === a} onClick={() => e.chain().focus().updateAttributes('image', { align: a }).run()} label={label}>
              <Icon className="h-4 w-4" />
            </Btn>
          ))}
          <Sep />
          <Btn
            onClick={() => {
              setReplaceMode(true)
              fileRef.current?.click()
            }}
            label="Almashtirish"
          >
            <Replace className="h-4 w-4" /> <span className="hidden sm:inline">Almashtirish</span>
          </Btn>
          <Btn onClick={() => e.chain().focus().deleteSelection().run()} label="Rasmni o‘chirish">
            <Trash2 className="h-4 w-4 text-red-500" />
          </Btn>
        </div>
      ) : null}

      <EditorContent editor={e} />

      {cropQueue[0] ? (
        <ImageCropModal
          src={cropQueue[0]}
          title={replaceMode ? 'Rasmni almashtirish' : 'Rasmni kesish'}
          queueInfo={cropQueue.length > 1 ? `Navbatda yana ${cropQueue.length - 1} ta rasm` : undefined}
          onDone={(url) => {
            insertImage(url)
            nextInQueue()
          }}
          onSkip={cropQueue.length > 1 ? nextInQueue : undefined}
          onCancel={() => {
            setCropQueue([])
            setReplaceMode(false)
          }}
        />
      ) : null}
    </div>
  )
}
