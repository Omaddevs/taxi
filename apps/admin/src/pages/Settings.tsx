import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div>
      <PageHeader title="Sozlamalar" />
      <Card className="max-w-md p-5">
        <p className="text-sm text-muted">Admin hisob</p>
        <p className="mt-1 font-semibold text-ink">{user?.phone}</p>
        <p className="mt-4 text-xs text-muted">
          Admin foydalanuvchilarni boshqarish (yangi admin qo‘shish, rollarni o‘zgartirish) hozircha server tomonidagi
          bootstrap skripti orqali amalga oshiriladi.
        </p>
      </Card>
    </div>
  )
}
