'use client'

import { Card, CardContent } from '@/components/ui/card'
import { reservationStatusColors } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ReservationTypes } from '@/types'
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

interface CalendarViewProps {
  data: ReservationTypes[]
  currentDate: Date
  onEdit: (item: ReservationTypes) => void
}

export default function CalendarView({
  data,
  currentDate,
  onEdit,
}: CalendarViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const rows: JSX.Element[][] = []
  let days: JSX.Element[] = []
  let day = startDate

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayActivities = data.filter((a) => a.date === dayStr)
      const isToday = isSameDay(day, new Date())
      const isCurrentMonth = isSameMonth(day, monthStart)

      days.push(
        <div
          key={day.toString()}
          className={cn(
            'border border-border/50 min-h-[120px] p-2 flex flex-col transition-colors hover:bg-accent/30',
            !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
            isToday && 'bg-primary/5 border-primary/30'
          )}
        >
          <div
            className={cn(
              'text-sm font-medium mb-1.5 flex items-center justify-between',
              isToday && 'text-primary font-semibold'
            )}
          >
            <span>{format(day, 'd')}</span>
            {isToday && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto flex-1">
            {dayActivities.slice(0, 3).map((a) => (
              <button
                key={a.id}
                type="button"
                className={cn(
                  'text-xs px-2 py-1 rounded-md truncate text-left transition-all hover:scale-[1.02] hover:shadow-sm',
                  reservationStatusColors[a.status] ||
                    'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
                onClick={() => onEdit(a)}
                title={`${a.requester} - ${a.vehicle?.name ?? ''} ${a.time ?? ''}`}
              >
                {a.vehicle?.name ?? a.requester}
              </button>
            ))}
            {dayActivities.length > 3 && (
              <div className="text-xs text-muted-foreground px-2 py-0.5">
                +{dayActivities.length - 3} more
              </div>
            )}
          </div>
        </div>
      )
      day = addDays(day, 1)
    }
    rows.push(days)
    days = []
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 text-center font-semibold text-sm border-b bg-muted/30 py-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-7">
              {row}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
