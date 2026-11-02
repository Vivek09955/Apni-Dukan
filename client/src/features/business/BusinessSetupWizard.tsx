import { useState, Fragment } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  FileText,
  MapPin,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Store,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { createBusiness } from '../../api/businesses'
import { useAuthStore } from '../../store/authStore'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
].map((s) => ({ value: s, label: s }))

const FY_MONTHS = [
  { value: '4', label: 'April (Standard Indian FY)' },
  { value: '1', label: 'January (Calendar Year)' },
  { value: '7', label: 'July' },
  { value: '10', label: 'October' },
]

const wizardSchema = z.object({
  // Step 1
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  state: z.string().min(1, 'Please select your state'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^[6-9]\d{9}$/.test(val), {
      message: 'Enter a valid 10-digit mobile number',
    }),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),

  // Step 2
  gstin: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
      {
        message: 'Enter a valid 15-character Indian GSTIN',
      }
    ),
  financialYearStart: z.string().default('4'),
  invoicePrefix: z.string().min(1, 'Invoice prefix is required').default('INV-'),

  // Step 3
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  pincode: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{6}$/.test(val), {
      message: 'Enter a valid 6-digit PIN code',
    }),

  // Settings
  enableGst: z.boolean().default(true),
  taxInclusive: z.boolean().default(false),
  enableDiscount: z.boolean().default(true),
  roundOffTotal: z.boolean().default(true),
  defaultTaxRate: z.number().default(18),
  thermalPrint: z.boolean().default(false),
  showLogo: z.boolean().default(true),
})

type WizardFormValues = z.infer<typeof wizardSchema>

export const BusinessSetupWizard = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { setCurrentBusiness, businesses, setBusinesses } = useAuthStore()

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      name: '',
      state: 'Maharashtra',
      phone: '',
      email: '',
      gstin: '',
      financialYearStart: '4',
      invoicePrefix: 'INV-',
      line1: '',
      line2: '',
      city: '',
      pincode: '',
      enableGst: true,
      taxInclusive: false,
      enableDiscount: true,
      roundOffTotal: true,
      defaultTaxRate: 18,
      thermalPrint: false,
      showLogo: true,
    },
  })

  const formValues = watch()

  const handleNext = async () => {
    let fieldsToValidate: (keyof WizardFormValues)[] = []
    if (currentStep === 1) {
      fieldsToValidate = ['name', 'state', 'phone', 'email']
    } else if (currentStep === 2) {
      fieldsToValidate = ['gstin', 'financialYearStart', 'invoicePrefix']
    }

    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 3))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      const payload = {
        name: data.name,
        state: data.state,
        phone: data.phone || undefined,
        email: data.email || undefined,
        gstin: data.gstin || undefined,
        financialYearStart: parseInt(data.financialYearStart, 10) || 4,
        invoicePrefix: data.invoicePrefix || 'INV-',
        currency: 'INR',
        address: {
          line1: data.line1,
          line2: data.line2,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
        },
        settings: {
          taxInclusive: data.taxInclusive,
          enableGst: data.enableGst,
          enableDiscount: data.enableDiscount,
          roundOffTotal: data.roundOffTotal,
          defaultTaxRate: data.defaultTaxRate,
          thermalPrint: data.thermalPrint,
          showLogo: data.showLogo,
        },
      }

      const response = await createBusiness(payload)

      if (response.success && response.data) {
        const createdBiz = response.data
        const updatedList = [...businesses, createdBiz]
        setBusinesses(updatedList)
        setCurrentBusiness(createdBiz)
        toast.success(`Business "${createdBiz.name}" created successfully!`)
        navigate('/dashboard')
      } else {
        toast.error(response.message || 'Failed to create business')
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to setup business'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { number: 1, title: 'Basic Details', icon: Building2 },
    { number: 2, title: 'Tax & Invoicing', icon: FileText },
    { number: 3, title: 'Address & Preferences', icon: MapPin },
  ]

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Step Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isCompleted = currentStep > step.number
            const isCurrent = currentStep === step.number

            return (
              <Fragment key={step.number}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all
                      ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md'
                          : 'bg-gray-100 text-gray-400'
                      }
                    `}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium text-center ${
                      isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mb-5 transition-colors ${
                      currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </Fragment>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Step 1: Basic Details */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Step 1: Business Identity</h3>
              <p className="text-xs text-gray-500">Provide the basic identifying details for your enterprise.</p>
            </div>

            <Input
              label="Business / Shop Name"
              placeholder="e.g. Radhe Traders & General Store"
              error={errors.name?.message}
              required
              {...register('name')}
            />

            <Select
              label="State / Place of Supply"
              options={INDIAN_STATES}
              error={errors.state?.message}
              required
              {...register('state')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Business Phone Number"
                type="tel"
                placeholder="9876543210"
                error={errors.phone?.message}
                {...register('phone')}
              />

              <Input
                label="Business Email"
                type="email"
                placeholder="contact@radhetraders.in"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
          </div>
        )}

        {/* Step 2: Tax & Invoicing */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Step 2: GST & Invoicing Setup</h3>
              <p className="text-xs text-gray-500">Configure tax compliance and document numbering.</p>
            </div>

            <Input
              label="GSTIN (Optional)"
              placeholder="27ABCDE1234F1Z5"
              helperText="Leave empty if your business is unregistered or composite"
              error={errors.gstin?.message}
              {...register('gstin')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Financial Year Start"
                options={FY_MONTHS}
                error={errors.financialYearStart?.message}
                {...register('financialYearStart')}
              />

              <Input
                label="Invoice Prefix"
                placeholder="INV-"
                helperText="E.g. INV-, BILL-, RT/2026/"
                error={errors.invoicePrefix?.message}
                required
                {...register('invoicePrefix')}
              />
            </div>
          </div>
        )}

        {/* Step 3: Address & Settings */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Step 3: Location & Configuration</h3>
              <p className="text-xs text-gray-500">Store address appears on your invoices and bills.</p>
            </div>

            <Input
              label="Address Line 1"
              placeholder="Shop No. 12, Market Yard"
              error={errors.line1?.message}
              {...register('line1')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="City / Town"
                placeholder="Pune"
                error={errors.city?.message}
                {...register('city')}
              />

              <Input
                label="PIN Code"
                placeholder="411037"
                error={errors.pincode?.message}
                {...register('pincode')}
              />
            </div>

            <div className="pt-3 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Invoice & Tax Preferences</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                    {...register('enableGst')}
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Enable GST Calculation</p>
                    <p className="text-[11px] text-gray-500">Compute CGST, SGST, IGST</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                    {...register('roundOffTotal')}
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Auto Round-off Total</p>
                    <p className="text-[11px] text-gray-500">Rounds to nearest Rupee</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                    {...register('enableDiscount')}
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Enable Item Discounts</p>
                    <p className="text-[11px] text-gray-500">Allow discounts per line item</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                    {...register('thermalPrint')}
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Thermal POS Printer</p>
                    <p className="text-[11px] text-gray-500">Compact 2-3 inch receipts</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Summary preview */}
            <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Store className="w-4 h-4 text-blue-600" />
                <span>Ready to create: {formValues.name || 'Your Business'}</span>
              </p>
              <p className="text-blue-700">
                Operating in {formValues.state} with invoice prefix &quot;{formValues.invoicePrefix}&quot;
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Next Step
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Create Business
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
