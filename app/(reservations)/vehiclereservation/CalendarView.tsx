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
import { useState } from 'react'
import ListModal from './ListModal'
import {
  getReservationSpan,
  getReservationVehicles,
  occursOn,
  vehicleLabel,
} from '@/utils/reservation-helpers'

interface CalendarViewProps {
  data: ReservationTypes[]
  currentDate: Date
  onEdit: (item: ReservationTypes) => void
}

const MAX_PER_DAY = 3

export default function CalendarView({
  data,
  currentDate,
  onEdit,
}: CalendarViewProps) {
  const [showListModal, setShowListModal] = useState(false)
  const [selectedItems, setSelectedItems] = useState<ReservationTypes[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const handleShowAll = (items: ReservationTypes[], forDay: Date) => {
    setSelectedItems(items)
    setSelectedDay(forDay)
    setShowListModal(true)
  }

  const rows: JSX.Element[][] = []
  let days: JSX.Element[] = []
  let day = startDate

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cellDay = day
      // A reservation spans a range, so it shows on every day it covers.
      const dayActivities = data.filter((a) => occursOn(a, cellDay))
      const isToday = isSameDay(cellDay, new Date())
      const isCurrentMonth = isSameMonth(cellDay, monthStart)

      days.push(
        <div
          key={cellDay.toString()}
          className={cn(
            'border border-border/50 min-h-[120px] p-2 flex flex-col transition-colors hover:bg-accent/30',
            !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
            isToday && 'bg-primary/5 border-primary/30'
          )}>
          <div
            className={cn(
              'text-sm font-medium mb-1.5 flex items-center justify-between',
              isToday && 'text-primary font-semibold'
            )}>
            <span>{format(cellDay, 'd')}</span>
            {isToday && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto flex-1">
            {dayActivities.slice(0, MAX_PER_DAY).map((a) => {
              const vehicles = getReservationVehicles(a)
              const span = getReservationSpan(a)
              const isStart = span ? isSameDay(span.start, cellDay) : true
              const isEnd = span ? isSameDay(span.end, cellDay) : true
              const spansDays =
                span && span.start.getTime() !== span.end.getTime()

              return (
                <button
                  key={a.id}
                  type="button"
                  className={cn(
                    'text-xs px-2 py-1 truncate text-left transition-all hover:scale-[1.02] hover:shadow-sm',
                    reservationStatusColors[a.status] ||
                      'bg-muted text-muted-foreground hover:bg-muted/80',
                    // Square off the edges that continue into adjacent days so
                    // a multi-day booking reads as one continuous bar.
                    spansDays
                      ? cn(
                          isStart ? 'rounded-l-md' : 'rounded-l-none',
                          isEnd ? 'rounded-r-md' : 'rounded-r-none'
                        )
                      : 'rounded-md'
                  )}
                  onClick={() => onEdit(a)}
                  title={[
                    a.requester,
                    vehicles.map(vehicleLabel).join(', '),
                    a.time,
                  ]
                    .filter(Boolean)
                    .join(' — ')}>
                  <span className="truncate">
                    {!isStart && '← '}
                    {vehicles.length > 1
                      ? `${vehicles[0].name} +${vehicles.length - 1}`
                      : vehicles[0]?.name ?? a.requester}
                    {!isEnd && ' →'}
                  </span>
                </button>
              )
            })}
            {dayActivities.length > MAX_PER_DAY && (
              <button
                type="button"
                onClick={() => handleShowAll(dayActivities, cellDay)}
                className="text-xs text-primary hover:underline font-medium px-2 py-0.5 text-left">
                +{dayActivities.length - MAX_PER_DAY} more
              </button>
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
    <>
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 text-center font-semibold text-sm border-b bg-muted/30 py-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className="text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="grid">
            {rows.map((row, rowIdx) => (
              <div
                key={rowIdx}
                className="grid grid-cols-7">
                {row}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showListModal && (
        <ListModal
          data={selectedItems}
          title={
            selectedDay
              ? `${format(selectedDay, 'EEEE, MMMM d, yyyy')} — ${
                  selectedItems.length
                } reservation${selectedItems.length === 1 ? '' : 's'}`
              : undefined
          }
          hideModal={() => setShowListModal(false)}
          onEdit={(item) => {
            onEdit(item)
            setShowListModal(false)
          }}
        />
      )}
    </>
  )
}
