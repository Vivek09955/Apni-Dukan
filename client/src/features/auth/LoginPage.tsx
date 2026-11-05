import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { loginUser } from '../../api/auth'
import { getBusinesses } from '../../api/businesses'
import { useAuthStore } from '../../store/authStore'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth, setBusinesses, setCurrentBusiness } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      const response = await loginUser({
        email: data.email,
        password: data.password,
      })

      if (response.success && response.data) {
        const { user, accessToken } = response.data
        setAuth(user, accessToken)

        // Try to fetch businesses for this user
        try {
          const bizResponse = await getBusinesses()
          const bizData = bizResponse?.data as any
          // Server returns { businesses: [{ business: {...}, role, permissions }] }
          const membershipList = bizData?.businesses || bizData || []
          const businessList: any[] = Array.isArray(membershipList)
            ? membershipList.map((m: any) => m.business || m)
            : []

          if (businessList.length > 0) {
            setBusinesses(businessList)
            setCurrentBusiness(businessList[0])
            toast.success(`Welcome back, ${user.name}!`)
            navigate('/dashboard')
            return
          }
        } catch {
          // If no businesses or businesses API not yet seeded
        }

        toast.success(`Welcome back, ${user.name}! Let's set up your business.`)
        navigate('/setup')
      } else {
        toast.error(response.message || 'Login failed. Please check your credentials.')
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Login failed'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in to your account</h2>
        <p className="text-xs text-gray-500 mt-1">Manage your shop, inventory, billing, and accounting</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email address"
          type="email"
          placeholder="name@business.com"
          autoComplete="email"
          icon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          icon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
              {...register('rememberMe')}
            />
            <span className="text-gray-600">Remember me</span>
          </label>

          <Link
            to="/forgot-password"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isLoading}
          icon={<LogIn className="w-4 h-4" />}
        >
          Sign In
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-600">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
          >
            Register new business
          </Link>
        </p>
      </div>
    </div>
  )
}
