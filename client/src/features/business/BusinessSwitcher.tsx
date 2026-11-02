import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, ChevronDown, Check, Plus, Building2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import type { Business } from '../../types'

export const BusinessSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  const { currentBusiness, businesses, setCurrentBusiness } = useAuthStore()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (business: Business) => {
    setCurrentBusiness(business)
    setIsOpen(false)
  }

  const handleAddNew = () => {
    setIsOpen(false)
    navigate('/setup')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-sm font-medium transition-all shadow-xs"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Store className="w-4 h-4" />
        </div>
        <div className="text-left max-w-[140px] sm:max-w-[180px] truncate">
          <p className="text-xs font-semibold leading-tight truncate">
            {currentBusiness?.name || 'Select Business'}
          </p>
          <p className="text-[10px] text-gray-500 leading-tight">
            {currentBusiness?.gstin ? `GST: ${currentBusiness.gstin}` : 'Active Business'}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 animate-fadeIn">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Your Businesses
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {businesses.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-500 text-center">
                No businesses registered
              </div>
            ) : (
              businesses.map((b) => {
                const isSelected = currentBusiness?._id === b._id
                return (
                  <button
                    key={b._id}
                    type="button"
                    onClick={() => handleSelect(b)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50/60 font-semibold text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <p className="truncate text-xs leading-tight">{b.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{b.state || 'General'}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                  </button>
                )
              })
            )}
          </div>

          <div className="border-t border-gray-100 pt-1 mt-1">
            <button
              type="button"
              onClick={handleAddNew}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors rounded-b-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Business</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
