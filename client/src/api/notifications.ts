import api from './client'
import type { ApiResponse, AppNotification } from '../types'

export const getNotifications = async (params?: Record<string, any>): Promise<ApiResponse<{ notifications: AppNotification[]; total: number; unreadCount: number }>> => {
  const { data } = await api.get('/notifications', { params })
  return data
}

export const getUnreadCount = async (): Promise<ApiResponse<{ count: number }>> => {
  const { data } = await api.get('/notifications/unread-count')
  return data
}

export const markAsRead = async (id: string): Promise<ApiResponse<{ notification: AppNotification }>> => {
  const { data } = await api.patch(`/notifications/${id}/read`)
  return data
}

export const markAllAsRead = async (): Promise<ApiResponse<{ success: boolean }>> => {
  const { data } = await api.post('/notifications/read-all')
  return data
}
