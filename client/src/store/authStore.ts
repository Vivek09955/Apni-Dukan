import { create } from 'zustand'
import type { User, Business } from '../types'

export interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  currentBusiness: Business | null
  businesses: Business[]
  setAuth: (user: User, token: string) => void
  setUser: (user: User | null) => void
  setBusinesses: (businesses: Business[]) => void
  setCurrentBusiness: (business: Business | null) => void
  logout: () => void
}

const TOKEN_KEY = 'apni_dukan_access_token'
const BUSINESS_KEY = 'apni_dukan_current_business'
const USER_KEY = 'apni_dukan_user'

const getInitialToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

const getInitialBusiness = (): Business | null => {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(BUSINESS_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as Business
  } catch {
    return null
  }
}

const getInitialUser = (): User | null => {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as User
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const initialToken = getInitialToken()
  const initialUser = getInitialUser()
  const initialBusiness = getInitialBusiness()

  return {
    user: initialUser,
    accessToken: initialToken,
    isAuthenticated: !!initialToken,
    currentBusiness: initialBusiness,
    businesses: initialBusiness ? [initialBusiness] : [],

    setAuth: (user: User, token: string) => {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      set({
        user,
        accessToken: token,
        isAuthenticated: true,
      })
    },

    setUser: (user: User | null) => {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(USER_KEY)
      }
      set({ user })
    },

    setBusinesses: (businesses: Business[]) => {
      set((state) => {
        let currentBusiness = state.currentBusiness
        if (!currentBusiness && businesses.length > 0) {
          currentBusiness = businesses[0]
          localStorage.setItem(BUSINESS_KEY, JSON.stringify(currentBusiness))
        } else if (currentBusiness && !businesses.some(b => b._id === currentBusiness?._id)) {
          currentBusiness = businesses[0] || null
          if (currentBusiness) {
            localStorage.setItem(BUSINESS_KEY, JSON.stringify(currentBusiness))
          } else {
            localStorage.removeItem(BUSINESS_KEY)
          }
        }
        return { businesses, currentBusiness }
      })
    },

    setCurrentBusiness: (business: Business | null) => {
      if (business) {
        localStorage.setItem(BUSINESS_KEY, JSON.stringify(business))
      } else {
        localStorage.removeItem(BUSINESS_KEY)
      }
      set({ currentBusiness: business })
    },

    logout: () => {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(BUSINESS_KEY)
      localStorage.removeItem(USER_KEY)
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        currentBusiness: null,
        businesses: [],
      })
    },
  }
})
