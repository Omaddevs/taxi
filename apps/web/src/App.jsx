import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import TripDetails from './pages/TripDetails'
import Profile from './pages/Profile'
import Cargo from './pages/Cargo'
import WomenTaxi from './pages/WomenTaxi'
import CarTypes from './pages/CarTypes'
import Payment from './pages/Payment'
import Wallet from './pages/Wallet'
import TripHistory from './pages/TripHistory'
import Messages from './pages/Messages'
import Chat from './pages/Chat'
import PromoCodes from './pages/PromoCodes'
import SOS from './pages/SOS'
import DriverApp from './pages/DriverApp'
import Help from './pages/Help'
import Favorites from './pages/Favorites'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import Drivers from './pages/Drivers'
import BecomeDriver from './pages/BecomeDriver'
import ServiceHub from './pages/ServiceHub'
import Roadside from './pages/Roadside'
import SmartMap from './pages/SmartMap'
import Fuel from './pages/Fuel'
import TaxiLineAI from './pages/TaxiLineAI'
import RideSearch from './pages/RideSearch'
import Plus from './pages/Plus'

function RequireAuth({ children }) {
  const { status } = useAuth()
  if (status === 'guest') return <Navigate to="/login" replace />
  if (status === 'checking') {
    return <div className="flex min-h-svh items-center justify-center text-sm font-semibold text-muted">Yuklanmoqda…</div>
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<SearchResults />} />
        <Route path="/trip/:id" element={<TripDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/cargo" element={<Cargo />} />
        <Route path="/women" element={<WomenTaxi />} />
        <Route path="/cars" element={<CarTypes />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/history" element={<TripHistory />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Chat />} />
        <Route path="/promo" element={<PromoCodes />} />
        <Route path="/sos" element={<SOS />} />
        <Route path="/driver" element={<DriverApp />} />
        <Route path="/help" element={<Help />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/become-driver" element={<BecomeDriver />} />
        <Route path="/hub/:slug" element={<ServiceHub />} />
        <Route path="/roadside" element={<Roadside />} />
        <Route path="/map" element={<SmartMap />} />
        <Route path="/fuel" element={<Fuel />} />
        <Route path="/ai" element={<TaxiLineAI />} />
        <Route path="/ride" element={<RideSearch />} />
        <Route path="/plus" element={<Plus />} />
      </Route>
    </Routes>
  )
}
