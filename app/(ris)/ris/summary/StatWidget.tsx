import type { LucideIcon } from 'lucide-react'

interface StatWidgetProps {
  label: string
  value: string | number
  icon?: LucideIcon
  tone?: string
  className?: string
}

export default function StatWidget({
  label,
  value,
  icon: Icon,
  tone = 'text-gray-600 bg-gray-100 dark:bg-gray-800',
  className = '',
}: StatWidgetProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-4 ${className}`}>
      {Icon && (
        <div
          className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-md sm:flex ${tone}`}>
          <Icon
            aria-hidden="true"
            className="h-5 w-5"
          />
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </div>
        <div className="truncate text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100 sm:text-xl">
          {value}
        </div>
      </div>
    </div>
  )
}
