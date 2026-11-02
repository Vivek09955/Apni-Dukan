import api from './client'
import type { ApiResponse, DeliveryChallan } from '../types'

export const getDeliveryChallans = async (params?: Record<string, any>): Promise<ApiResponse<{ challans: DeliveryChallan[]; pagination: any }>> => {
  const { data } = await api.get('/delivery-challans', { params })
  return data
}

export const getDeliveryChallan = async (id: string): Promise<ApiResponse<{ challan: DeliveryChallan }>> => {
  const { data } = await api.get(`/delivery-challans/${id}`)
  return data
}

export const createDeliveryChallan = async (payload: any): Promise<ApiResponse<{ challan: DeliveryChallan }>> => {
  const { data } = await api.post('/delivery-challans', payload)
  return data
}

export const updateDeliveryChallanStatus = async (id: string, status: string): Promise<ApiResponse<{ challan: DeliveryChallan }>> => {
  const { data } = await api.patch(`/delivery-challans/${id}/status`, { status })
  return data
}

export const deleteDeliveryChallan = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.delete(`/delivery-challans/${id}`)
  return data
}
