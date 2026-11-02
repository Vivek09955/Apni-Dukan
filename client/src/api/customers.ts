import api from './client'
import type { ApiResponse } from '../types'

export const getCustomers = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/customers', { params })
  return data
}

export const getCustomer = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.get(`/customers/${id}`)
  return data
}

export const createCustomer = async (payload: any): Promise<ApiResponse> => {
  const { data } = await api.post('/customers', payload)
  return data
}

export const updateCustomer = async (id: string, payload: any): Promise<ApiResponse> => {
  const { data } = await api.patch(`/customers/${id}`, payload)
  return data
}

export const deleteCustomer = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.delete(`/customers/${id}`)
  return data
}

export const getCustomerLedger = async (id: string, params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get(`/customers/${id}/ledger`, { params })
  return data
}

export const getCustomerOutstanding = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.get(`/customers/${id}/outstanding`)
  return data
}
