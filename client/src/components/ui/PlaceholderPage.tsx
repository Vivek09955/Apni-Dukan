import React from 'react'
import { Link } from 'react-router-dom'
import { Construction, ArrowLeft } from 'lucide-react'
import { Button } from './Button'
import { Card } from './Card'

export interface PlaceholderPageProps {
  title: string
  description?: string
  icon?: React.ReactNode
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description = 'This module is scheduled for implementation in Phase 2. Stay tuned!',
  icon,
}) => {
  return (
    <div className="py-6">
      <Card className="max-w-xl mx-auto text-center py-12 px-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
          {icon || <Construction className="w-8 h-8" />}
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-3">
          Phase 2 Feature
        </span>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Coming Soon: {title}</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">{description}</p>
        <Link to="/dashboard">
          <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </Card>
    </div>
  )
}
