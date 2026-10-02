import logo from '../../assets/logo.png'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 text-lg font-extrabold ${light ? 'text-white' : 'text-ink'}`}>
      <img src={logo} alt="TaxiLine" width={32} height={32} className="h-8 w-8 rounded-xl object-cover shadow-sm shadow-brand/30" />
      TaxiLine
    </span>
  )
}
