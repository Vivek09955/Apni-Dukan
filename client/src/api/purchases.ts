import api from './client'
import type { ApiResponse } from '../types'

export const getPurchaseBills = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/purchases', { params })
  return data
}

export const getPurchaseBill = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.get(`/purchases/${id}`)
  return data
}

export const createPurchaseBill = async (payload: any): Promise<ApiResponse> => {
  const { data } = await api.post('/purchases', payload)
  return data
}

export const cancelPurchaseBill = async (id: string, reason?: string): Promise<ApiResponse> => {
  const { data } = await api.post(`/purchases/${id}/cancel`, { reason })
  return data
}
