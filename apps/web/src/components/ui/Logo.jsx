import logo from '../../assets/logo.webp'
import logoDark from '../../assets/logo-dark.webp'
import { t } from '../../i18n'

// The TaxiLine mark: a black pin with the van driving out of it. On dark backgrounds the pin
// gets a cyan rim and glow (logo-dark) so it doesn't sink into the page.
//   tone="auto"  — follows the app theme (html.dark)
//   tone="light" / "dark" — for a spot whose background doesn't change with the theme
function Mark({ size, className, tone, alt }) {
  const img = (src, extra = '') => (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 select-none object-contain ${extra} ${className}`}
      style={{ width: size, height: size }}
    />
  )
  if (tone === 'light') return img(logo)
  if (tone === 'dark') return img(logoDark)
  return (
    <>
      {img(logo, 'dark:hidden')}
      {img(logoDark, 'hidden dark:block')}
    </>
  )
}

export function Logo({ size = 36, className = '', tone = 'auto' }) {
  return <Mark size={size} className={className} tone={tone} alt="TaxiLine" />
}

// The same mark (it's a pin already) — kept as its own name for the places that show it alone.
export function LogoPin({ size = 28, className = '', tone = 'auto' }) {
  return <Mark size={size} className={className} tone={tone} alt="" />
}

export function Wordmark({ className = '' }) {
  return (
    <p className={`font-extrabold leading-none tracking-tight ${className}`}>
      <span className="text-ink">{t('Taxi')}</span>
      <span className="text-brand">{t('Line')}</span>
    </p>
  )
}

export function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo />
      {compact ? null : (
        <div>
          <Wordmark className="text-[15px]" />
          <p className="mt-0.5 text-[11px] text-muted">{t('Yo‘l va xizmatlar')}</p>
        </div>
      )}
    </div>
  )
}
