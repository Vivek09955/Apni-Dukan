import api from './client'
import type { ApiResponse, PurchaseOrder } from '../types'

export const getPurchaseOrders = async (params?: Record<string, any>): Promise<ApiResponse<{ orders: PurchaseOrder[]; pagination: any }>> => {
  const { data } = await api.get('/purchase-orders', { params })
  return data
}

export const getPurchaseOrder = async (id: string): Promise<ApiResponse<{ order: PurchaseOrder }>> => {
  const { data } = await api.get(`/purchase-orders/${id}`)
  return data
}

export const createPurchaseOrder = async (payload: any): Promise<ApiResponse<{ order: PurchaseOrder }>> => {
  const { data } = await api.post('/purchase-orders', payload)
  return data
}

export const convertPurchaseOrderToBill = async (id: string): Promise<ApiResponse<{ billId: string; billNumber: string }>> => {
  const { data } = await api.post(`/purchase-orders/${id}/convert`)
  return data
}

export const updatePurchaseOrderStatus = async (id: string, status: string): Promise<ApiResponse<{ order: PurchaseOrder }>> => {
  const { data } = await api.patch(`/purchase-orders/${id}/status`, { status })
  return data
}

export const deletePurchaseOrder = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.delete(`/purchase-orders/${id}`)
  return data
}
