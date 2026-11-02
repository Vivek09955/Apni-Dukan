import api from './client'
import type { ApiResponse } from '../types'

export const getSalesReport = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/sales/summary', { params })
  return data
}

export const getPurchaseReport = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/purchases/summary', { params })
  return data
}
