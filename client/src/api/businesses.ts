import { apiClient } from './client'
import type {
  ApiResponse,
  Business,
  BusinessMember,
  CreateBusinessPayload,
  UpdateBusinessPayload,
  AddMemberPayload,
} from '../types'

export const createBusiness = async (data: CreateBusinessPayload): Promise<ApiResponse<Business>> => {
  const response = await apiClient.post<ApiResponse<Business>>('/businesses', data)
  return response.data
}

export const getBusinesses = async (): Promise<ApiResponse<Business[]>> => {
  const response = await apiClient.get<ApiResponse<Business[]>>('/businesses')
  return response.data
}

export const getBusiness = async (id: string): Promise<ApiResponse<Business>> => {
  const response = await apiClient.get<ApiResponse<Business>>(`/businesses/${id}`)
  return response.data
}

export const updateBusiness = async (id: string, data: UpdateBusinessPayload): Promise<ApiResponse<Business>> => {
  const response = await apiClient.patch<ApiResponse<Business>>(`/businesses/${id}`, data)
  return response.data
}

export const getBusinessMembers = async (id: string): Promise<ApiResponse<BusinessMember[]>> => {
  const response = await apiClient.get<ApiResponse<BusinessMember[]>>(`/businesses/${id}/members`)
  return response.data
}

export const addBusinessMember = async (id: string, data: AddMemberPayload): Promise<ApiResponse<BusinessMember>> => {
  const response = await apiClient.post<ApiResponse<BusinessMember>>(`/businesses/${id}/members`, data)
  return response.data
}

export const updateBusinessMember = async (
  businessId: string,
  memberId: string,
  data: { role?: string; permissions?: string[]; isActive?: boolean }
): Promise<ApiResponse<BusinessMember>> => {
  const response = await apiClient.patch<ApiResponse<BusinessMember>>(`/businesses/${businessId}/members/${memberId}`, data)
  return response.data
}

export const removeBusinessMember = async (
  businessId: string,
  memberId: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/businesses/${businessId}/members/${memberId}`)
  return response.data
}
