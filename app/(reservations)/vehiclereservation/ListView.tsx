import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { reservationStatusColors } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { ReservationTypes } from '@/types'
import { compareAsc, compareDesc, format } from 'date-fns'
import { CalendarRange, Car, Clock } from 'lucide-react'
import {
  formatSpan,
  formatTimeRange,
  getReservationVehicles,
  isMultiDay,
  vehicleLabel,
} from '@/utils/reservation-helpers'

interface ListViewProps {
  data: ReservationTypes[]
  onEdit: (item: ReservationTypes) => void
  sortFromLatest?: boolean
}

export default function ListView({
  data,
  onEdit,
  sortFromLatest,
}: ListViewProps) {
  const sorted = [...data].sort((a, b) =>
    sortFromLatest
      ? compareDesc(new Date(a.date ?? ''), new Date(b.date ?? ''))
      : compareAsc(new Date(a.date ?? ''), new Date(b.date ?? ''))
  )

  // Grouped by departure date — a multi-day booking is listed once, under the
  // day it starts, with its full span shown on the row.
  const grouped = sorted.reduce<Record<string, ReservationTypes[]>>((acc, a) => {
    const key = a.date ? format(new Date(a.date), 'yyyy-MM-dd') : 'no-date'
    acc[key] = acc[key] || []
    acc[key].push(a)
    return acc
  }, {})

  if (Object.keys(grouped).length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No reservations found
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your filters
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, items]) => (
        <Card
          key={date}
          className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-muted/50 px-6 py-4 border-b">
              <div className="flex items-baseline gap-3">
                <div className="text-3xl font-bold text-primary">
                  {date !== 'no-date' ? format(new Date(date), 'd') : '—'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {date !== 'no-date'
                    ? format(new Date(date), 'EEEE, MMMM d, yyyy')
                    : 'No Date'}
                </div>
              </div>
            </div>
            <div className="divide-y">
              {items.map((a) => {
                const vehicles = getReservationVehicles(a)
                const timeRange = formatTimeRange(a)

                return (
                  <button
                    key={a.id}
                    type="button"
                    className="w-full p-4 hover:bg-accent/50 transition-colors text-left flex justify-between items-start gap-4"
                    onClick={() => onEdit(a)}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium mb-1.5">
                        {a.requester} / {a.department}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        {isMultiDay(a) && (
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <CalendarRange className="h-3.5 w-3.5" />
                            {formatSpan(a)}
                          </span>
                        )}
                        {timeRange && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {timeRange}
                          </span>
                        )}
                        {a.purpose && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{a.purpose}</span>
                          </>
                        )}
                      </div>

                      {vehicles.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Car className="h-3.5 w-3.5 text-muted-foreground" />
                          {vehicles.map((v) => (
                            <span
                              key={v.id}
                              className="rounded-full border bg-background px-2 py-0.5 text-xs">
                              {vehicleLabel(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0',
                        reservationStatusColors[a.status] ||
                          'border-muted bg-muted text-muted-foreground'
                      )}>
                      {a.status || '—'}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
