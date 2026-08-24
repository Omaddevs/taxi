import { Link } from 'react-router-dom'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { ecosystem } from '../data/ecosystem'
import { EcosystemIcon } from '../components/icons/EcosystemIcon'

const pins = [
  { to: '/results', left: '18%', top: '42%', emoji: '🚕', label: 'Taxi' },
  { to: '/roadside', left: '38%', top: '28%', emoji: '🚛', label: 'Evakuator' },
  { to: '/fuel', left: '58%', top: '48%', emoji: '⛽', label: 'Yoqilg‘i' },
  { to: '/hub/parking', left: '72%', top: '30%', emoji: '🅿️', label: 'Parking' },
  { to: '/hub/food', left: '30%', top: '68%', emoji: '🍔', label: 'Ovqat' },
  { to: '/hub/health', left: '64%', top: '70%', emoji: '💊', label: 'Dorixona' },
  { to: '/hub/wash', left: '46%', top: '56%', emoji: '🚿', label: 'Moyka' },
]

export default function SmartMap() {
  return (
    <div>
      <ScreenHeader title="Smart xarita" subtitle="Taxi, yoqilg‘i, parking, yordam" />
      <PageTitle title="Smart xarita" subtitle="Kerakli xizmatni xaritadan tanlang" />
      <div className="relative h-[420px] overflow-hidden rounded-[28px] bg-[#e8efe9] lg:h-[520px]">
        <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="240" fill="#e8efe9" />
          <path d="M0 50h400M0 100h400M0 150h400M0 200h400" stroke="#d5e0d8" />
          <path d="M40 0v240M120 0v240M200 0v240M280 0v240M360 0v240" stroke="#d5e0d8" />
          <path d="M20 200 C 90 160, 140 80, 220 110 S 320 180, 390 90" fill="none" stroke="#E91E63" strokeWidth="4" />
        </svg>
        {pins.map((pin) => (
          <Link
            key={pin.label}
            to={pin.to}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white px-2.5 py-1.5 text-xs font-bold shadow-md"
            style={{ left: pin.left, top: pin.top }}
          >
            {pin.emoji} {pin.label}
          </Link>
        ))}
      </div>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {ecosystem.slice(0, 10).map((item) => (
          <Link key={item.id} to={item.to} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-2 text-xs font-semibold">
            <EcosystemIcon id={item.id} className="h-3.5 w-3.5" /> {item.title}
          </Link>
        ))}
      </div>
    </div>
  )
}
