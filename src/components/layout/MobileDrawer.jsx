import { X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Sidebar } from './Sidebar'

export function MobileDrawer() {
  const { drawerOpen, setDrawerOpen, user } = useApp()
  if (!drawerOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Yopish"
        onClick={() => setDrawerOpen(false)}
      />
      <div className="relative h-full w-[86%] max-w-[300px] overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={user.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
            <div>
              <p className="font-bold">{user.name}</p>
              <p className="text-xs text-muted">{user.phone}</p>
            </div>
          </div>
          <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full bg-canvas p-2">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Sidebar embedded />
      </div>
    </div>
  )
}
