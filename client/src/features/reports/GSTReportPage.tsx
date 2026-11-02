import { useState } from 'react'
import {
  FileText,
  Layers,
  Percent,
  Calendar,
  AlertTriangle,
  Receipt,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { useAuthStore } from '../../store/authStore'
import { GSTR1ReportTab } from './GSTR1ReportTab'
import { GSTR3BTab } from './GSTR3BTab'
import { HSNSummaryTab } from './HSNSummaryTab'
import { TaxRateSummaryTab } from './TaxRateSummaryTab'

type GSTTab = 'gstr1' | 'gstr3b' | 'hsn' | 'rate'

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export function GSTReportPage() {
  const { currentBusiness } = useAuthStore()

  const currentDate = new Date()
  const [activeTab, setActiveTab] = useState<GSTTab>('gstr1')
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())

  const years = [
    { value: currentDate.getFullYear() - 2, label: String(currentDate.getFullYear() - 2) },
    { value: currentDate.getFullYear() - 1, label: String(currentDate.getFullYear() - 1) },
    { value: currentDate.getFullYear(), label: String(currentDate.getFullYear()) },
    { value: currentDate.getFullYear() + 1, label: String(currentDate.getFullYear() + 1) },
  ]

  const tabs: { key: GSTTab; label: string; icon: any }[] = [
    { key: 'gstr1', label: 'GSTR-1 (Outward Supplies)', icon: FileText },
    { key: 'gstr3b', label: 'GSTR-3B (Summary Return)', icon: Receipt },
    { key: 'hsn', label: 'HSN / SAC Summary', icon: Layers },
    { key: 'rate', label: 'Tax Rate Summary', icon: Percent },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">GST Tax Filing Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and export GSTR-1, GSTR-3B, HSN, and rate summaries for filing.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-xs">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0 ml-1" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-xs font-medium text-gray-800 bg-transparent border-none focus:ring-0 cursor-pointer"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <span className="text-gray-300">|</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs font-medium text-gray-800 bg-transparent border-none focus:ring-0 cursor-pointer"
          >
            {years.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'gstr1' && (
          <GSTR1ReportTab
            month={selectedMonth}
            year={selectedYear}
            businessId={currentBusiness?._id}
          />
        )}

        {activeTab === 'gstr3b' && (
          <GSTR3BTab
            month={selectedMonth}
            year={selectedYear}
            businessId={currentBusiness?._id}
          />
        )}

        {activeTab === 'hsn' && (
          <HSNSummaryTab
            month={selectedMonth}
            year={selectedYear}
            businessId={currentBusiness?._id}
          />
        )}

        {activeTab === 'rate' && (
          <TaxRateSummaryTab
            month={selectedMonth}
            year={selectedYear}
            businessId={currentBusiness?._id}
          />
        )}
      </div>
    </div>
  )
}
