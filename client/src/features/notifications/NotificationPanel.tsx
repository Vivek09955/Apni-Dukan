import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Clock,
  CheckCheck,
  CreditCard,
  FileText,
  AlertTriangle,
  Info,
  Package,
  Bell,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getNotifications, markAsRead, markAllAsRead } from '../../api/notifications'
import type { AppNotification } from '../../types'

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
}

function timeAgo(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return 'recently'
  }
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ limit: 20 }),
    enabled: isOpen,
  })

  const rawNotifications = data?.data?.notifications || (Array.isArray(data?.data) ? data?.data : [])
  const notifications: AppNotification[] = Array.isArray(rawNotifications) ? rawNotifications : []

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const readMutation = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] })
    },
  })

  const readAllMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] })
    },
  })

  const handleNotificationClick = (item: AppNotification) => {
    if (!item.isRead) {
      readMutation.mutate(item._id)
    }
    onClose()

    // Navigation according to notification type
    switch (item.type) {
      case 'low_stock':
        navigate('/products')
        break
      case 'payment_due':
      case 'payment_overdue':
        if (item.data?.invoiceId) {
          navigate(`/sales/${item.data.invoiceId}`)
        } else {
          navigate('/payments')
        }
        break
      case 'invoice_created':
        if (item.data?.invoiceId) {
          navigate(`/sales/${item.data.invoiceId}`)
        } else {
          navigate('/sales')
        }
        break
      case 'quotation_expiring':
        if (item.data?.quotationId) {
          navigate(`/sales/quotations/${item.data.quotationId}`)
        } else {
          navigate('/sales/quotations')
        }
        break
      default:
        navigate('/dashboard')
    }
  }

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'low_stock':
        return <Package className="w-4 h-4 text-amber-600" />
      case 'payment_due':
        return <CreditCard className="w-4 h-4 text-blue-600" />
      case 'payment_overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />
      case 'invoice_created':
        return <FileText className="w-4 h-4 text-emerald-600" />
      case 'quotation_expiring':
        return <Clock className="w-4 h-4 text-amber-600" />
      default:
        return <Info className="w-4 h-4 text-blue-600" />
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fadeIn"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending || notifications.length === 0}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500 space-y-2">
            <Bell className="w-8 h-8 text-gray-300 mx-auto" />
            <p>You have no notifications right now</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item._id}
              onClick={() => handleNotificationClick(item)}
              className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                !item.isRead ? 'bg-blue-50/30' : ''
              }`}
            >
              <div className="p-2 rounded-xl bg-gray-100 shrink-0">
                {getNotificationIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {item.title}
                  </p>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                  {item.message}
                </p>
              </div>
              {!item.isRead && (
                <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 self-center" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
