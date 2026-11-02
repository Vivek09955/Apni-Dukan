import React from 'react'

export interface CardProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  actions,
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-xs border border-gray-200/80 p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  )
}
