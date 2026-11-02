import { useState, type ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Store,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Box,
  Users,
  IndianRupee,
  Receipt,
  BookOpen,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

export interface NavItem {
  title: string
  icon: ComponentType<{ className?: string }>
  path?: string
  children?: { title: string; path: string }[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    title: 'Sales',
    icon: ShoppingCart,
    children: [
      { title: 'Invoices', path: '/sales' },
      { title: 'Quotations', path: '/sales/quotations' },
      { title: 'Sales Orders', path: '/sales/orders' },
      { title: 'Sales Returns', path: '/sales/returns' },
      { title: 'Delivery Challans', path: '/sales/challans' },
    ],
  },
  {
    title: 'Purchases',
    icon: Package,
    children: [
      { title: 'Bills', path: '/purchases' },
      { title: 'Purchase Orders', path: '/purchases/orders' },
      { title: 'Purchase Returns', path: '/purchases/returns' },
    ],
  },
  {
    title: 'Products',
    icon: Box,
    children: [
      { title: 'All Products', path: '/products' },
      { title: 'Categories', path: '/products/categories' },
      { title: 'Inventory', path: '/products/inventory' },
      { title: 'Warehouses', path: '/products/warehouses' },
    ],
  },
  {
    title: 'Parties',
    icon: Users,
    children: [
      { title: 'Customers', path: '/customers' },
      { title: 'Suppliers', path: '/suppliers' },
    ],
  },
  {
    title: 'Payments',
    icon: IndianRupee,
    children: [
      { title: 'Payments In', path: '/payments' },
      { title: 'Payments Out', path: '/payments/out' },
      { title: 'Outstanding', path: '/payments/outstanding' },
    ],
  },
  {
    title: 'Expenses',
    icon: Receipt,
    children: [
      { title: 'Expenses', path: '/expenses' },
      { title: 'Other Income', path: '/expenses/income' },
    ],
  },
  {
    title: 'Accounting',
    icon: BookOpen,
    children: [
      { title: 'Journal Entries', path: '/accounting' },
      { title: 'Ledger', path: '/accounting/ledger' },
      { title: 'Chart of Accounts', path: '/accounting/accounts' },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
    children: [
      { title: 'Sales Reports', path: '/reports' },
      { title: 'Purchase Reports', path: '/reports/purchases' },
      { title: 'Financial Reports', path: '/reports/financial' },
      { title: 'GST Reports', path: '/reports/gst' },
      { title: 'Stock Reports', path: '/reports/stock' },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    children: [
      { title: 'Business Settings', path: '/settings' },
      { title: 'User Management', path: '/settings/users' },
      { title: 'Backup', path: '/settings/backup' },
    ],
  },
]

export interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) => {
  const location = useLocation()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Sales: true,
    Purchases: false,
    Products: false,
    Parties: false,
    Payments: false,
    Expenses: false,
    Accounting: false,
    Reports: false,
    Settings: false,
  })

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const isChildActive = (children?: { title: string; path: string }[]) => {
    if (!children) return false
    return children.some(
      (c) => location.pathname === c.path || (c.path !== '/dashboard' && location.pathname.startsWith(c.path))
    )
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'w-64'}
        `}
      >
        {/* Header / Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-base text-gray-900 leading-tight">Apni Dukan</span>
                <span className="text-[10px] text-gray-500 font-medium">Business Suite</span>
              </div>
            )}
          </Link>

          {/* Close for mobile */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation items list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const hasChildren = Boolean(item.children && item.children.length > 0)
            const isSingleActive = item.path ? location.pathname === item.path : false
            const isGroupActive = isChildActive(item.children)
            const isExpanded = Boolean(expandedSections[item.title])

            if (!hasChildren && item.path) {
              return (
                <Link
                  key={item.title}
                  to={item.path}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isSingleActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                    ${isCollapsed ? 'justify-center px-2' : ''}
                  `}
                  title={isCollapsed ? item.title : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isSingleActive ? 'text-white' : 'text-gray-500'}`} />
                  {!isCollapsed && <span>{item.title}</span>}
                </Link>
              )
            }

            return (
              <div key={item.title} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection(item.title)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isGroupActive && !isExpanded
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                    ${isCollapsed ? 'justify-center px-2' : ''}
                  `}
                  title={isCollapsed ? item.title : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 shrink-0 ${isGroupActive ? 'text-blue-600' : 'text-gray-500'}`} />
                    {!isCollapsed && <span>{item.title}</span>}
                  </div>
                  {!isCollapsed && (
                    <span className="text-gray-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                  )}
                </button>

                {/* Sub-menu */}
                {!isCollapsed && isExpanded && item.children && (
                  <div className="pl-9 pr-2 space-y-1 py-1">
                    {item.children.map((child) => {
                      const isSubActive =
                        location.pathname === child.path ||
                        (child.path !== '/sales' &&
                          child.path !== '/purchases' &&
                          child.path !== '/products' &&
                          child.path !== '/payments' &&
                          child.path !== '/expenses' &&
                          child.path !== '/accounting' &&
                          child.path !== '/reports' &&
                          child.path !== '/settings' &&
                          location.pathname.startsWith(child.path))

                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onClose}
                          className={`
                            block px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                            ${
                              isSubActive
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          {child.title}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Sidebar Footer info */}
        {!isCollapsed && (
          <div className="p-3 border-t border-gray-200 text-center">
            <p className="text-[11px] text-gray-400">Apni Dukan v1.0.0 &copy; 2026</p>
          </div>
        )}
      </aside>
    </>
  )
}
