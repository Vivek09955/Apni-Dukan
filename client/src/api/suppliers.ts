import api from './client'
import type { ApiResponse } from '../types'

export const getSuppliers = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/suppliers', { params })
  return data
}

export const getSupplier = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.get(`/suppliers/${id}`)
  return data
}

export const createSupplier = async (payload: any): Promise<ApiResponse> => {
  const { data } = await api.post('/suppliers', payload)
  return data
}

export const updateSupplier = async (id: string, payload: any): Promise<ApiResponse> => {
  const { data } = await api.patch(`/suppliers/${id}`, payload)
  return data
}

export const deleteSupplier = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.delete(`/suppliers/${id}`)
  return data
}

export const getSupplierLedger = async (id: string, params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get(`/suppliers/${id}/ledger`, { params })
  return data
}
