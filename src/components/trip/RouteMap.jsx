export function RouteMap({ from = 'Qarshi', to = 'Toshkent', className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#eef3f0] ${className}`}>
      <svg viewBox="0 0 400 220" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="220" fill="#e8efe9" />
        <path d="M0 40h400M0 90h400M0 140h400M0 190h400" stroke="#d5e0d8" strokeWidth="1" />
        <path d="M50 0v220M120 0v220M200 0v220M280 0v220M350 0v220" stroke="#d5e0d8" strokeWidth="1" />
        <path d="M20 180 C 80 160, 90 70, 160 80 S 260 150, 310 70 S 360 40, 390 55" fill="none" stroke="#E91E63" strokeWidth="5" strokeLinecap="round" />
        <circle cx="42" cy="176" r="8" fill="#E91E63" />
        <circle cx="42" cy="176" r="14" fill="#E91E63" opacity="0.2" />
        <circle cx="372" cy="52" r="8" fill="#1c1c28" />
        <rect x="150" y="96" width="36" height="18" rx="4" fill="#fff" stroke="#E91E63" />
        <circle cx="158" cy="116" r="3.5" fill="#1c1c28" />
        <circle cx="178" cy="116" r="3.5" fill="#1c1c28" />
      </svg>
      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow-sm">
        {from}
      </div>
      <div className="absolute bottom-3 right-3 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white shadow-sm">
        {to}
      </div>
    </div>
  )
}

export function CarArt() {
  return (
    <svg viewBox="0 0 220 110" className="h-[92px] w-[180px] drop-shadow-md">
      <ellipse cx="110" cy="96" rx="70" ry="8" fill="rgba(255,255,255,0.25)" />
      <path d="M30 72 L48 48 C54 40 62 36 78 36 H142 C160 36 170 42 178 52 L196 72 V84 H30 Z" fill="#fff" />
      <path d="M70 38 C78 26 90 20 110 20 C132 20 146 28 152 38" fill="#f8bbd0" />
      <rect x="78" y="40" width="28" height="16" rx="3" fill="#fce4ec" />
      <rect x="112" y="40" width="28" height="16" rx="3" fill="#fce4ec" />
      <circle cx="62" cy="84" r="12" fill="#1c1c28" />
      <circle cx="62" cy="84" r="6" fill="#d1d5db" />
      <circle cx="164" cy="84" r="12" fill="#1c1c28" />
      <circle cx="164" cy="84" r="6" fill="#d1d5db" />
      <rect x="100" y="68" width="18" height="6" rx="2" fill="#E91E63" />
    </svg>
  )
}
