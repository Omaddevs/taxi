import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AdminLayout } from './components/layout/AdminLayout'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SalesDashboard from './pages/SalesDashboard'
import SupportDashboard from './pages/SupportDashboard'
import SupportTicketDetail from './pages/SupportTicketDetail'
import Operators from './pages/Operators'
import OperatorDetail from './pages/OperatorDetail'
import Reports from './pages/Reports'
import People from './pages/People'
import PersonDetail from './pages/PersonDetail'
import Drivers from './pages/Drivers'
import DriverDetail from './pages/DriverDetail'
import DriverApplications from './pages/DriverApplications'
import Bookings from './pages/Bookings'
import BookingDetail from './pages/BookingDetail'
import Offers from './pages/Offers'
import OfferDetail from './pages/OfferDetail'
import OrderDetail from './pages/OrderDetail'
import Listings from './pages/Listings'
import WomenOrders from './pages/WomenOrders'
import Services from './pages/Services'
import Cars from './pages/Cars'
import MapPlaces from './pages/MapPlaces'
import Rentals from './pages/Rentals'
import SubscriptionPlans from './pages/SubscriptionPlans'
import Promo from './pages/Promo'
import Finance from './pages/Finance'
import Ratings from './pages/Ratings'
import Broadcast from './pages/Broadcast'
import Settings from './pages/Settings'
import AuditLog from './pages/AuditLog'
import Leads from './pages/Leads'
import Integrations from './pages/Integrations'
import CannedResponses from './pages/CannedResponses'
import TelegramGroups from './pages/TelegramGroups'
import Giveaway from './pages/Giveaway'
import News from './pages/News'
import NewsEditor from './pages/NewsEditor'
import type { PanelRole } from './lib/tokens'

function Home() {
  const { user } = useAuth()
  if (user?.role === 'SALES_OPERATOR') return <SalesDashboard />
  if (user?.role === 'SUPPORT_OPERATOR') return <SupportDashboard />
  return <Dashboard />
}

function RedirectLegacyUser() {
  const { id } = useParams()
  return <Navigate to={id ? `/people/${id}` : '/people'} replace />
}

function RequireRole({ roles, children }: { roles: PanelRole[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Home />} />
        <Route
          path="/operators"
          element={
            <RequireRole roles={['ADMIN']}>
              <Operators />
            </RequireRole>
          }
        />
        <Route
          path="/operators/:id"
          element={
            <RequireRole roles={['ADMIN']}>
              <OperatorDetail />
            </RequireRole>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireRole roles={['ADMIN']}>
              <Reports />
            </RequireRole>
          }
        />
        <Route
          path="/support"
          element={
            <RequireRole roles={['ADMIN', 'SUPPORT_OPERATOR']}>
              <SupportDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <RequireRole roles={['ADMIN', 'SUPPORT_OPERATOR']}>
              <SupportTicketDetail />
            </RequireRole>
          }
        />
        <Route
          path="/people"
          element={
            <RequireRole roles={['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR']}>
              <People />
            </RequireRole>
          }
        />
        <Route
          path="/people/:id"
          element={
            <RequireRole roles={['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR']}>
              <PersonDetail />
            </RequireRole>
          }
        />
        <Route path="/users" element={<Navigate to="/people" replace />} />
        <Route path="/users/:id" element={<RedirectLegacyUser />} />
        <Route
          path="/drivers"
          element={
            <RequireRole roles={['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR']}>
              <Drivers />
            </RequireRole>
          }
        />
        <Route
          path="/drivers/applications"
          element={
            <RequireRole roles={['ADMIN']}>
              <DriverApplications />
            </RequireRole>
          }
        />
        <Route
          path="/drivers/:id"
          element={
            <RequireRole roles={['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR']}>
              <DriverDetail />
            </RequireRole>
          }
        />
        <Route
          path="/bookings"
          element={
            <RequireRole roles={['ADMIN']}>
              <Bookings />
            </RequireRole>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <RequireRole roles={['ADMIN']}>
              <BookingDetail />
            </RequireRole>
          }
        />
        <Route
          path="/listings"
          element={
            <RequireRole roles={['ADMIN']}>
              <Listings />
            </RequireRole>
          }
        />
        <Route
          path="/women-orders"
          element={
            <RequireRole roles={['ADMIN']}>
              <WomenOrders />
            </RequireRole>
          }
        />
        <Route
          path="/offers"
          element={
            <RequireRole roles={['ADMIN']}>
              <Offers />
            </RequireRole>
          }
        />
        <Route
          path="/offers/:id"
          element={
            <RequireRole roles={['ADMIN']}>
              <OfferDetail />
            </RequireRole>
          }
        />
        <Route
          path="/bot-orders/:id"
          element={
            <RequireRole roles={['ADMIN']}>
              <OrderDetail />
            </RequireRole>
          }
        />
        <Route
          path="/news/new"
          element={
            <RequireRole roles={['ADMIN']}>
              <NewsEditor />
            </RequireRole>
          }
        />
        <Route
          path="/news/:id"
          element={
            <RequireRole roles={['ADMIN']}>
              <NewsEditor />
            </RequireRole>
          }
        />
        <Route
          path="/news"
          element={
            <RequireRole roles={['ADMIN']}>
              <News />
            </RequireRole>
          }
        />
        <Route
          path="/giveaway"
          element={
            <RequireRole roles={['ADMIN']}>
              <Giveaway />
            </RequireRole>
          }
        />
        <Route
          path="/finance"
          element={
            <RequireRole roles={['ADMIN']}>
              <Finance />
            </RequireRole>
          }
        />
        <Route
          path="/ratings"
          element={
            <RequireRole roles={['ADMIN']}>
              <Ratings />
            </RequireRole>
          }
        />
        <Route
          path="/services"
          element={
            <RequireRole roles={['ADMIN']}>
              <Services />
            </RequireRole>
          }
        />
        <Route
          path="/cars"
          element={
            <RequireRole roles={['ADMIN']}>
              <Cars />
            </RequireRole>
          }
        />
        <Route
          path="/map-places"
          element={
            <RequireRole roles={['ADMIN']}>
              <MapPlaces />
            </RequireRole>
          }
        />
        <Route
          path="/rentals"
          element={
            <RequireRole roles={['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR']}>
              <Rentals />
            </RequireRole>
          }
        />
        <Route
          path="/subscription-plans"
          element={
            <RequireRole roles={['ADMIN']}>
              <SubscriptionPlans />
            </RequireRole>
          }
        />
        <Route
          path="/promo"
          element={
            <RequireRole roles={['ADMIN']}>
              <Promo />
            </RequireRole>
          }
        />
        <Route
          path="/broadcast"
          element={
            <RequireRole roles={['ADMIN']}>
              <Broadcast />
            </RequireRole>
          }
        />
        <Route
          path="/audit"
          element={
            <RequireRole roles={['ADMIN']}>
              <AuditLog />
            </RequireRole>
          }
        />
        <Route
          path="/leads"
          element={
            <RequireRole roles={['ADMIN', 'SALES_OPERATOR']}>
              <Leads />
            </RequireRole>
          }
        />
        <Route
          path="/canned-responses"
          element={
            <RequireRole roles={['ADMIN', 'SUPPORT_OPERATOR']}>
              <CannedResponses />
            </RequireRole>
          }
        />
        <Route
          path="/groups"
          element={
            <RequireRole roles={['ADMIN']}>
              <TelegramGroups />
            </RequireRole>
          }
        />
        <Route
          path="/integrations"
          element={
            <RequireRole roles={['ADMIN']}>
              <Integrations />
            </RequireRole>
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
