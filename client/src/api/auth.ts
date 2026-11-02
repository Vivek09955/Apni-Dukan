import { apiClient } from './client'
import type { ApiResponse, AuthResponse, LoginPayload, RegisterPayload, User } from '../types'

export const registerUser = async (data: RegisterPayload): Promise<ApiResponse<AuthResponse>> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data)
  return response.data
}

export const loginUser = async (data: LoginPayload): Promise<ApiResponse<AuthResponse>> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data)
  return response.data
}

export const refreshAccessToken = async (): Promise<ApiResponse<{ accessToken: string }>> => {
  const response = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh')
  return response.data
}

export const logoutUser = async (): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>('/auth/logout')
  return response.data
}

export const forgotPassword = async (email: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>('/auth/forgot-password', { email })
  return response.data
}

export const resetPassword = async (token: string, password: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.post<ApiResponse<void>>('/auth/reset-password', { token, password })
  return response.data
}

export const getMe = async (): Promise<ApiResponse<{ user: User }>> => {
  const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me')
  return response.data
}
