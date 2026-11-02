import { useNavigate } from 'react-router-dom'
import { IndianRupee, ArrowDownLeft, Plus } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'

export function OtherIncomePage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Other Indirect Income</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Record interest received, rental income, discount received, and non-operational revenue
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          size="md"
          onClick={() => navigate('/accounting')}
        >
          Record via Journal
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>INDIRECT INCOME (MTD)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">₹0.00</div>
          <span className="text-[11px] text-gray-400">Current month non-operating revenue</span>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <EmptyState
          icon={<IndianRupee className="w-10 h-10 text-gray-400" />}
          title="Other Income Module"
          description="Other indirect income receipts can currently be booked directly via double-entry Journal Entries under Accounting."
          action={{
            label: 'Open Journal Entries',
            onClick: () => navigate('/accounting'),
          }}
        />
      </div>
    </div>
  )
}
