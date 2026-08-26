import { Check, Shield, Siren } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { useApp } from '../context/AppContext'

const points = [
  'Faqat tasdiqlangan ayol haydovchilar',
  'Jonli GPS kuzatuv',
  'SOS tugmasi va ishonchli kontaktlar',
  'Safar davomida 24/7 yordam',
]

export default function WomenTaxi() {
  const navigate = useNavigate()
  const { setSearch } = useApp()

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="Ayollar uchun taksi" />
      <PageTitle title="Ayollar uchun taksi" subtitle="Xavfsiz va qulay yo‘l" />

      <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-brand to-brand-dark p-6 text-white">
        <p className="text-sm font-semibold text-white/80">Taxiline Women</p>
        <h2 className="mt-2 max-w-sm text-3xl font-extrabold leading-tight">Faqat ayollar uchun xavfsiz safar</h2>
        <div className="mt-6 flex justify-end">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/15 text-6xl">👩‍✈️</div>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {points.map((item) => (
          <li key={item} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-success">
              <Check className="h-4 w-4" />
            </span>
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 rounded-2xl bg-white p-3">
          <Shield className="h-4 w-4 text-brand" /> GPS kuzatuv
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white p-3">
          <Siren className="h-4 w-4 text-red-500" /> SOS 1 bosishda
        </div>
      </div>

      <Button
        size="lg"
        className="mt-5 w-full"
        onClick={() => {
          setSearch((s) => ({ ...s, service: 'women' }))
          navigate('/results')
        }}
      >
        Davom etish
      </Button>
    </div>
  )
}
