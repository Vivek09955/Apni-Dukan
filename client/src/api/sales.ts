import api from './client'
import type { ApiResponse } from '../types'

export const getInvoices = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/sales', { params })
  return data
}

export const getInvoice = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.get(`/sales/${id}`)
  return data
}

export const createInvoice = async (payload: any): Promise<ApiResponse> => {
  const { data } = await api.post('/sales', payload)
  return data
}

export const issueInvoice = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.post(`/sales/${id}/issue`)
  return data
}

export const cancelInvoice = async (id: string, reason?: string): Promise<ApiResponse> => {
  const { data } = await api.post(`/sales/${id}/cancel`, { reason })
  return data
}

export const getSalesSummary = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/sales/summary', { params })
  return data
}
