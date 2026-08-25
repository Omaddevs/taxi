import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MobileDrawer } from './MobileDrawer'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { LocationPicker } from '../location/LocationPicker'

const fullBleed = ['/driver', '/sos']
const hideTopMobile = ['/', '/ride', '/plus', '/fuel', '/map', '/wallet']
const flushMobile = ['/ride', '/plus', '/fuel', '/map', '/wallet']
const mapScreens = ['/fuel', '/map']

function isHubMap(pathname) {
  return (
    pathname.startsWith('/hub/auto-service') ||
    pathname.startsWith('/hub/wash') ||
    pathname.startsWith('/hub/parking') ||
    pathname.startsWith('/hub/ev') ||
    pathname.startsWith('/hub/food')
  )
}

// Chat o‘z sarlavhasi va to‘liq balandligini boshqaradi.
function isChat(pathname) {
  return pathname.startsWith('/messages/')
}

export function AppLayout() {
  const { pathname } = useLocation()
  const hideChrome = fullBleed.includes(pathname)
  const mobileHome = pathname === '/'
  const hideHeaderMobile = hideTopMobile.includes(pathname) || isHubMap(pathname) || isChat(pathname)
  const flush = flushMobile.includes(pathname) || isHubMap(pathname)
  const mapScreen = mapScreens.includes(pathname) || isHubMap(pathname) || isChat(pathname)

  return (
    <div className={`min-h-svh ${mobileHome ? 'bg-white lg:bg-canvas' : 'bg-canvas'}`}>
      <div className="mx-auto flex min-h-svh max-w-[1440px]">
        {!hideChrome ? (
          <div className="sticky top-0 hidden h-svh lg:block">
            <Sidebar />
          </div>
        ) : null}

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
                : mapScreen
                  ? 'lg:px-8 lg:pb-8 lg:pt-6'
                  : mobileHome
                    ? 'pb-24 lg:px-8 lg:pb-8 lg:pt-6'
                    : flush
                      ? 'pb-24 lg:px-8 lg:pb-8 lg:pt-6'
                      : 'px-4 pb-24 pt-4 lg:px-8 lg:pb-8 lg:pt-6'
            }`}
          >
            <Outlet />
          </main>
        </div>
      </div>
      {!hideChrome ? <BottomNav /> : null}
      <MobileDrawer />
      <LocationPicker />
    </div>
  )
}
