import { Link } from 'react-router-dom'
import { ecosystem } from '../../data/ecosystem'
import { EcosystemIcon } from '../icons/EcosystemIcon'

export function EcosystemGrid() {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold">TaxiLine ekotizimi</h2>
          <p className="text-xs text-muted">Yo‘l, avtomobil va kundalik xizmatlar — bir joyda</p>
        </div>
        <Link to="/map" className="text-sm font-semibold text-brand">
          Xarita
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-8">
        {ecosystem.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            className="flex flex-col items-center rounded-2xl bg-white px-1 py-3 text-center shadow-[0_6px_20px_rgba(28,28,40,0.04)] transition hover:-translate-y-0.5"
          >
            <span className="flex h-9 w-9 items-center justify-center text-slate-700">
              <EcosystemIcon id={item.id} className={`h-6 w-6 ${item.id === 'sos' ? 'text-red-500' : ''}`} />
            </span>
            <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight">{item.title}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
