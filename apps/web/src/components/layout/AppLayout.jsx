import { Outlet, useLocation } from 'react-router-dom'
import { MobileDrawer } from './MobileDrawer'
import { TopHeader } from './TopHeader'
import { LocationPicker } from '../location/LocationPicker'
import { RentMarketHost } from '../rent/RentMarketHost'
import { useApp } from '../../context/AppContext'
import { t } from '../../i18n'

const fullBleed = ['/driver', '/sos']
const hideTopMobile = ['/', '/taxi', '/women/taxi', '/history', '/ride', '/plus', '/fuel', '/map', '/wallet']
const flushMobile = ['/plus', '/fuel', '/map', '/wallet']
const mapScreens = ['/fuel', '/map', '/taxi', '/women/taxi']

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
  const { user } = useApp()
  const hideChrome = fullBleed.includes(pathname)

  if (!user) {
    return <div className="flex min-h-svh items-center justify-center text-sm font-semibold text-muted">{t('Yuklanmoqda…')}</div>
  }
  const mobileHome = pathname === '/'
  const hideHeaderMobile = hideTopMobile.includes(pathname) || isHubMap(pathname) || isChat(pathname)
  const flush = flushMobile.includes(pathname) || isHubMap(pathname)
  const mapScreen = mapScreens.includes(pathname) || isHubMap(pathname) || isChat(pathname)

  return (
    <div className={`min-h-svh overflow-x-clip ${mobileHome ? 'bg-white lg:bg-canvas' : 'bg-canvas'}`}>
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
                    : mobileHome
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
      <RentMarketHost />
    </div>
  )
}
