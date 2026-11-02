import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Store } from 'lucide-react'

export interface AuthLayoutProps {
  children?: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/login" className="inline-flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Store className="w-7 h-7" />
          </div>
          <div className="text-left">
            <span className="text-2xl font-bold tracking-tight text-gray-900 block leading-tight">
              Apni Dukan
            </span>
            <span className="text-xs text-blue-600 font-semibold tracking-wider uppercase">
              Apni Pehchan
            </span>
          </div>
        </Link>
      </div>

      {/* Main Form Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 sm:rounded-2xl border border-gray-100 sm:px-10">
          {children || <Outlet />}
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">
          Secure Cloud Business ERP &bull; Made for Indian MSMEs
        </p>
      </div>
    </div>
  )
}
