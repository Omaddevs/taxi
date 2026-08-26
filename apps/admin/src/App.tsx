import { Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/layout/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Drivers from './pages/Drivers'
import DriverApplications from './pages/DriverApplications'
import Bookings from './pages/Bookings'
import BookingDetail from './pages/BookingDetail'
import Offers from './pages/Offers'
import Services from './pages/Services'
import Promo from './pages/Promo'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/drivers/applications" element={<DriverApplications />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/services" element={<Services />} />
        <Route path="/promo" element={<Promo />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
