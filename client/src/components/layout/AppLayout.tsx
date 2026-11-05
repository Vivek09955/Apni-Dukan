import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { useAuthStore } from '../../store/authStore'
import { getBusinesses } from '../../api/businesses'

export const AppLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isAuthenticated, currentBusiness, setBusinesses, setCurrentBusiness } = useAuthStore()

  // Fetch businesses on mount if authenticated but no business is set
  useEffect(() => {
    if (!isAuthenticated) return
    if (currentBusiness?._id) return // already have a valid business

    const fetchBusinesses = async () => {
      try {
        const bizResponse = await getBusinesses()
        const bizData = bizResponse?.data as any
        const membershipList = bizData?.businesses || bizData || []
        const businessList: any[] = Array.isArray(membershipList)
          ? membershipList.map((m: any) => m.business || m)
          : []

        if (businessList.length > 0) {
          setBusinesses(businessList)
          if (!currentBusiness) {
            setCurrentBusiness(businessList[0])
          }
        }
      } catch {
        // silently fail — user may need to create a business
      }
    }

    fetchBusinesses()
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Navbar */}
        <TopNav onToggleSidebar={() => setMobileSidebarOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
