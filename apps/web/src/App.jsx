import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { useAuth } from './context/AuthContext'
import { isDriverUser } from './lib/role'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import News from './pages/News'
import NewsDetail from './pages/NewsDetail'
import { BusinessPage, DriverPage, FaqPage, PromosPage } from './pages/PublicPages'
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
import Orders from './pages/Orders'
import Messages from './pages/Messages'
import Chat from './pages/Chat'
import PromoCodes from './pages/PromoCodes'
import SOS from './pages/SOS'
import Help from './pages/Help'
import Favorites from './pages/Favorites'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import Drivers from './pages/Drivers'
import BecomeDriver from './pages/BecomeDriver'
import ServiceHub from './pages/ServiceHub'
import Roadside from './pages/Roadside'
import SmartMap from './pages/SmartMap'
import { FuelMap as Fuel } from './pages/hubMaps'
import TaxiLineAI from './pages/TaxiLineAI'
import RideSearch from './pages/RideSearch'
import TaxiMap from './pages/TaxiMap'
import Plus from './pages/Plus'
import { DriverLayout } from './pages/driver/DriverLayout'
import DriverHome from './pages/driver/DriverHome'
import DriverOrders from './pages/driver/DriverOrders'
import DriverOrder from './pages/driver/DriverOrder'
import DriverStats from './pages/driver/DriverStats'
import DriverRating from './pages/driver/DriverRating'
import DriverSettings from './pages/driver/DriverSettings'
import DriverRefer from './pages/driver/DriverRefer'
import DriverMap from './pages/driver/DriverMap'
import PostOffer from './pages/driver/PostOffer'
import DriverCargo from './pages/driver/DriverCargo'

function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  // A guest opening the site root sees the public landing page; deep links still go to login.
  // Mehmon taxiline.uz (/) ni ochsa — landing sahifa; boshqa yopiq sahifalar loginga yuboradi.
  // Buyurtma berish va ilovaning qolgan qismi faqat kirgandan/ro‘yxatdan o‘tgandan keyin ochiladi.
  if (status === 'guest') return location.pathname === '/' ? <Landing /> : <Navigate to="/login" replace />
  if (status === 'checking' || status === 'checking-telegram') {
    return <div className="flex min-h-svh items-center justify-center text-sm font-semibold text-muted">Yuklanmoqda…</div>
  }
  return children
}

// Eski /welcome havolalari (va #bo‘lim) asosiy sahifaga yo‘naltiriladi.
function WelcomeRedirect() {
  const { hash } = useLocation()
  return <Navigate to={{ pathname: '/', hash }} replace />
}

function PassengerShell() {
  const { authUser } = useAuth()
  if (isDriverUser(authUser)) return <Navigate to="/driver" replace />
  return <AppLayout />
}

function DriverShell() {
  const { authUser } = useAuth()
  if (!isDriverUser(authUser)) return <Navigate to="/" replace />
  return <DriverLayout />
}

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomeRedirect />} />
      <Route path="/news" element={<News />} />
      <Route path="/news/:slug" element={<NewsDetail />} />
      {/* Ommaviy SEO sahifalar — ro‘yxat: src/seo/pages.js */}
      <Route path="/haydovchi-bolish" element={<DriverPage />} />
      <Route path="/aksiyalar" element={<PromosPage />} />
      <Route path="/biznes" element={<BusinessPage />} />
      <Route path="/savollar" element={<FaqPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <RequireAuth>
            <PassengerShell />
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
        <Route path="/history" element={<Orders />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Chat />} />
        <Route path="/promo" element={<PromoCodes />} />
        <Route path="/sos" element={<SOS />} />
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
        <Route path="/taxi" element={<TaxiMap />} />
        <Route path="/women/taxi" element={<TaxiMap women />} />
        <Route path="/plus" element={<Plus />} />
      </Route>
      <Route
        path="/driver"
        element={
          <RequireAuth>
            <DriverShell />
          </RequireAuth>
        }
      >
        <Route index element={<DriverHome />} />
        <Route path="orders" element={<DriverOrders />} />
        <Route path="orders/:id" element={<DriverOrder />} />
        <Route path="stats" element={<DriverStats />} />
        <Route path="rating" element={<DriverRating />} />
        <Route path="settings" element={<DriverSettings />} />
        <Route path="refer" element={<DriverRefer />} />
        <Route path="map" element={<DriverMap />} />
        <Route path="post" element={<PostOffer />} />
        <Route path="cargo" element={<DriverCargo />} />
        <Route path="roadside" element={<Roadside />} />
        <Route path="fuel" element={<Fuel />} />
        <Route path="smart-map" element={<SmartMap />} />
        <Route path="hub/:slug" element={<ServiceHub />} />
        <Route path="women" element={<WomenTaxi />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:id" element={<Chat />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="history" element={<TripHistory />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="help" element={<Help />} />
      </Route>
    </Routes>
  )
}
