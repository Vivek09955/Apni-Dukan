import api from './client'
import type {
  ApiResponse,
  GSTR1Report,
  GSTR3BSummary,
  HSNSummaryRow,
  TaxRateSummaryRow,
} from '../types'

export const getGSTR1 = async (params?: Record<string, any>): Promise<ApiResponse<GSTR1Report>> => {
  const { data } = await api.get('/reports/gst/gstr1', { params })
  return data
}

export const getGSTR3B = async (params?: Record<string, any>): Promise<ApiResponse<GSTR3BSummary>> => {
  const { data } = await api.get('/reports/gst/gstr3b', { params })
  return data
}

export const getHSNSummary = async (params?: Record<string, any>): Promise<ApiResponse<{ hsnSummary: HSNSummaryRow[] }>> => {
  const { data } = await api.get('/reports/gst/hsn-summary', { params })
  return data
}

export const getTaxRateSummary = async (params?: Record<string, any>): Promise<ApiResponse<{ taxRateSummary: TaxRateSummaryRow[] }>> => {
  const { data } = await api.get('/reports/gst/tax-rate-summary', { params })
  return data
}
