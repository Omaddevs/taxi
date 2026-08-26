import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Card } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Input'
import { LanguageRow } from '../components/ui/LanguagePicker'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { user } = useApp()

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title="Sozlamalar" />
      <PageTitle title="Sozlamalar" subtitle="Profil va ilova parametrlari" />
      <Card className="space-y-4 p-4">
        <Field label="Ism familiya">
          <Input defaultValue={user.name} />
        </Field>
        <Field label="Telefon">
          <Input defaultValue={user.phone} />
        </Field>
        <Field label="Email">
          <Input defaultValue={user.email} />
        </Field>
        <LanguageRow />
        <label className="flex items-center justify-between rounded-xl bg-canvas px-3 py-3 text-sm font-medium">
          Bildirishnomalar
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-brand" />
        </label>
        <label className="flex items-center justify-between rounded-xl bg-canvas px-3 py-3 text-sm font-medium">
          Joylashuvni ulashish
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-brand" />
        </label>
      </Card>
    </div>
  )
}
