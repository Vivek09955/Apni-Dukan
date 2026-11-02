import api from './client'
import type { ApiResponse, Quotation } from '../types'

export const getQuotations = async (params?: Record<string, any>): Promise<ApiResponse<{ quotations: Quotation[]; pagination: any }>> => {
  const { data } = await api.get('/quotations', { params })
  return data
}

export const getQuotation = async (id: string): Promise<ApiResponse<{ quotation: Quotation }>> => {
  const { data } = await api.get(`/quotations/${id}`)
  return data
}

export const createQuotation = async (payload: any): Promise<ApiResponse<{ quotation: Quotation }>> => {
  const { data } = await api.post('/quotations', payload)
  return data
}

export const updateQuotationStatus = async (id: string, status: string): Promise<ApiResponse<{ quotation: Quotation }>> => {
  const { data } = await api.patch(`/quotations/${id}/status`, { status })
  return data
}

export const convertToInvoice = async (id: string): Promise<ApiResponse<{ invoiceId: string; invoiceNumber: string }>> => {
  const { data } = await api.post(`/quotations/${id}/convert`)
  return data
}

export const deleteQuotation = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.delete(`/quotations/${id}`)
  return data
}
