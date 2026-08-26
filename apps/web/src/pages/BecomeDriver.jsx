import { useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/ui/Button'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Field, Input } from '../components/ui/Input'

export default function BecomeDriver() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title="Haydovchi bo‘lish" />
      <PageTitle title="Haydovchi bo‘lish" subtitle="Ariza qoldiring va daromad qiling" />
      <Card className="space-y-4 p-4">
        <Field label="Ism familiya">
          <Input placeholder="To‘liq ism" />
        </Field>
        <Field label="Telefon">
          <Input placeholder="+998" />
        </Field>
        <Field label="Avtomobil">
          <Input placeholder="Chevrolet Cobalt" />
        </Field>
        <Field label="Davlat raqami">
          <Input placeholder="01 A 000 AA" />
        </Field>
        <Button className="w-full" onClick={() => navigate('/driver')}>
          Ariza yuborish
        </Button>
      </Card>
    </div>
  )
}
