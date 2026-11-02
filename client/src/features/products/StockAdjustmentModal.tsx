import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { adjustStock } from '../../api/products'
import type { Product } from '../../types'

export interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

export function StockAdjustmentModal({ isOpen, onClose, product }: StockAdjustmentModalProps) {
  const queryClient = useQueryClient()
  const [type, setType] = useState<'add' | 'remove'>('add')
  const [quantity, setQuantity] = useState<string>('')
  const [reason, setReason] = useState<string>('')

  const mutation = useMutation({
    mutationFn: async () => {
      if (!product?._id) return
      const qty = parseFloat(quantity)
      if (isNaN(qty) || qty <= 0) {
        throw new Error('Please enter a valid quantity greater than zero')
      }
      return adjustStock(product._id, {
        type,
        quantity: qty,
        reason: reason.trim(),
      })
    },
    onSuccess: () => {
      toast.success('Stock adjusted successfully')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setQuantity('')
      setReason('')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to adjust stock')
    },
  })

  if (!product) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }
    mutation.mutate()
  }

  const current = product.currentStock ?? product.openingStock ?? 0
  const qtyNumber = parseFloat(quantity) || 0
  const previewStock = type === 'add' ? current + qtyNumber : Math.max(0, current - qtyNumber)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjust Stock: ${product.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200/80 flex justify-between items-center text-sm">
          <span className="text-gray-600">Current Stock:</span>
          <span className="font-semibold text-gray-900">
            {current} {product.unit}
          </span>
        </div>

        {/* Adjustment Type Radio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Adjustment Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('add')}
              className={`py-2 px-3 text-sm font-medium rounded-lg border text-center transition-colors ${
                type === 'add'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              + Add Stock (Inflow)
            </button>
            <button
              type="button"
              onClick={() => setType('remove')}
              className={`py-2 px-3 text-sm font-medium rounded-lg border text-center transition-colors ${
                type === 'remove'
                  ? 'bg-red-50 border-red-500 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              - Reduce Stock (Outflow/Damaged)
            </button>
          </div>
        </div>

        {/* Quantity */}
        <Input
          label="Quantity"
          type="number"
          step="any"
          required
          min="0.01"
          placeholder="e.g. 10"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        {/* Reason / Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Reason / Notes
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Physical count adjustment, damaged items, returned from sample..."
            className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Stock Result Preview */}
        {qtyNumber > 0 && (
          <div className="text-xs text-gray-500 flex justify-between bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
            <span>Stock after adjustment:</span>
            <span className="font-semibold text-blue-800">
              {previewStock} {product.unit}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Confirm Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  )
}
