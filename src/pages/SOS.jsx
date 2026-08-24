import { ArrowLeft, MapPin, Phone, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export default function SOS() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-svh flex-col bg-[#1a0b10] px-5 py-6 text-white">
      <button type="button" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold text-white/70">Favqulodda holat</p>
        <h1 className="mt-2 text-2xl font-extrabold">Yordam chaqirish</h1>
        <button type="button" className="sos-pulse mt-10 flex h-44 w-44 items-center justify-center rounded-full bg-red-500 text-4xl font-black tracking-widest">
          SOS
        </button>
        <p className="mt-8 max-w-xs text-sm text-white/70">
          Tugmani bosganingizda joylashuvingiz ishonchli kontaktlar va 24/7 yordam xizmatiga yuboriladi.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
          <MapPin className="h-4 w-4" /> Joylashuvim
        </Button>
        <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
          <Users className="h-4 w-4" /> Kontaktlar
        </Button>
        <a href="tel:101" className="col-span-2">
          <Button className="w-full bg-white text-red-600 hover:bg-pink-50">
            <Phone className="h-4 w-4" /> 101 / 1050
          </Button>
        </a>
      </div>
    </div>
  )
}
