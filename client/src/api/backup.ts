import api from './client'
import type { ApiResponse, BackupRecord } from '../types'

export const createBackup = async (): Promise<ApiResponse<{ backup: BackupRecord }>> => {
  const { data } = await api.post('/backup/create')
  return data
}

export const getBackups = async (): Promise<ApiResponse<{ backups: BackupRecord[] }>> => {
  const { data } = await api.get('/backup')
  return data
}

export const restoreBackup = async (id: string): Promise<ApiResponse<{ message: string }>> => {
  const { data } = await api.post(`/backup/${id}/restore`)
  return data
}
