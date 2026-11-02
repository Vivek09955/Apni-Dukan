import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Lock,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FolderTree,
  Coins,
  Scale,
  DollarSign,
  TrendingUp,
  Receipt,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { getAccounts, createAccount } from '../../api/accounting'
import { formatCurrency, rupeesToPaise } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import type { Account } from '../../types'

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  code: z.string().min(1, 'Account code is required'),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  subType: z.string().optional(),
  parentAccount: z.string().optional(),
  description: z.string().optional(),
  openingBalance: z.coerce.number().default(0),
})

type AccountFormValues = z.infer<typeof accountSchema>

const ACCOUNT_TYPES: {
  key: Account['type']
  title: string
  icon: any
  color: string
}[] = [
  { key: 'asset', title: 'Assets (Resources Owned)', icon: Coins, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'liability', title: 'Liabilities (Obligations Owed)', icon: Scale, color: 'text-rose-600 bg-rose-50' },
  { key: 'equity', title: 'Equity (Owner Capital & Reserves)', icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
  { key: 'revenue', title: 'Revenue & Income', icon: TrendingUp, color: 'text-teal-600 bg-teal-50' },
  { key: 'expense', title: 'Expenses & Overheads', icon: Receipt, color: 'text-amber-600 bg-amber-50' },
]

export function ChartOfAccountsPage() {
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    asset: true,
    liability: true,
    equity: true,
    revenue: true,
    expense: true,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', currentBusiness?._id],
    queryFn: () => getAccounts({ limit: 500 }),
  })

  const accounts: Account[] = data?.data?.accounts || data?.data || []

  // Group accounts by type
  const groupedAccounts = useMemo(() => {
    const groups: Record<Account['type'], Account[]> = {
      asset: [],
      liability: [],
      equity: [],
      revenue: [],
      expense: [],
    }

    accounts.forEach((acc) => {
      if (groups[acc.type]) {
        groups[acc.type].push(acc)
      } else {
        groups.asset.push(acc)
      }
    })

    return groups
  }, [accounts])

  const toggleSection = (type: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }))
  }

  // React Hook Form for Add Account
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: {
      name: '',
      code: '',
      type: 'asset',
      subType: '',
      parentAccount: '',
      description: '',
      openingBalance: 0,
    },
  })

  const selectedType = watch('type')

  const createMutation = useMutation({
    mutationFn: async (values: AccountFormValues) => {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim(),
        type: values.type,
        subType: values.subType?.trim() || undefined,
        parentAccount: values.parentAccount?.trim() || undefined,
        description: values.description?.trim() || undefined,
        openingBalance: rupeesToPaise(values.openingBalance || 0),
      }
      return createAccount(payload)
    },
    onSuccess: () => {
      toast.success('Account created successfully')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] })
      setIsModalOpen(false)
      reset()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create account')
    },
  })

  const onSubmit = (values: AccountFormValues) => {
    createMutation.mutate(values)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Chart of Accounts</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Organize standard double-entry ledger accounts grouped across assets, liabilities, equity, income, and expenses
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          size="md"
          onClick={() => {
            reset()
            setIsModalOpen(true)
          }}
        >
          Add Account
        </Button>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ACCOUNT_TYPES.map((group) => {
          const count = groupedAccounts[group.key]?.length || 0
          return (
            <Card key={group.key} className="p-3">
              <span className="text-[11px] font-semibold text-gray-500 uppercase block">
                {group.key}
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl font-bold text-gray-900">{count}</span>
                <span className={`p-1.5 rounded-lg ${group.color}`}>
                  <group.icon className="w-4 h-4" />
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Account Groups Collapsible Sections */}
      <div className="space-y-4">
        {ACCOUNT_TYPES.map((group) => {
          const groupList = groupedAccounts[group.key] || []
          const isExpanded = Boolean(expandedSections[group.key])

          return (
            <div
              key={group.key}
              className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden"
            >
              {/* Section Header */}
              <button
                type="button"
                onClick={() => toggleSection(group.key)}
                className="w-full flex items-center justify-between p-4 bg-gray-50/70 hover:bg-gray-100/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${group.color}`}>
                    <group.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{group.title}</h3>
                    <p className="text-[11px] text-gray-500">
                      {groupList.length} registered {group.key} account{groupList.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400">
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Table Body */}
              {isExpanded && (
                <div className="overflow-x-auto border-t border-gray-200">
                  {isLoading ? (
                    <div className="p-6 text-center text-xs text-gray-400 animate-pulse">
                      Loading {group.key} accounts...
                    </div>
                  ) : groupList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400">
                      No {group.key} accounts configured yet. Click "Add Account" to create one.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/50 text-gray-500 font-semibold uppercase text-[11px] border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2.5 w-24">Code</th>
                          <th className="px-4 py-2.5">Account Name</th>
                          <th className="px-4 py-2.5">Sub-Type</th>
                          <th className="px-4 py-2.5 text-right">Balance</th>
                          <th className="px-4 py-2.5 text-center w-28">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {groupList.map((acc) => (
                          <tr key={acc._id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                              {acc.code}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-gray-900">{acc.name}</span>
                                {acc.isSystemAccount && (
                                  <span title="System Managed Account">
                                    <Lock className="w-3 h-3 text-amber-500 inline" />
                                  </span>
                                )}
                              </div>
                              {acc.description && (
                                <span className="text-[11px] text-gray-400 block mt-0.5">
                                  {acc.description}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {acc.subType || (
                                <span className="text-gray-400 italic">General</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {formatCurrency(acc.currentBalance ?? acc.openingBalance ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {acc.isSystemAccount ? (
                                <Badge variant="warning">System</Badge>
                              ) : (
                                <Badge variant="default">Custom</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Account Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Ledger Account" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Account Name"
                required
                placeholder="e.g. HDFC Current A/c, Shop Rent, Office Furniture"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <Input
              label="Account Code"
              required
              placeholder="e.g. 1010, 2020, 5010"
              error={errors.code?.message}
              {...register('code')}
            />

            <Select
              label="Account Classification"
              required
              options={[
                { value: 'asset', label: 'Asset (Resource Owned)' },
                { value: 'liability', label: 'Liability (Obligation Owed)' },
                { value: 'equity', label: 'Equity (Owner Capital / Reserves)' },
                { value: 'revenue', label: 'Revenue (Income)' },
                { value: 'expense', label: 'Expense (Operating Overhead)' },
              ]}
              error={errors.type?.message}
              {...register('type')}
            />

            <Input
              label="Sub-Type / Sub-Group"
              placeholder={
                selectedType === 'asset'
                  ? 'Current Asset, Bank, Cash, Fixed Asset'
                  : selectedType === 'liability'
                  ? 'Current Liability, Duties & Taxes, Sundry Creditors'
                  : selectedType === 'expense'
                  ? 'Direct Expense, Indirect Expense'
                  : 'Operating Revenue, Other Income'
              }
              error={errors.subType?.message}
              {...register('subType')}
            />

            <Input
              label="Opening Balance (₹)"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.openingBalance?.message}
              {...register('openingBalance')}
            />

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description / Purpose (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Details about what transactions are booked under this account..."
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('description')}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
