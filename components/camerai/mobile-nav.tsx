'use client'

import { Video, Truck, ClipboardList, Settings, Shield } from 'lucide-react'

interface MobileNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onOpenAuth: () => void
  userRole?: string
  isLoggedIn: boolean
}

export function MobileNav({ activeTab, onTabChange, onOpenAuth, userRole, isLoggedIn }: MobileNavProps) {
  const isMember = userRole === 'member'

  const navItems = isMember
    ? [
        { id: 'monitor', label: 'Camera AI', icon: Video },
        { id: 'profile', label: 'Tài Khoản', icon: Shield, isAuth: true },
      ]
    : [
        { id: 'monitor', label: 'Camera AI', icon: Video },
        { id: 'vehicles', label: 'Danh Mục Xe', icon: Truck },
        { id: 'logs', label: 'Nhật Ký', icon: ClipboardList },
        { id: 'settings', label: 'Cấu Hình', icon: Settings },
      ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-lg">
      <div className={`grid ${isMember ? 'grid-cols-2' : 'grid-cols-4'} gap-1`}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = !item.isAuth && activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.isAuth) {
                  onOpenAuth()
                } else {
                  onTabChange(item.id)
                }
              }}
              className={`flex min-h-11 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                isActive ? 'text-primary font-bold bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
