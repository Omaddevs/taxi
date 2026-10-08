import { MobileHome } from '../components/home/MobileHome'
import { DesktopHome } from '../components/home/DesktopHome'

export default function Home() {
  return (
    <>
      <div className="lg:hidden">
        <MobileHome />
      </div>
      <div className="hidden lg:block">
        <DesktopHome />
      </div>
    </>
  )
}
