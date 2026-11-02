import api from './client'
import type { ApiResponse } from '../types'

export const getPayments = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/payments', { params })
  return data
}

export const getPayment = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.get(`/payments/${id}`)
  return data
}

export const createPayment = async (payload: any): Promise<ApiResponse> => {
  const { data } = await api.post('/payments', payload)
  return data
}

export const cancelPayment = async (id: string, reason: string): Promise<ApiResponse> => {
  const { data } = await api.patch(`/payments/${id}/cancel`, { reason })
  return data
}

export const getOutstandingInvoices = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/payments/outstanding', { params })
  return data
}
