import React, { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { forgotPassword, verifyResetOTP, resetPassword } from '../../api/auth'

// --- Schemas ---
const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
})

const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type EmailFormValues = z.infer<typeof emailSchema>
type PasswordFormValues = z.infer<typeof newPasswordSchema>

type Step = 'email' | 'otp' | 'password' | 'success'

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // --- Email form ---
  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  // --- Password form ---
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // --- Step 1: Send OTP ---
  const onEmailSubmit = async (data: EmailFormValues) => {
    setIsLoading(true)
    try {
      await forgotPassword(data.email)
      setUserEmail(data.email)
      setStep('otp')
      setResendCooldown(60)
      toast.success('OTP sent to your email!')
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to send OTP'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // --- OTP input handling ---
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // digits only

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // take last digit
    setOtp(newOtp)
    setOtpError('')

    // Auto-focus next input
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
      const digits = pasted.split('')
      setOtp(digits)
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
      const response = await verifyResetOTP(userEmail, otpValue)
      setResetToken(response.data?.resetToken || '')
      setStep('password')
      toast.success('OTP verified!')
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
      await forgotPassword(userEmail)
      setOtp(['', '', '', '', '', ''])
      setOtpError('')
      setResendCooldown(60)
      toast.success('New OTP sent!')
      inputRefs.current[0]?.focus()
    } catch (err: any) {
      toast.error('Failed to resend OTP')
    } finally {
      setIsLoading(false)
    }
  }

  // --- Step 3: Reset Password ---
  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsLoading(true)
    try {
      await resetPassword(resetToken, data.password)
      setStep('success')
      toast.success('Password reset successfully!')
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to reset password'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // ========== RENDER ==========
  return (
    <div className="space-y-6">
      {/* ---- STEP INDICATOR ---- */}
      {step !== 'success' && (
        <div className="flex items-center justify-center gap-2 mb-2">
          {(['email', 'otp', 'password'] as const).map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? 'bg-blue-600 text-white'
                    : ['email', 'otp', 'password'].indexOf(step) > i
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {['email', 'otp', 'password'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`h-0.5 w-8 transition-colors ${
                    ['email', 'otp', 'password'].indexOf(step) > i ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ---- STEP 1: EMAIL ---- */}
      {step === 'email' && (
        <>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Forgot password?</h2>
            <p className="text-xs text-gray-500 mt-1">
              Enter your registered email and we&apos;ll send you a 6-digit OTP to reset your password.
            </p>
          </div>

          <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              placeholder="name@business.com"
              autoComplete="email"
              icon={<Mail className="w-4 h-4" />}
              error={emailErrors.email?.message}
              {...registerEmail('email')}
            />

            <Button type="submit" variant="primary" fullWidth loading={isLoading}>
              Send OTP
            </Button>
          </form>

          <div className="text-center pt-2 border-t border-gray-100">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </>
      )}

      {/* ---- STEP 2: OTP ---- */}
      {step === 'otp' && (
        <>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Enter OTP</h2>
            <p className="text-xs text-gray-500 mt-1">
              We&apos;ve sent a 6-digit OTP to{' '}
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
              Verify OTP
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
              onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setOtpError('') }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change email</span>
            </button>
          </div>
        </>
      )}

      {/* ---- STEP 3: NEW PASSWORD ---- */}
      {step === 'password' && (
        <>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Set New Password</h2>
            <p className="text-xs text-gray-500 mt-1">
              Create a strong password for your account.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4" noValidate>
            <Input
              label="New Password"
              type="password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              icon={<Lock className="w-4 h-4" />}
              error={passwordErrors.password?.message}
              {...registerPassword('password')}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              icon={<Lock className="w-4 h-4" />}
              error={passwordErrors.confirmPassword?.message}
              {...registerPassword('confirmPassword')}
            />

            <Button type="submit" variant="primary" fullWidth loading={isLoading}>
              Reset Password
            </Button>
          </form>
        </>
      )}

      {/* ---- STEP 4: SUCCESS ---- */}
      {step === 'success' && (
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Password Reset!</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <div className="pt-4">
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
