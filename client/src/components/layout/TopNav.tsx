import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Menu,
  Bell,
  User as UserIcon,
  LogOut,
  Settings as SettingsIcon,
  ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { BusinessSwitcher } from '../../features/business/BusinessSwitcher'
import { NotificationPanel } from '../../features/notifications/NotificationPanel'
import { getUnreadCount } from '../../api/notifications'
import { logoutUser } from '../../api/auth'
import toast from 'react-hot-toast'

export interface TopNavProps {
  onToggleSidebar: () => void
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const { user, logout, currentBusiness } = useAuthStore()

  // Unread notifications count
  const { data: countData } = useQuery({
    queryKey: ['notificationsUnreadCount', currentBusiness?._id],
    queryFn: () => getUnreadCount(),
    refetchInterval: 30000,
  })

  const unreadCount = countData?.data?.count ?? 0

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch {
      // ignore
    } finally {
      logout()
      toast.success('Logged out successfully')
      navigate('/login')
    }
  }

  // Generate page title from route
  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/dashboard') return 'Dashboard'
    if (path.startsWith('/sales')) return 'Sales & Invoicing'
    if (path.startsWith('/purchases')) return 'Purchases & Bills'
    if (path.startsWith('/products')) return 'Inventory & Products'
    if (path.startsWith('/customers')) return 'Customers'
    if (path.startsWith('/suppliers')) return 'Suppliers'
    if (path.startsWith('/payments')) return 'Payments'
    if (path.startsWith('/expenses')) return 'Expenses & Income'
    if (path.startsWith('/accounting')) return 'Accounting'
    if (path.startsWith('/reports')) return 'Reports & Analytics'
    if (path.startsWith('/settings')) return 'Settings'
    return 'Apni Dukan'
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Center: Clean */}
      <div className="hidden md:block" />

      {/* Right: Business Switcher, Notifications, User Menu */}
      <div className="flex items-center gap-3">
        {/* Business Switcher Dropdown */}
        <BusinessSwitcher />

        {/* Notifications Bell & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationPanel
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        </div>

        {/* User Avatar & Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
            aria-expanded={userMenuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-tight truncate max-w-[100px]">
                {user?.name || 'User'}
              </p>
              <p className="text-[10px] text-gray-500 leading-tight truncate max-w-[100px]">
                {user?.email || ''}
              </p>
            </div>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-gray-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 animate-fadeIn">
              <div className="px-3 py-2 border-b border-gray-100 sm:hidden">
                <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false)
                  navigate('/settings')
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <SettingsIcon className="w-4 h-4 text-gray-400" />
                <span>Business Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false)
                  navigate('/settings/users')
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <UserIcon className="w-4 h-4 text-gray-400" />
                <span>User Profile</span>
              </button>

              <div className="border-t border-gray-100 my-1" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
