import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { promos } from '../data/mock'
import { useApp } from '../context/AppContext'

export default function PromoCodes() {
  const { promoInput, setPromoInput, appliedPromo, setAppliedPromo } = useApp()

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title="Promo kodlar" />
      <PageTitle title="Promo kodlar" subtitle="Chegirma kodini kiriting yoki mavjudlaridan foydalaning" />

      <Card className="flex gap-2 p-3">
        <Input
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
          placeholder="PROMO KOD"
          className="uppercase"
        />
        <Button
          onClick={() => {
            const found = promos.find((p) => p.code === promoInput)
            setAppliedPromo(found ? found.code : promoInput ? 'invalid' : null)
          }}
        >
          Tekshirish
        </Button>
      </Card>
      {appliedPromo && appliedPromo !== 'invalid' ? (
        <p className="mt-2 text-sm font-semibold text-success">{appliedPromo} qo‘llandi</p>
      ) : null}
      {appliedPromo === 'invalid' ? <p className="mt-2 text-sm font-semibold text-danger">Kod topilmadi</p> : null}

      <p className="mb-2 mt-6 text-sm font-bold">Mening kodlarim</p>
      <div className="space-y-3">
        {promos.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-extrabold tracking-wide text-brand">{p.code}</p>
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-muted">{p.until} gacha</p>
            </div>
            <Button size="sm" variant="soft" onClick={() => setPromoInput(p.code)}>
              {p.discount}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
