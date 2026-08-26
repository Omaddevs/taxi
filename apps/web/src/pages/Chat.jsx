import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Phone, Send } from 'lucide-react'
import { api } from '../lib/api'
import { useSocket } from '../lib/socket'

export default function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const endRef = useRef(null)

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations'),
  })
  const conv = conversations.find((c) => c.id === id)

  const { data: rawMessages = [] } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.get(`/conversations/${id}/messages`),
  })
  const messages = [...rawMessages].reverse()

  const socket = useSocket({
    'chat:message': (message) => {
      if (message.conversationId !== id) return
      queryClient.setQueryData(['messages', id], (prev = []) => [message, ...prev])
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  useEffect(() => {
    socket.emit('conversation:join', id)
  }, [socket, id])

  useEffect(() => {
    api.patch(`/conversations/${id}/read`).catch(() => {})
  }, [id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const sendMessage = useMutation({
    mutationFn: (value) => api.post(`/conversations/${id}/messages`, { text: value }),
    onSuccess: (message) => {
      queryClient.setQueryData(['messages', id], (prev = []) => [message, ...prev])
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  function send(e) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    setText('')
    sendMessage.mutate(value)
  }

  if (!conv) {
    return <p className="p-6 text-center text-sm text-muted">Yuklanmoqda…</p>
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
        {conv.otherParticipant?.avatarUrl ? (
          <img src={conv.otherParticipant.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-sm font-extrabold text-brand">
            TL
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold">{conv.otherParticipant?.name || conv.otherParticipant?.phone}</p>
        </div>
        <a
          href={`tel:${(conv.otherParticipant?.phone || '').replace(/\s/g, '')}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm shadow-brand/30"
          aria-label="Qo‘ng‘iroq qilish"
        >
          <Phone className="h-5 w-5" />
        </a>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-4">
        {messages.map((m) => {
          const mine = m.senderId !== conv.otherParticipant?.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-[0_2px_8px_rgba(28,28,40,0.05)] ${
                  mine ? 'bg-brand text-white' : 'bg-white'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>
                  {new Date(m.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
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
