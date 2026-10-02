import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

// Every locale namespace file lives at src/locales/<lng>/<namespace>.json.
// Picked up automatically so new namespace files need no registration here.
const modules = import.meta.glob('../locales/*/*.json', { eager: true })

const resources = {}
for (const path in modules) {
  const match = path.match(/\.\.\/locales\/([a-z]{2})\/([\w-]+)\.json$/)
  if (!match) continue
  const [, lng, ns] = match
  resources[lng] ??= {}
  resources[lng][ns] = modules[path].default ?? modules[path]
}

export const SUPPORTED_LANGUAGES = ['uz', 'ru', 'en']
export const DEFAULT_NAMESPACE = 'common'

function loadStoredLanguage() {
  try {
    const raw = localStorage.getItem('taxiline-lang')
    if (raw && SUPPORTED_LANGUAGES.includes(raw)) return raw
  } catch {
    /* ignore */
  }
  return 'uz'
}

i18next.use(initReactI18next).init({
  resources,
  lng: loadStoredLanguage(),
  fallbackLng: 'uz',
  supportedLngs: SUPPORTED_LANGUAGES,
  ns: Object.keys(resources.uz ?? {}),
  defaultNS: DEFAULT_NAMESPACE,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

export default i18next
