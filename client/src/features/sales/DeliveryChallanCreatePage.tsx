import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Building,
  Calendar,
  Truck,
  Save,
  UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CustomerFormModal } from '../customers/CustomerFormModal'
import { getCustomers } from '../../api/customers'
import { getProducts } from '../../api/products'
import { createDeliveryChallan } from '../../api/deliveryChallans'
import { useAuthStore } from '../../store/authStore'
import type { Customer, Product } from '../../types'

const challanItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().min(0.01, 'Quantity must be > 0'),
  unit: z.string().min(1, 'Unit is required'),
})

const deliveryChallanFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  challanDate: z.string().min(1, 'Challan date is required'),
  vehicleNumber: z.string().optional(),
  transporterName: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(challanItemSchema).min(1, 'At least one item is required'),
})

type DeliveryChallanFormData = z.infer<typeof deliveryChallanFormSchema>

export function DeliveryChallanCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBusiness } = useAuthStore()

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(deliveryChallanFormSchema) as any,
    defaultValues: {
      customerId: '',
      challanDate: new Date().toISOString().split('T')[0],
      vehicleNumber: '',
      transporterName: '',
      notes: '',
      items: [
        {
          productId: '',
          name: '',
          quantity: 1,
          unit: 'PCS',
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedCustomerId = watch('customerId')

  // Fetch Customers
  const { data: customersData } = useQuery({
    queryKey: ['customers', currentBusiness?._id],
    queryFn: () => getCustomers({ limit: 200 }),
  })
  const customers: Customer[] = customersData?.data?.customers || customersData?.data || []

  // Fetch Products
  const { data: productsData } = useQuery({
    queryKey: ['products', currentBusiness?._id],
    queryFn: () => getProducts({ limit: 300 }),
  })
  const products: Product[] = productsData?.data?.products || productsData?.data || []

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p._id === prodId)
    if (prod) {
      setValue(`items.${index}.productId`, prod._id)
      setValue(`items.${index}.name`, prod.name)
      setValue(`items.${index}.unit`, prod.unit || 'PCS')
    }
  }

  const createMutation = useMutation({
    mutationFn: (payload: any) => createDeliveryChallan(payload),
    onSuccess: () => {
      toast.success('Delivery challan created successfully!')
      queryClient.invalidateQueries({ queryKey: ['deliveryChallans'] })
      navigate('/sales/challans')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create delivery challan')
    },
  })

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      status: 'dispatched',
    }
    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/sales/challans">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Delivery Challan</h1>
            <p className="text-sm text-gray-500">
              Generate a delivery slip with dispatch and transport details.
            </p>
          </div>
        </div>

        <Button
          type="button"
          disabled={createMutation.isPending}
          onClick={handleSubmit(onSubmit)}
          icon={<Save className="w-4 h-4" />}
        >
          Save & Dispatch
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Customer / Consignee
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCustomerModalOpen(true)}
                icon={<UserPlus className="w-4 h-4" />}
              >
                New Customer
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={watchedCustomerId}
                onChange={(e) => setValue('customerId', e.target.value)}
                className={`block w-full rounded-lg border text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  errors.customerId ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
              >
                <option value="">-- Choose Consignee / Customer --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <p className="mt-1 text-xs text-red-600">{errors.customerId.message}</p>
              )}
            </div>
          </Card>

          {/* Items Table (no pricing needed!) */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Dispatched Items</h2>
                <p className="text-xs text-gray-500">
                  Select goods and quantities to accompany transport.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    productId: '',
                    name: '',
                    quantity: 1,
                    unit: 'PCS',
                  })
                }
                icon={<Plus className="w-4 h-4" />}
              >
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center gap-3"
                >
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Product
                    </label>
                    <select
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-2 bg-white text-gray-900"
                    >
                      <option value="">-- Choose Product or Type Name --</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Item Description"
                      {...register(`items.${index}.name` as const)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-1.5 bg-white text-gray-900"
                    />
                  </div>

                  <div className="w-full sm:w-32">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      {...register(`items.${index}.quantity` as const, {
                        valueAsNumber: true,
                      })}
                      className="block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-2 bg-white text-gray-900"
                    />
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PCS, BOX"
                      {...register(`items.${index}.unit` as const)}
                      className="block w-full rounded-lg border border-gray-300 text-xs px-2.5 py-2 bg-white text-gray-900"
                    />
                  </div>

                  {fields.length > 1 && (
                    <div className="pt-5">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6 bg-white border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Remarks / Dispatch Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Goods sent for job work, warranty replacement, or exhibition..."
              {...register('notes')}
              className="block w-full rounded-lg border border-gray-300 text-sm p-3 focus:outline-none focus:border-blue-500"
            />
          </Card>
        </div>

        {/* Right Col: Dates & Transportation */}
        <div className="space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Challan Date
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('challanDate')}
                className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none"
              />
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              Transportation
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. DL-01-AB-1234"
                  {...register('vehicleNumber')}
                  className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Transporter Name / Courier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blue Dart / DTDC / Self"
                  {...register('transporterName')}
                  className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2.5 bg-white text-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <Button
                type="button"
                fullWidth
                disabled={createMutation.isPending}
                onClick={handleSubmit(onSubmit)}
                icon={<Save className="w-4 h-4" />}
              >
                Save & Dispatch
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {isCustomerModalOpen && (
        <CustomerFormModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSuccessCallback={(newCust: Customer) => {
            setIsCustomerModalOpen(false)
            if (newCust?._id) {
              setValue('customerId', newCust._id)
            }
          }}
        />
      )}
    </div>
  )
}
