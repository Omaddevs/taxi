import { useNavigate } from 'react-router-dom'
import { services } from '../data/mock'
import { formatSom } from '../lib/utils'
import { Button, Card } from '../components/ui/Button'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'

const images = {
  standart: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=800&q=80',
  women: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
  family: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
  minivan: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80',
  cargo: 'https://images.unsplash.com/photo-1527786356703-4b100091cd2c?auto=format&fit=crop&w=800&q=80',
  premium: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800&q=80',
}

export default function CarTypes() {
  const navigate = useNavigate()
  const { setSearch } = useApp()

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader title={t('Avtomobil turlari')} />
      <PageTitle title={t('Avtomobil turlari')} subtitle={t('O‘zingizga mos klassni tanlang')} />
      <div className="space-y-3">
        {services.map((item) => (
          <Card key={item.id} className="flex items-center gap-4 p-3">
            <img src={images[item.id]} alt="" className="h-20 w-28 rounded-xl object-cover" />
            <div className="flex-1">
              <p className="font-bold">{t(item.title)}</p>
              <p className="text-xs text-muted">{t(item.desc)}</p>
              <p className="mt-1 text-sm font-bold text-brand">{t('{0} dan', formatSom(item.from))}</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSearch((s) => ({ ...s, service: item.id }))
                if (item.id === 'women') navigate('/women')
                else if (item.id === 'cargo') navigate('/cargo')
                else navigate('/results')
              }}
            >
              {t('Tanlash')}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
