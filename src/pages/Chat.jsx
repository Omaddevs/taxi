import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Send } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { chatMessages, conversations } from '../data/mock'
import { Button } from '../components/ui/Button'

export default function Chat() {
  const { id } = useParams()
  const conv = conversations.find((c) => c.id === id) || conversations[0]
  const [text, setText] = useState('')
  const [messages, setMessages] = useState(chatMessages[conv.id] || [])

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col">
      <ScreenHeader title={conv.name} subtitle={conv.role} />
      <div className="hidden pb-3 lg:block">
        <h1 className="text-xl font-extrabold">{conv.name}</h1>
        <p className="text-sm text-muted">{conv.role}</p>
      </div>

      <div className="flex-1 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.from === 'me' ? 'bg-brand text-white' : 'bg-white'}`}>
              <p>{m.text}</p>
              <p className={`mt-1 text-[10px] ${m.from === 'me' ? 'text-white/70' : 'text-muted'}`}>{m.time}</p>
            </div>
          </div>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          setMessages((prev) => [...prev, { id: Date.now(), from: 'me', text, time: 'hozir' }])
          setText('')
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Xabar yozing..."
          className="h-12 flex-1 rounded-2xl border border-line bg-white px-4 text-sm outline-none"
        />
        <Button type="submit" className="h-12 w-12 rounded-2xl p-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
