import api from './client'
import type { ApiResponse } from '../types'

// Accounts (Chart of Accounts)
export const getAccounts = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/accounting/accounts', { params })
  return data
}

export const getAccount = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.get(`/accounting/accounts/${id}`)
  return data
}

export const createAccount = async (payload: any): Promise<ApiResponse> => {
  const { data } = await api.post('/accounting/accounts', payload)
  return data
}

export const updateAccount = async (id: string, payload: any): Promise<ApiResponse> => {
  const { data } = await api.patch(`/accounting/accounts/${id}`, payload)
  return data
}

// Journal Entries
export const getJournalEntries = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/accounting/journal-entries', { params })
  return data
}

export const getJournalEntry = async (id: string): Promise<ApiResponse> => {
  const { data } = await api.get(`/accounting/journal-entries/${id}`)
  return data
}

export const createJournalEntry = async (payload: any): Promise<ApiResponse> => {
  const { data } = await api.post('/accounting/journal-entries', payload)
  return data
}

export const reverseJournalEntry = async (id: string, reason?: string): Promise<ApiResponse> => {
  const { data } = await api.post(`/accounting/journal-entries/${id}/reverse`, { reason })
  return data
}

// Account Ledger
export const getAccountLedger = async (accountId: string, params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get(`/accounting/ledger/${accountId}`, { params })
  return data
}

// Financial Statements & Reports
export const getTrialBalance = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/accounting/reports/trial-balance', { params })
  return data
}

export const getProfitLoss = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/accounting/reports/profit-loss', { params })
  return data
}

export const getBalanceSheet = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/accounting/reports/balance-sheet', { params })
  return data
}

// Books of Account
export const getDayBook = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/accounting/books/day-book', { params })
  return data
}

export const getCashBook = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/accounting/books/cash-book', { params })
  return data
}

export const getBankBook = async (params?: Record<string, any>): Promise<ApiResponse> => {
  const { data } = await api.get('/accounting/books/bank-book', { params })
  return data
}
