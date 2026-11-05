import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Receipt,
  Percent,
  Printer,
  Save,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { getBusiness, updateBusiness } from '../../api/businesses'
import { useAuthStore } from '../../store/authStore'
import type { Business } from '../../types'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'
]

const businessSettingsSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  gstin: z.string().max(15, 'GSTIN cannot exceed 15 chars').optional().or(z.literal('')),
  state: z.string().min(1, 'State is required'),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }).optional(),
  invoicePrefix: z.string().min(1, 'Invoice prefix is required').max(10),
  settings: z.object({
    enableGst: z.boolean().default(true),
    defaultTaxRate: z.number().min(0).max(100).default(18),
    taxInclusive: z.boolean().default(false),
    roundOffTotal: z.boolean().default(true),
    thermalPrint: z.boolean().default(false),
    showLogo: z.boolean().default(true),
    enableDiscount: z.boolean().default(true),
  }),
})

type BusinessSettingsFormData = z.infer<typeof businessSettingsSchema>

export function BusinessSettingsPage() {
  const queryClient = useQueryClient()
  const { currentBusiness, setCurrentBusiness } = useAuthStore()

  // Fetch fresh business profile
  const { data: businessData, isLoading } = useQuery({
    queryKey: ['business', currentBusiness?._id],
    queryFn: () => getBusiness(currentBusiness!._id),
    enabled: Boolean(currentBusiness?._id),
  })

  const business: Business | null = (businessData?.data as any)?.business || businessData?.data || currentBusiness

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BusinessSettingsFormData>({
    resolver: zodResolver(businessSettingsSchema) as any,
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      gstin: '',
      state: 'Delhi',
      invoicePrefix: 'INV-',
      address: {
        line1: '',
        line2: '',
        city: '',
        state: 'Delhi',
        pincode: '',
      },
      settings: {
        enableGst: true,
        defaultTaxRate: 18,
        taxInclusive: false,
        roundOffTotal: true,
        thermalPrint: false,
        showLogo: true,
        enableDiscount: true,
      },
    },
  })

  // Sync form values with fetched business data
  useEffect(() => {
    if (business) {
      reset({
        name: business.name || '',
        phone: business.phone || '',
        email: business.email || '',
        gstin: business.gstin || '',
        state: business.state || 'Delhi',
        invoicePrefix: business.invoicePrefix || 'INV-',
        address: {
          line1: business.address?.line1 || '',
          line2: business.address?.line2 || '',
          city: business.address?.city || '',
          state: business.address?.state || business.state || 'Delhi',
          pincode: business.address?.pincode || '',
        },
        settings: {
          enableGst: business.settings?.enableGst ?? true,
          defaultTaxRate: business.settings?.defaultTaxRate ?? 18,
          taxInclusive: business.settings?.taxInclusive ?? false,
          roundOffTotal: business.settings?.roundOffTotal ?? true,
          thermalPrint: business.settings?.thermalPrint ?? false,
          showLogo: business.settings?.showLogo ?? true,
          enableDiscount: business.settings?.enableDiscount ?? true,
        },
      })
    }
  }, [business, reset])

  const updateMutation = useMutation({
    mutationFn: (data: BusinessSettingsFormData) => {
      if (!currentBusiness?._id) throw new Error('No business selected')
      return updateBusiness(currentBusiness._id, data)
    },
    onSuccess: (res) => {
      toast.success('Business settings updated successfully!')
      const updated = (res?.data as any)?.business || res?.data
      if (updated) {
        setCurrentBusiness(updated)
      }
      queryClient.invalidateQueries({ queryKey: ['business', currentBusiness?._id] })
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
    onError: (err: any) => {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors && Array.isArray(serverErrors)) {
        const messages = serverErrors.map((e: any) => `${e.field}: ${e.message}`).join('\n');
        toast.error(messages || 'Failed to update business settings');
      } else {
        toast.error(err?.response?.data?.message || 'Failed to update business settings');
      }
    },
  })

  const onSubmit = (data: BusinessSettingsFormData) => {
    updateMutation.mutate(data)
  }

  if (isLoading && !business) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Loading business settings...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as BusinessSettingsFormData))} className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Business Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure company information, invoicing parameters, tax settings, and hardware options.
          </p>
        </div>

        <Button
          type="submit"
          disabled={updateMutation.isPending}
          icon={<Save className="w-4 h-4" />}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Profile */}
        <Card className="p-6 bg-white border border-gray-200 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">Company Information</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              className={`block w-full rounded-lg border text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                errors.name ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                placeholder="22AAAAA0000A1Z5"
                {...register('gstin')}
                className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                State <span className="text-red-500">*</span>
              </label>
              <select
                {...register('state')}
                className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contact Phone
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                {...register('phone')}
                className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="info@business.com"
                {...register('email')}
                className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Address Line 1
            </label>
            <input
              type="text"
              placeholder="Shop No., Street Name"
              {...register('address.line1')}
              className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                City
              </label>
              <input
                type="text"
                placeholder="City"
                {...register('address.city')}
                className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                PIN Code
              </label>
              <input
                type="text"
                placeholder="110001"
                {...register('address.pincode')}
                className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </Card>

        {/* Invoicing & Tax Parameters */}
        <div className="space-y-6">
          {/* Invoicing Settings */}
          <Card className="p-6 bg-white border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Receipt className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-gray-900">Invoice Settings</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Default Invoice Prefix <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="INV-"
                {...register('invoicePrefix')}
                className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Invoices will be auto-sequenced as {business?.invoicePrefix || 'INV-'}0001, {business?.invoicePrefix || 'INV-'}0002, etc.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
              <div>
                <span className="text-sm font-medium text-gray-800 block">Show Company Logo</span>
                <span className="text-xs text-gray-500">Print business branding on tax invoice headers</span>
              </div>
              <input
                type="checkbox"
                {...register('settings.showLogo')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
              <div>
                <span className="text-sm font-medium text-gray-800 block">Enable Item Discounts</span>
                <span className="text-xs text-gray-500">Allow discount columns on invoices & quotations</span>
              </div>
              <input
                type="checkbox"
                {...register('settings.enableDiscount')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </Card>

          {/* Tax & GST Settings */}
          <Card className="p-6 bg-white border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Percent className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-gray-900">GST & Tax Calculation</h2>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
              <div>
                <span className="text-sm font-medium text-gray-800 block">Enable GST Calculation</span>
                <span className="text-xs text-gray-500">Calculate CGST/SGST/IGST breakdown across all sales</span>
              </div>
              <input
                type="checkbox"
                {...register('settings.enableGst')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Default Tax Rate (%)
                </label>
                <select
                  {...register('settings.defaultTaxRate', { valueAsNumber: true })}
                  className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="0">0% (Nil / Exempt)</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18% (Standard)</option>
                  <option value="28">28%</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tax Pricing Type
                </label>
                <select
                  {...register('settings.taxInclusive', {
                    setValueAs: (v) => v === 'true' || v === true,
                  })}
                  className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="false">Tax Exclusive (Added on top)</option>
                  <option value="true">Tax Inclusive (Included in price)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
              <div>
                <span className="text-sm font-medium text-gray-800 block">Round Off Invoice Total</span>
                <span className="text-xs text-gray-500">Automatically round final amount to nearest rupee</span>
              </div>
              <input
                type="checkbox"
                {...register('settings.roundOffTotal')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </Card>

          {/* Hardware & Printing */}
          <Card className="p-6 bg-white border border-gray-200 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Printer className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-gray-900">Printing & POS Hardware</h2>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
              <div>
                <span className="text-sm font-medium text-gray-800 block">Thermal POS Slip Mode</span>
                <span className="text-xs text-gray-500">
                  Format print layouts for 80mm / 58mm POS thermal receipt printers
                </span>
              </div>
              <input
                type="checkbox"
                {...register('settings.thermalPrint')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </Card>
        </div>
      </div>
    </form>
  )
}
