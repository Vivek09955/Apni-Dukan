import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { User, Shield, Key, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuthStore } from '../../store/authStore'
import { apiClient } from '../../api/client'

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export function UserProfilePage() {
  const { user, setUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: zodResolver(passwordSchema) as any,
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiClient.put('/auth/profile', data)
      return res.data
    },
    onSuccess: (response: any) => {
      toast.success('Profile updated successfully')
      if (response?.data?.user) {
        setUser(response.data.user)
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update profile')
    },
  })

  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const res = await apiClient.put('/auth/change-password', data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Password changed successfully')
      resetPasswordForm()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to change password')
    },
  })

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account details and security settings
        </p>
      </div>

      {/* User Info Card */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.name || 'User'}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '-'}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile Details
          </span>
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('security')}
        >
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </span>
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h3>
          <form onSubmit={handleProfileSubmit((data) => profileMutation.mutate(data))} className="space-y-4">
            <Input
              label="Full Name"
              {...registerProfile('name')}
              error={profileErrors.name?.message}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <Input
              label="Phone Number"
              {...registerProfile('phone')}
              error={profileErrors.phone?.message}
              placeholder="e.g., 9876543210"
            />
            <div className="pt-2">
              <Button
                type="submit"
                loading={profileMutation.isPending}
                icon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-600" />
            Change Password
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Use a strong password with at least 8 characters, including uppercase, lowercase, and numbers.
          </p>
          <form onSubmit={handlePasswordSubmit((data: any) => passwordMutation.mutate(data))} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              {...registerPassword('currentPassword')}
              error={(passwordErrors as any).currentPassword?.message}
            />
            <Input
              label="New Password"
              type="password"
              {...registerPassword('newPassword')}
              error={(passwordErrors as any).newPassword?.message}
            />
            <Input
              label="Confirm New Password"
              type="password"
              {...registerPassword('confirmPassword')}
              error={(passwordErrors as any).confirmPassword?.message}
            />
            <div className="pt-2">
              <Button
                type="submit"
                loading={passwordMutation.isPending}
                icon={<Save className="w-4 h-4" />}
              >
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}

export default UserProfilePage
