import api from './client'
import type { ApiResponse, SalesOrder } from '../types'

export const getSalesOrders = async (params?: Record<string, any>): Promise<ApiResponse<{ orders: SalesOrder[]; pagination: any }>> => {
  const { data } = await api.get('/sales-orders', { params })
  return data
}

export const getSalesOrder = async (id: string): Promise<ApiResponse<{ order: SalesOrder }>> => {
  const { data } = await api.get(`/sales-orders/${id}`)
  return data
}

export const createSalesOrder = async (payload: any): Promise<ApiResponse<{ order: SalesOrder }>> => {
  const { data } = await api.post('/sales-orders', payload)
  return data
}

export const convertSalesOrderToInvoice = async (id: string): Promise<ApiResponse<{ invoiceId: string; invoiceNumber: string }>> => {
  const { data } = await api.post(`/sales-orders/${id}/convert`)
  return data
}

export const updateSalesOrderStatus = async (id: string, status: string): Promise<ApiResponse<{ order: SalesOrder }>> => {
  const { data } = await api.patch(`/sales-orders/${id}/status`, { status })
  return data
}

export const deleteSalesOrder = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.delete(`/sales-orders/${id}`)
  return data
}
