import { Badge } from '../ui/Button'
import { CHANNEL_LABEL, CHANNEL_TONE } from '../../lib/labels'
import type { PersonRow } from '../../types'

export function ChannelChips({
  person,
}: {
  person: Pick<PersonRow, 'fromWebapp' | 'fromBot' | 'fromGroup'> & { googleId?: string | null }
}) {
  const chips: Array<{ key: 'WEBAPP' | 'BOT' | 'GROUP'; on: boolean }> = [
    { key: 'WEBAPP', on: person.fromWebapp },
    { key: 'BOT', on: person.fromBot },
    { key: 'GROUP', on: person.fromGroup },
  ]
  const active = chips.filter((c) => c.on)
  if (!active.length && !person.googleId) return <Badge tone="gray">Manba noma’lum</Badge>
  return (
    <span className="inline-flex flex-wrap gap-1">
      {person.googleId ? <Badge tone="green">Google</Badge> : null}
      {active.map((c) => (
        <Badge key={c.key} tone={CHANNEL_TONE[c.key] as 'pink' | 'green' | 'gray' | 'amber'}>
          {CHANNEL_LABEL[c.key]}
        </Badge>
      ))}
    </span>
  )
}
