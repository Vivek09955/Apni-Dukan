import api from './client'
import type { ApiResponse } from '../types'

export const getProducts = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/products', { params })
  return data
}

export const getProduct = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.get(`/products/${id}`)
  return data
}

export const createProduct = async (payload: any): Promise<ApiResponse> => {
  const { data } = await api.post('/products', payload)
  return data
}

export const updateProduct = async (id: string, payload: any): Promise<ApiResponse> => {
  const { data } = await api.patch(`/products/${id}`, payload)
  return data
}

export const deleteProduct = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.delete(`/products/${id}`)
  return data
}

export const adjustStock = async (id: string, payload: any): Promise<ApiResponse> => {
  const { data } = await api.post(`/products/${id}/adjust-stock`, payload)
  return data
}

export const getCategories = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/categories', { params })
  return data
}
