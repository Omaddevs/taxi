import logo from '../../assets/logo.webp'
import logoDark from '../../assets/logo-dark.webp'

// `light` = white text for a dark background; the mark then gets its cyan-rimmed dark version.
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 text-lg font-extrabold ${light ? 'text-white' : 'text-ink'}`}>
      <img src={light ? logoDark : logo} alt="TaxiLine" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" />
      TaxiLine
    </span>
  )
}
