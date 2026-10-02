import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CheckCheck, Paperclip, Phone, Send } from 'lucide-react'
import { api } from '../lib/api'
import { useSocket } from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import { LocationPreview } from '../components/chat/LocationPreview'
import { ChatAttachSheet } from '../components/chat/ChatAttachSheet'

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(iso) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Bugun'
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Kecha'
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })
}

function prependMessage(prev = [], message) {
  if (prev.some((m) => m.id === message.id)) return prev
  return [message, ...prev]
}

const LOCATION_REQUEST_TEXT = '📍 Manzilingizni yuboring'

export default function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const queryClient = useQueryClient()
  const { authUser } = useAuth()
  const [text, setText] = useState('')
  const [attachOpen, setAttachOpen] = useState(false)
  const endRef = useRef(null)
  const inDriver = pathname.startsWith('/driver')

  const { data: conv, isLoading } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.get(`/conversations/${id}`),
    enabled: Boolean(id),
  })

  const { data: rawMessages = [] } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.get(`/conversations/${id}/messages`),
    enabled: Boolean(id),
  })
  const messages = useMemo(() => [...rawMessages].reverse(), [rawMessages])

  const socket = useSocket({
    'chat:message': (message) => {
      if (message.conversationId !== id) return
      queryClient.setQueryData(['messages', id], (prev) => prependMessage(prev, message))
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversation', id] })
    },
    'chat:read': (payload) => {
      if (payload?.conversationId !== id) return
      if (payload.readBy === authUser?.id) return
      queryClient.setQueryData(['messages', id], (prev = []) =>
        prev.map((m) =>
          m.senderId === authUser?.id && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
        ),
      )
    },
  })

  useEffect(() => {
    socket.emit('conversation:join', id)
  }, [socket, id])

  useEffect(() => {
    api.patch(`/conversations/${id}/read`).catch(() => {})
  }, [id, rawMessages.length])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const sendMessage = useMutation({
    mutationFn: (body) => api.post(`/conversations/${id}/messages`, body),
    onSuccess: (message) => {
      queryClient.setQueryData(['messages', id], (prev) => prependMessage(prev, message))
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  function send(e) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    setText('')
    sendMessage.mutate({ type: 'TEXT', text: value })
  }

  function sendLocation({ lat, lng, locationLabel }) {
    sendMessage.mutate({ type: 'LOCATION', lat, lng, locationLabel })
  }

  if (isLoading || !conv) {
    return <p className="p-6 text-center text-sm text-muted">Yuklanmoqda…</p>
  }

  const name = conv.otherParticipant?.name || conv.otherParticipant?.phone || 'Suhbat'
  const initial = String(name).slice(0, 2).toUpperCase()

  return (
    <div className="mx-auto flex h-svh max-w-lg flex-col bg-[#efeae2]">
      <header className="flex items-center gap-3 bg-[#075E54] px-3 pb-2.5 pt-[max(10px,env(safe-area-inset-top))] text-white">
        <button
          type="button"
          onClick={() => navigate(inDriver ? '/driver/messages' : '/messages')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {conv.otherParticipant?.avatarUrl ? (
          <img src={conv.otherParticipant.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-extrabold">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-extrabold leading-5">{name}</p>
          <p className="truncate text-[11px] text-white/75">TaxiLine chat</p>
        </div>
        {conv.otherParticipant?.phone ? (
          <a
            href={`tel:${conv.otherParticipant.phone.replace(/\s/g, '')}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            aria-label="Qo‘ng‘iroq qilish"
          >
            <Phone className="h-5 w-5" />
          </a>
        ) : null}
      </header>

      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {messages.map((m, i) => {
          const mine = m.senderId === authUser?.id
          const prev = messages[i - 1]
          const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt)
          const isLoc = m.type === 'LOCATION' && typeof m.lat === 'number'
          return (
            <div key={m.id}>
              {showDay ? (
                <p className="mx-auto my-3 w-fit rounded-full bg-black/25 px-3 py-0.5 text-[11px] font-bold text-white">
                  {dayLabel(m.createdAt)}
                </p>
              ) : null}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`relative max-w-[82%] rounded-2xl px-2.5 py-1.5 shadow-sm ${
                    mine ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm bg-white'
                  }`}
                >
                  {isLoc ? (
                    <LocationPreview lat={m.lat} lng={m.lng} label={m.locationLabel || m.text} mine={mine} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-5">{m.text}</p>
                  )}
                  <p className={`mt-0.5 flex items-center justify-end gap-0.5 text-[10px] ${mine ? 'text-white/80' : 'text-muted'}`}>
                    {timeLabel(m.createdAt)}
                    {mine ? (
                      m.readAt ? (
                        <CheckCheck className="h-3.5 w-3.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )
                    ) : null}
                  </p>
                </div>
              </div>
              {!mine && m.text === LOCATION_REQUEST_TEXT ? (
                <div className="mt-1 flex justify-start">
                  <button
                    type="button"
                    onClick={() => setAttachOpen(true)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-brand shadow-sm"
                  >
                    📍 Manzilimni yuborish
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {inDriver ? (
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto bg-[#f0f2f5] px-3 pt-2">
          <button
            type="button"
            disabled={sendMessage.isPending}
            onClick={() => sendMessage.mutate({ type: 'TEXT', text: LOCATION_REQUEST_TEXT })}
            className="shrink-0 rounded-full border border-brand bg-white px-3 py-1.5 text-xs font-extrabold text-brand"
          >
            {LOCATION_REQUEST_TEXT}
          </button>
        </div>
      ) : null}

      <form
        onSubmit={send}
        className="flex shrink-0 items-end gap-2 bg-[#f0f2f5] px-2 py-2 pb-[max(10px,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onClick={() => setAttachOpen(true)}
          className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500"
          aria-label="Lokatsiya"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Xabar yozing"
          className="min-h-11 min-w-0 flex-1 rounded-[22px] border-0 bg-white px-4 py-2.5 text-[15px] outline-none"
        />
        <button
          type="submit"
          className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#075E54] text-white disabled:opacity-40"
          disabled={!text.trim() || sendMessage.isPending}
          aria-label="Yuborish"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>

      {attachOpen ? (
        <ChatAttachSheet onClose={() => setAttachOpen(false)} onSendLocation={sendLocation} />
      ) : null}
    </div>
  )
}
