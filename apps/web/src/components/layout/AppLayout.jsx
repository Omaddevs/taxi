import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MobileDrawer } from './MobileDrawer'
import { TopHeader } from './TopHeader'
import { LocationPicker } from '../location/LocationPicker'
import { useApp } from '../../context/AppContext'
import { buzzOnOpen } from '../../lib/vibrate'
import { t } from '../../i18n'

const fullBleed = ['/driver', '/sos']
// Account screens (hamburger menu) draw their own header and run edge to edge on mobile.
const accountScreens = ['/settings', '/settings/profile', '/payment-methods', '/payment-methods/add-card', '/addresses', '/promo', '/help', '/info', '/about', '/history']
const hideTopMobile = ['/', '/taxi', '/women/taxi', '/history', '/ride', '/plus', '/fuel', '/map', '/wallet', ...accountScreens]
const flushMobile = ['/plus', '/fuel', '/map', '/wallet']
const mapScreens = ['/fuel', '/map', '/taxi', '/women/taxi', '/ride']

// Pages that draw their own mobile header (ScreenHeader, with a back arrow): the app's top bar
// would only repeat it, so it is hidden on phones there.
const ownHeader = ['/cars', '/drivers', '/favorites', '/messages', '/notifications', '/payment', '/profile', '/roadside', '/results', '/ai']
function hasOwnHeader(pathname) {
  return ownHeader.includes(pathname) || /^\/(drivers|trip|hub)\/[^/]+$/.test(pathname)
}

function isHubMap(pathname) {
  return (
    pathname.startsWith('/hub/auto-service') ||
    pathname.startsWith('/hub/wash') ||
    pathname.startsWith('/hub/parking') ||
    pathname.startsWith('/hub/ev') ||
    pathname.startsWith('/hub/food')
  )
}

// Buyurtma sahifasi: tepada xarita, o‘z "orqaga" tugmasi bilan.
function isOrder(pathname) {
  return pathname.startsWith('/order/')
}

// Chat o‘z sarlavhasi va to‘liq balandligini boshqaradi.
function isChat(pathname) {
  return pathname.startsWith('/messages/')
}

export function AppLayout() {
  const { pathname } = useLocation()
  const { user } = useApp()
  const hideChrome = fullBleed.includes(pathname)
  useEffect(buzzOnOpen, [])

  if (!user) {
    return <div className="flex min-h-svh items-center justify-center text-sm font-semibold text-muted">{t('Yuklanmoqda…')}</div>
  }
  const mobileHome = pathname === '/'
  const account = accountScreens.includes(pathname)
  const hideHeaderMobile =
    hideTopMobile.includes(pathname) || hasOwnHeader(pathname) || isHubMap(pathname) || isChat(pathname) || isOrder(pathname)
  const flush = flushMobile.includes(pathname) || isHubMap(pathname) || isOrder(pathname)
  const mapScreen = mapScreens.includes(pathname) || isHubMap(pathname) || isChat(pathname)

  return (
    <div className={`min-h-svh overflow-x-clip ${mobileHome || account ? 'bg-white lg:bg-canvas' : 'bg-canvas'}`}>
      <div className="flex min-h-svh">
        <div className="flex min-w-0 flex-1 flex-col">
          {!hideChrome ? (
            <div className={hideHeaderMobile ? 'hidden lg:block' : ''}>
              <TopHeader />
            </div>
          ) : null}
          <main
            className={`flex-1 ${
              hideChrome
                ? ''
                : isChat(pathname)
                  ? ''
                  : mapScreen
                    ? 'lg:px-[max(2rem,calc((100%-1180px)/2))] lg:pb-8 lg:pt-6'
                    : mobileHome || account
                      ? 'lg:px-[max(2rem,calc((100%-1180px)/2))] lg:pb-8 lg:pt-6'
                      : flush
                        ? 'pb-24 lg:px-[max(2rem,calc((100%-1180px)/2))] lg:pb-8 lg:pt-6'
                        : 'px-4 pb-24 pt-4 lg:px-[max(2rem,calc((100%-1180px)/2))] lg:pb-8 lg:pt-6'
            }`}
          >
            <Outlet />
          </main>
        </div>
      </div>
      <MobileDrawer />
      <LocationPicker />
    </div>
  )
}
