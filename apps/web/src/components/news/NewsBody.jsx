import { t } from '../../i18n'
/* Yangilik matni uchun oddiy belgilash (admin muharriri bilan bir xil qoidalar):
   bo‘sh qator — yangi blok · "## " — sarlavha · "- " — ro‘yxat · "> " — iqtibos · **qalin**.
   HTML ishlatilmaydi — hammasi React elementlari, shuning uchun xavfsiz. */

function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-bold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export function parseBlocks(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n')
      if (block.startsWith('## ')) return { type: 'h', text: block.slice(3).trim() }
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) return { type: 'ul', items: lines.map((l) => l.replace(/^\s*[-•]\s+/, '')) }
      if (lines.every((l) => l.startsWith('>'))) return { type: 'quote', text: lines.map((l) => l.replace(/^>\s?/, '')).join('\n') }
      return { type: 'p', text: block }
    })
}

export function NewsBody({ text }) {
  return (
    <div className="space-y-6 text-[17px] leading-[1.75] text-ink/85 sm:text-[18px] 2xl:text-[20px]">
      {parseBlocks(text).map((b, i) => {
        if (b.type === 'h')
          return (
            <h2 key={i} className="pt-4 text-[24px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px] 2xl:text-[32px]">
              <Inline text={t(b.text)} />
            </h2>
          )
        if (b.type === 'ul')
          return (
            <ul key={i} className="space-y-2.5">
              {b.items.map((it, k) => (
                <li key={k} className="flex gap-3">
                  <span className="mt-[0.7em] h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <span>
                    <Inline text={it} />
                  </span>
                </li>
              ))}
            </ul>
          )
        if (b.type === 'quote')
          return (
            <blockquote key={i} className="whitespace-pre-line rounded-r-2xl border-l-4 border-brand bg-brand-soft/60 px-6 py-4 text-[18px] font-medium italic text-ink sm:text-[19px]">
              <Inline text={t(b.text)} />
            </blockquote>
          )
        return (
          <p key={i} className="whitespace-pre-line">
            <Inline text={t(b.text)} />
          </p>
        )
      })}
    </div>
  )
}
