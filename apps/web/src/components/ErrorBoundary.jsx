import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'
import { t as translate } from '../i18n'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info)
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return <DefaultFallback onReset={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}

// i18n is a plain module (no provider/context), so the fallback still renders in the
// user's language even when everything else is broken.
const TEXT = {
  title: 'Nimadir xato ketdi',
  description: "Sahifani yuklashda kutilmagan xatolik yuz berdi. Qayta urinib ko'ring yoki bosh sahifaga qayting.",
  retry: 'Qayta urinish',
  home: 'Bosh sahifa',
}

function DefaultFallback({ onReset }) {
  const t = (key) => translate(TEXT[key])
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="text-lg font-extrabold text-ink">{t('title')}</h1>
      <p className="max-w-xs text-sm text-muted">
        {t('description')}
      </p>
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={onReset}
          className="h-11 rounded-2xl bg-brand px-5 text-sm font-bold text-white"
        >
          {t('retry')}
        </button>
        <a
          href="/"
          className="flex h-11 items-center rounded-2xl border border-line px-5 text-sm font-bold text-ink"
        >
          {t('home')}
        </a>
      </div>
    </div>
  )
}
