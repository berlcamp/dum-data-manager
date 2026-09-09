'use client'

import { Card, CardContent } from '@/components/ui/card'
import { reservationStatusColors } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { HoursTypes, ListTypes, ReservationTypes } from '@/types'
import { generateTimeArray } from '@/utils/text-helper'
import {
  addDays,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import { useEffect, useState } from 'react'
import ListModal from './ListModal'
import {
  getReservationInstants,
  getReservationVehicles,
  timeToMinutes,
  vehicleLabel,
} from '@/utils/reservation-helpers'

interface WeekProps {
  data: ReservationTypes[]
  currentDate: Date
  onEdit: (item: ReservationTypes) => void
}

const HOUR_MS = 60 * 60 * 1000

export default function Week({ data, currentDate, onEdit }: WeekProps) {
  const [list, setList] = useState<ListTypes[] | []>([])
  const [showListModal, setShowListModal] = useState(false)
  const [selectedItems, setSelectedItems] = useState<ReservationTypes[]>([])

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
  const hours = generateTimeArray(true)

  useEffect(() => {
    const listArray: ListTypes[] = []
    let day = weekStart

    // Each reservation is one continuous interval, so an hour cell shows it
    // whenever the interval overlaps that hour — including every hour of the
    // in-between days of a multi-day booking.
    const intervals = data.map((reservation) => ({
      reservation,
      interval: getReservationInstants(reservation),
    }))

    while (day <= weekEnd) {
      const dayStart = startOfDay(day).getTime()

      const hoursArray: HoursTypes[] = hours.map((h) => {
        const slotStart = dayStart + (timeToMinutes(h) ?? 0) * 60_000
        const slotEnd = slotStart + HOUR_MS

        const filtered = intervals
          .filter(
            ({ interval }) =>
              interval !== null &&
              interval.start < slotEnd &&
              slotStart < interval.end
          )
          .map(({ reservation }) => reservation)

        return { hour: h, reservations: filtered }
      })

      listArray.push({
        date: format(day, 'yyyy-MM-dd'),
        hours: hoursArray,
      })
      day = addDays(day, 1)
    }

    setList(listArray)
  }, [data, currentDate])

  const handleEdit = (item: ReservationTypes) => {
    onEdit(item)
  }

  const handleShowAll = (items: ReservationTypes[]) => {
    setSelectedItems(items)
    setShowListModal(true)
  }

  const handleListModalEdit = (item: ReservationTypes) => {
    onEdit(item)
    setShowListModal(false)
  }

  return (
    <>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="grid grid-cols-8 min-w-[900px]">
            <div className="border-r border-b border-border/50 bg-muted/30">
              <div className="h-20 border-b" />
              {hours.map((h) => (
                <div
                  key={h}
                  className="h-24 pr-2 pt-1 border-b border-border/50 text-right text-xs text-muted-foreground">
                  {h}
                </div>
              ))}
            </div>
            {list.map((item) => {
              const isToday = isSameDay(new Date(item.date), new Date())
              return (
                <div
                  key={item.date}
                  className={cn(
                    'border-r border-b border-border/50 min-h-[400px] flex flex-col',
                    isToday && 'bg-primary/5'
                  )}>
                  <div
                    className={cn(
                      'h-20 border-b p-3 flex flex-col justify-center',
                      isToday && 'text-primary'
                    )}>
                    <div className="text-xs text-muted-foreground uppercase">
                      {format(new Date(item.date), 'EEE')}
                    </div>
                    <div className="text-lg font-semibold">
                      {format(new Date(item.date), 'd')}
                    </div>
                  </div>
                  {item.hours.map((h) => (
                    <div
                      key={h.hour}
                      className="relative h-24 border-b border-border/50 p-1 flex flex-col gap-1">
                      {h.reservations.slice(0, 2).map((r) => {
                        const vehicles = getReservationVehicles(r)
                        return (
                          <button
                            key={r.id}
                            type="button"
                            className={cn(
                              'text-xs px-2 py-1 rounded-md truncate text-left transition-all hover:scale-[1.02] hover:shadow-sm',
                              reservationStatusColors[r.status] ||
                                'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                            onClick={() => handleEdit(r)}
                            title={[
                              r.requester,
                              vehicles.map(vehicleLabel).join(', '),
                            ]
                              .filter(Boolean)
                              .join(' — ')}>
                            <div className="font-medium truncate">
                              {vehicles.length > 1
                                ? `${vehicles[0].name} +${vehicles.length - 1}`
                                : vehicles[0]?.name ?? '—'}
                            </div>
                            {r.time && (
                              <div className="text-[10px] opacity-75 truncate">
                                {r.time}
                              </div>
                            )}
                          </button>
                        )
                      })}
                      {h.reservations.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleShowAll(h.reservations)}
                          className="text-[10px] text-primary hover:underline font-medium mt-0.5">
                          +{h.reservations.length - 2} more
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {showListModal && (
        <ListModal
          data={selectedItems}
          hideModal={() => setShowListModal(false)}
          onEdit={handleListModalEdit}
        />
      )}
    </>
  )
}
