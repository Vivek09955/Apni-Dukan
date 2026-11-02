import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Database,
  Download,
  RotateCcw,
  Plus,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { createBackup, getBackups, restoreBackup } from '../../api/backup'
import { formatDate } from '../../lib/utils'
import type { BackupRecord } from '../../types'

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 KB'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function BackupPage() {
  const queryClient = useQueryClient()
  const [restoringBackup, setRestoringBackup] = useState<BackupRecord | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => getBackups(),
  })

  const rawBackups = data?.data?.backups || (Array.isArray(data?.data) ? data?.data : [])
  const backups: BackupRecord[] = Array.isArray(rawBackups) ? rawBackups : []

  // Create Backup Mutation
  const createMutation = useMutation({
    mutationFn: () => createBackup(),
    onSuccess: () => {
      toast.success('Backup archive created successfully!')
      queryClient.invalidateQueries({ queryKey: ['backups'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create backup')
    },
  })

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreBackup(id),
    onSuccess: () => {
      toast.success('Business data successfully restored from backup snapshot!')
      queryClient.invalidateQueries()
      setRestoringBackup(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to restore backup')
    },
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Backup & Disaster Recovery</h1>
          <p className="text-sm text-gray-500 mt-1">
            Safeguard your transactions, accounting records, products, and party ledgers with secure snapshots.
          </p>
        </div>

        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          icon={<Plus className="w-4 h-4" />}
        >
          {createMutation.isPending ? 'Backing up...' : 'Create Backup'}
        </Button>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3">
        <Database className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-blue-950">Encrypted Cloud Snapshots</p>
          <p className="text-blue-800 leading-relaxed">
            Backups include all business data: products, invoices, payments, and accounting records.
            Snapshots are stored securely and can be downloaded or restored at any moment.
          </p>
        </div>
      </div>

      {/* Backups List Card */}
      <Card className="bg-white border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            Available Snapshots ({backups.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Scanning backup storage...
          </div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500 space-y-3">
            <HardDrive className="w-10 h-10 text-gray-300 mx-auto" />
            <p>No snapshots found. Click &quot;Create Backup&quot; to generate your first archive.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {backups.map((b, idx) => {
              const backupId = b._id || b.id || String(idx)
              return (
                <div
                  key={backupId}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                      <Database className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm font-mono">
                          {b.filename || `backup-${backupId.slice(0, 8)}.tar.gz`}
                        </p>
                        <Badge
                          variant={b.status === 'completed' ? 'success' : 'warning'}
                          className="capitalize text-[10px]"
                        >
                          {b.status || 'completed'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                        <span>Created on {formatDate(b.createdAt)}</span>
                        <span>•</span>
                        <span>Size: {formatBytes(b.size)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => setRestoringBackup(b)}
                      icon={<RotateCcw className="w-3.5 h-3.5 text-red-600" />}
                    >
                      Restore
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Restore Strong Warning Dialog */}
      <ConfirmDialog
        isOpen={Boolean(restoringBackup)}
        onClose={() => setRestoringBackup(null)}
        onConfirm={() => {
          if (restoringBackup) {
            const id = restoringBackup._id || restoringBackup.id || ''
            restoreMutation.mutate(id)
          }
        }}
        title="RESTORE BACKUP — CRITICAL WARNING"
        message="This will replace all current data with the selected snapshot. Any invoices, payments, or records added after this backup date will be overwritten. This cannot be undone."
        confirmText="Yes, Replace Current Data"
        variant="danger"
        loading={restoreMutation.isPending}
      />
    </div>
  )
}
