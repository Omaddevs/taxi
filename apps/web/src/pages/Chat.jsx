import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Phone, Send } from 'lucide-react'
import { chatMessages, conversations } from '../data/mock'

export default function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const conv = conversations.find((c) => c.id === id) || conversations[0]
  const [text, setText] = useState('')
  const [messages, setMessages] = useState(chatMessages[conv.id] || [])
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const send = (e) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    setMessages((prev) => [...prev, { id: Date.now(), from: 'me', text: value, time: 'hozir' }])
    setText('')
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-4rem)] max-w-2xl flex-col bg-canvas lg:h-[calc(100svh-6rem)] lg:rounded-2xl">
      <header className="flex items-center gap-3 border-b border-line bg-white px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] lg:rounded-t-2xl lg:pt-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-canvas"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {conv.avatar ? (
          <img src={conv.avatar} alt="" className="h-10 w-10 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-sm font-extrabold text-brand">
            TL
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold">{conv.name}</p>
          <p className="truncate text-xs text-muted">
            {conv.online ? 'Onlayn' : 'Oxirgi ko‘rilgan yaqinda'} · {conv.role}
          </p>
        </div>
        <a
          href={`tel:${(conv.phone || '').replace(/\s/g, '')}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm shadow-brand/30"
          aria-label="Qo‘ng‘iroq qilish"
        >
          <Phone className="h-5 w-5" />
        </a>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-[0_2px_8px_rgba(28,28,40,0.05)] ${
                m.from === 'me' ? 'bg-brand text-white' : 'bg-white'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p className={`mt-1 text-[10px] ${m.from === 'me' ? 'text-white/70' : 'text-muted'}`}>{m.time}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="flex shrink-0 items-center gap-2 border-t border-line bg-white px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:rounded-b-2xl"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Xabar yozing..."
          className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-canvas px-4 outline-none focus:border-brand/40"
        />
        <button
          type="submit"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm shadow-brand/30 disabled:opacity-40"
          disabled={!text.trim()}
          aria-label="Yuborish"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}
