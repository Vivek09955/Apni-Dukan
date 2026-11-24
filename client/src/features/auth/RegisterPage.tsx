import React, { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Phone, UserPlus, KeyRound, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { registerUser, verifyRegistrationOTP, resendRegistrationOTP } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || /^[6-9]\d{9}$/.test(val), {
        message: 'Enter a valid 10-digit Indian mobile number',
      }),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>
type Step = 'form' | 'otp'

export const RegisterPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // --- Step 1: Register & send OTP ---
  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    try {
      const response = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
      })

      if (response.success) {
        setUserEmail(data.email)
        setUserName(data.name)
        setStep('otp')
        setResendCooldown(60)
        toast.success('Verification OTP sent to your email!')
      } else {
        toast.error(response.message || 'Registration failed')
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Registration failed'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // --- OTP input handling ---
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    setOtpError('')
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pasted)) {
      setOtp(pasted.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  // --- Step 2: Verify OTP ---
  const onVerifyOTP = async () => {
    const otpValue = otp.join('')
    if (otpValue.length !== 6) {
      setOtpError('Please enter all 6 digits')
      return
    }

    setIsLoading(true)
    try {
      const response = await verifyRegistrationOTP(userEmail, otpValue)

      if (response.success && response.data) {
        const { user, accessToken } = response.data
        setAuth(user, accessToken)
        toast.success('Email verified! Welcome to Apni Dukan 🎉')
        navigate('/setup')
      } else {
        toast.error(response.message || 'Verification failed')
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Invalid OTP'
      setOtpError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // --- Resend OTP ---
  const onResendOTP = async () => {
    if (resendCooldown > 0) return
    setIsLoading(true)
    try {
      await resendRegistrationOTP(userEmail)
      setOtp(['', '', '', '', '', ''])
      setOtpError('')
      setResendCooldown(60)
      toast.success('New OTP sent!')
      inputRefs.current[0]?.focus()
    } catch {
      toast.error('Failed to resend OTP')
    } finally {
      setIsLoading(false)
    }
  }

  // ========== RENDER ==========
  return (
    <div className="space-y-6">
      {/* ---- STEP INDICATOR ---- */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {(['form', 'otp'] as const).map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : ['form', 'otp'].indexOf(step) > i
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {['form', 'otp'].indexOf(step) > i ? '✓' : i + 1}
            </div>
            {i < 1 && (
              <div
                className={`h-0.5 w-10 transition-colors ${
                  ['form', 'otp'].indexOf(step) > i ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ---- STEP 1: REGISTRATION FORM ---- */}
      {step === 'form' && (
        <>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create your account</h2>
            <p className="text-xs text-gray-500 mt-1">Start modernizing your store operations in 2 minutes</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Full Name"
              type="text"
              placeholder="Ramesh Kumar"
              icon={<User className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email address"
              type="email"
              placeholder="ramesh@dukan.com"
              autoComplete="email"
              icon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Phone Number (Optional)"
              type="tel"
              placeholder="9876543210"
              icon={<Phone className="w-4 h-4" />}
              helperText="10-digit mobile number for SMS/WhatsApp receipts"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              icon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              icon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isLoading}
              icon={<UserPlus className="w-4 h-4" />}
            >
              Create Account
            </Button>
          </form>

          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </>
      )}

      {/* ---- STEP 2: OTP VERIFICATION ---- */}
      {step === 'otp' && (
        <>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Verify Your Email</h2>
            <p className="text-xs text-gray-500 mt-1">
              Hi <span className="font-semibold text-gray-800">{userName}</span>, we&apos;ve sent a 6-digit OTP to{' '}
              <span className="font-semibold text-gray-900">{userEmail}</span>
            </p>
          </div>

          <div className="space-y-4">
            {/* OTP Input Boxes */}
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                    ${otpError ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}
                  `}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {otpError && (
              <p className="text-center text-sm text-red-500 font-medium">{otpError}</p>
            )}

            <Button
              type="button"
              variant="primary"
              fullWidth
              loading={isLoading}
              onClick={onVerifyOTP}
            >
              Verify & Continue
            </Button>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Didn&apos;t receive the OTP?{' '}
                {resendCooldown > 0 ? (
                  <span className="text-gray-400">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={onResendOTP}
                    className="text-blue-600 hover:text-blue-500 font-semibold transition-colors"
                    disabled={isLoading}
                  >
                    Resend OTP
                  </button>
                )}
              </p>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { setStep('form'); setOtp(['', '', '', '', '', '']); setOtpError('') }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to registration</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
