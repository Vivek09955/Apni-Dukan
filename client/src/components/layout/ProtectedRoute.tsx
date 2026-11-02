import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export interface ProtectedRouteProps {
  children: React.ReactElement
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, accessToken } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated && !accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
