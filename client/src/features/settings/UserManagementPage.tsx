import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Users,
  UserPlus,
  ShieldCheck,
  Trash2,
  Edit2,
  Mail,
  CheckCircle,
  AlertCircle,
  Key,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import {
  getBusinessMembers,
  addBusinessMember,
  updateBusinessMember,
  removeBusinessMember,
} from '../../api/businesses'
import { useAuthStore } from '../../store/authStore'
import type { BusinessMember } from '../../types'

const inviteMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'accountant', 'manager', 'staff']),
})

type InviteMemberFormData = z.infer<typeof inviteMemberSchema>

const ROLE_PERMISSIONS: Record<string, { description: string; permissions: string[] }> = {
  owner: {
    description: 'Full business control and ownership. Can manage billing and delete the account.',
    permissions: ['All permissions', 'Business Settings', 'Staff Management', 'Financial Auditing'],
  },
  admin: {
    description: 'Full administrative access except transferring business ownership.',
    permissions: ['Sales & Purchases', 'Customer & Suppliers', 'Accounting & Reports', 'Staff Management'],
  },
  accountant: {
    description: 'Access to financial records, journals, ledgers, tax filing, and payment recording.',
    permissions: ['Accounting & Journals', 'Tax Reports', 'Invoices & Bills', 'Payments In/Out'],
  },
  manager: {
    description: 'Manages sales operations, procurement, stock, and inventory movement.',
    permissions: ['Sales & Purchases', 'Quotations & Orders', 'Products & Stock', 'Customer Management'],
  },
  staff: {
    description: 'Cashier and basic POS entry. Can create sales invoices and register payments.',
    permissions: ['POS Billing', 'New Customer Entry', 'View Stock Levels'],
  },
}

export function UserManagementPage() {
  const queryClient = useQueryClient()
  const { currentBusiness, user: currentUser } = useAuthStore()

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<BusinessMember | null>(null)
  const [deletingMember, setDeletingMember] = useState<BusinessMember | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['businessMembers', currentBusiness?._id],
    queryFn: () => getBusinessMembers(currentBusiness!._id),
    enabled: Boolean(currentBusiness?._id),
  })

  const rawMembers = data?.data || []
  const members: BusinessMember[] = Array.isArray(rawMembers) ? rawMembers : []

  // React Hook Form for invite
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      role: 'staff',
    },
  })

  // Add Member Mutation
  const addMutation = useMutation({
    mutationFn: (data: InviteMemberFormData) =>
      addBusinessMember(currentBusiness!._id, data),
    onSuccess: () => {
      toast.success('Invitation sent to member!')
      queryClient.invalidateQueries({ queryKey: ['businessMembers', currentBusiness?._id] })
      setIsInviteModalOpen(false)
      reset()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to invite member')
    },
  })

  // Update Member Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      updateBusinessMember(currentBusiness!._id, memberId, { role }),
    onSuccess: () => {
      toast.success('Member role updated!')
      queryClient.invalidateQueries({ queryKey: ['businessMembers', currentBusiness?._id] })
      setEditingMember(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update member role')
    },
  })

  // Remove Member Mutation
  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      removeBusinessMember(currentBusiness!._id, memberId),
    onSuccess: () => {
      toast.success('Member removed from business')
      queryClient.invalidateQueries({ queryKey: ['businessMembers', currentBusiness?._id] })
      setDeletingMember(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to remove member')
    },
  })

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'danger'
      case 'admin':
        return 'warning'
      case 'accountant':
        return 'info'
      case 'manager':
        return 'success'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Staff & Team Access</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage who has access to your business and define role-based access controls.
          </p>
        </div>

        <Button
          onClick={() => setIsInviteModalOpen(true)}
          icon={<UserPlus className="w-4 h-4" />}
        >
          Invite Member
        </Button>
      </div>

      {/* Role Definitions Accordion / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.entries(ROLE_PERMISSIONS).map(([role, info]) => (
          <Card key={role} className="p-3.5 bg-white border border-gray-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="capitalize font-bold text-xs text-gray-900">{role}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">{info.description}</p>
          </Card>
        ))}
      </div>

      {/* Members List */}
      <Card className="bg-white border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            Current Members ({members.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Loading team members...
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No team members found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((member) => {
              const memberUser = member.userId || {}
              const isOwner = member.role === 'owner'

              return (
                <div
                  key={member._id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                      {memberUser.name ? memberUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">
                          {memberUser.name || 'Invited User'}
                        </p>
                        <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize text-[10px]">
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {memberUser.email || 'No email'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!isOwner ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingMember(member)}
                          title="Change Role"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingMember(member)}
                          title="Remove Member"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-50 rounded">
                        Business Owner
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <Modal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          title="Invite New Team Member"
        >
          <form
            onSubmit={handleSubmit((data) => addMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="colleague@example.com"
                {...register('email')}
                className={`block w-full rounded-lg border text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  errors.email ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Assigned Role <span className="text-red-500">*</span>
              </label>
              <select
                {...register('role')}
                className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              >
                <option value="admin">Admin - Full operational control</option>
                <option value="accountant">Accountant - Financials & Tax returns</option>
                <option value="manager">Manager - Sales, Orders & Inventory</option>
                <option value="staff">Staff - Cashier & Billing only</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Role Modal */}
      {editingMember && (
        <Modal
          isOpen={Boolean(editingMember)}
          onClose={() => setEditingMember(null)}
          title={`Edit Role for ${editingMember.userId?.name || 'Member'}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select New Role
              </label>
              <select
                defaultValue={editingMember.role}
                id="change-role-select"
                className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              >
                <option value="admin">Admin</option>
                <option value="accountant">Accountant</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => setEditingMember(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={updateRoleMutation.isPending}
                onClick={() => {
                  const selectEl = document.getElementById(
                    'change-role-select'
                  ) as HTMLSelectElement
                  if (selectEl) {
                    updateRoleMutation.mutate({
                      memberId: editingMember._id,
                      role: selectEl.value,
                    })
                  }
                }}
              >
                Update Role
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingMember)}
        onClose={() => setDeletingMember(null)}
        onConfirm={() => {
          if (deletingMember) {
            removeMutation.mutate(deletingMember._id)
          }
        }}
        title="Remove Team Member?"
        message={`Are you sure you want to remove ${
          deletingMember?.userId?.name || 'this member'
        } from accessing ${currentBusiness?.name}? They will lose all permissions.`}
        confirmText="Remove Access"
        variant="danger"
        loading={removeMutation.isPending}
      />
    </div>
  )
}
