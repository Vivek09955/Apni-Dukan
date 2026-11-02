import api from './client'
import type { ApiResponse } from '../types'

export const getExpenses = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/expenses', { params })
  return data
}

export const getExpense = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.get(`/expenses/${id}`)
  return data
}

export const createExpense = async (payload: any): Promise<ApiResponse> => {
  const { data } = await api.post('/expenses', payload)
  return data
}

export const cancelExpense = async (id: string, reason?: string): Promise<ApiResponse> => {
  const { data } = await api.patch(`/expenses/${id}/cancel`, { reason })
  return data
}

export const getExpenseCategories = async (): Promise<ApiResponse> => {
  const { data } = await api.get('/expenses/categories')
  return data
}

export const getExpenseSummary = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/expenses/summary', { params })
  return data
}
