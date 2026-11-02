import api from './client'
import type { ApiResponse, DashboardData } from '../types'

export const getDashboardData = async (params?: Record<string, any>): Promise<ApiResponse<DashboardData>> => {
  const { data } = await api.get('/dashboard', { params })
  return data
}
