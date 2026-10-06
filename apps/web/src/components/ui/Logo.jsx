import logo from '../../assets/logo.png'
import logoPin from '../../assets/logo-pin.png'

export function Logo({ size = 36, className = '' }) {
  return (
    <img
      src={logo}
      alt="TaxiLine"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

export function LogoPin({ size = 28, className = '' }) {
  return (
    <img
      src={logoPin}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

export function Wordmark({ className = '' }) {
  return (
    <p className={`font-extrabold leading-none tracking-tight ${className}`}>
      <span className="text-ink">Taxi</span>
      <span className="text-brand">Line</span>
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
          <p className="mt-0.5 text-[11px] text-muted">Yo‘l va xizmatlar</p>
        </div>
      )}
    </div>
  )
}
