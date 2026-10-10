import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { t } from '../i18n'

export default function TaxiLineAI() {
  const [q, setQ] = useState(() => t('Cobalt mashinam ertalab zo‘rg‘a o‘t oldi.'))
  const [answer, setAnswer] = useState(null)
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title={t('TaxiLine AI')} subtitle={t('Taxminiy yo‘nalish, aniq tashxis emas')} />
      <PageTitle title={t('TaxiLine AI')} subtitle={t('Avto muammo, safar va xizmat bo‘yicha yordamchi')} />

      <Card className="p-4">
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-line p-3 text-sm outline-none focus:border-brand"
        />
        <Button
          className="mt-3 w-full"
          onClick={() =>
            setAnswer({
              hints: ['Akkumulyator zaif bo‘lishi mumkin', 'Starter yoki starter rele', 'Yoqilg‘i tizimi / nasos'],
              next: 'Eng yaqin diagnostika va yo‘lda yordamni xaritadan oching. Bu tibbiy yoki muhandislik tashxisi emas.',
            })
          }
        >
          {t('Tahlil qilish')}
        </Button>
      </Card>

      {answer ? (
        <Card className="mt-4 space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('Ehtimoliy sabablar')}</p>
          <ul className="space-y-2 text-sm">
            {answer.hints.map((h) => (
              <li key={h} className="rounded-xl bg-canvas px-3 py-2">
                {h}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{answer.next}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => navigate('/roadside')}>{t('Yo‘lda yordam')}</Button>
            <Button variant="outline" onClick={() => navigate('/hub/auto-service')}>
              {t('Servis')}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
