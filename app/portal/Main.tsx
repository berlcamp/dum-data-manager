'use client'

import UnitCodeLookup, {
  UnitCodeLookupHeading,
} from '@/components/UnitCodeLookup'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { reservationStatusColors } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ReservationTypes, ReservationVehicleTypes } from '@/types'
import {
  fetchReservationVehicleByCode,
  fetchReservationsByVehicle,
  normalizeUnitCode,
} from '@/utils/fetchApi'
import {
  formatSpan,
  formatTimeRange,
  getReservationInstants,
  getReservationSpan,
  isBlocking,
  occursOn,
} from '@/utils/reservation-helpers'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Search,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface MainProps {
  initialCode: string
}

export default function Main({ initialCode }: MainProps) {
  const router = useRouter()

  const [code, setCode] = useState(normalizeUnitCode(initialCode))
  const [unit, setUnit] = useState<ReservationVehicleTypes | null>(null)
  // Only tracks the deep-link resolve; the lookup card owns its own state.
  const [resolvingLink, setResolvingLink] = useState(
    () => normalizeUnitCode(initialCode).length === 4
  )

  const [month, setMonth] = useState(new Date())
  const [reservations, setReservations] = useState<ReservationTypes[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const handleResolved = useCallback(
    (found: ReservationVehicleTypes) => {
      setUnit(found)
      setCode(found.code ?? '')
      setMonth(new Date())
      setSelectedDay(null)
      // Keep the code in the URL so the lookup can be shared or bookmarked.
      router.replace(`/portal?code=${found.code ?? ''}`, { scroll: false })
    },
    [router]
  )

  const lookup = useCallback(
    async (raw: string) => {
      const cleaned = normalizeUnitCode(raw)
      if (cleaned.length !== 4) return

      try {
        const found = await fetchReservationVehicleByCode(cleaned)
        if (found) handleResolved(found)
      } finally {
        setResolvingLink(false)
      }
    },
    [handleResolved]
  )

  // Deep link: /portal?code=ABCD resolves without the visitor typing anything.
  useEffect(() => {
    if (normalizeUnitCode(initialCode).length === 4) {
      void lookup(initialCode)
    } else {
      setResolvingLink(false)
    }
  }, [initialCode, lookup])

  // The grid shows whole weeks, so fetch the padded range it actually renders.
  useEffect(() => {
    if (!unit) {
      setReservations([])
      return
    }

    let cancelled = false
    void (async () => {
      setLoadingSchedule(true)
      try {
        const result = await fetchReservationsByVehicle(
          unit.id,
          startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
          endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
        )
        if (!cancelled) setReservations(result.data ?? [])
      } finally {
        if (!cancelled) setLoadingSchedule(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [unit, month])

  const handleReset = () => {
    setUnit(null)
    setCode('')
    setReservations([])
    router.replace('/portal', { scroll: false })
  }

  const booked = reservations.filter((r) => isBlocking(r.status))

  // What is holding the unit right now, if anything.
  const now = Date.now()
  const inUseNow = booked.find((r) => {
    const interval = getReservationInstants(r)
    return interval !== null && interval.start <= now && now <= interval.end
  })

  const upcoming = booked
    .filter((r) => {
      const span = getReservationSpan(r)
      return span !== null && span.end.getTime() >= new Date().setHours(0, 0, 0, 0)
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

  const dayList = selectedDay
    ? booked.filter((r) => occursOn(r, selectedDay))
    : []

  // ---------------------------------------------------------------- landing

  if (!unit && resolvingLink) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!unit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <UnitCodeLookupHeading />
          </div>

          <Card>
            <CardContent className="p-6 sm:p-8">
              <UnitCodeLookup
                initialCode={code}
                onResolved={handleResolved}
              />
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-gray-500">
            Municipality of Dumingag — Unit Schedule Portal
          </p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------- schedule

  const monthStart = startOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 })

  const weeks: Date[][] = []
  let cursor = gridStart
  while (cursor <= gridEnd) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(cursor)
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Unit header */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-lg font-bold tracking-widest text-primary">
                  {unit.code}
                </span>
                <h1 className="truncate text-xl font-bold">{unit.name}</h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {[unit.type, unit.plate_number].filter(Boolean).join(' • ') ||
                  'Unit'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}>
              <Search className="mr-2 h-4 w-4" />
              Another code
            </Button>
          </CardContent>
        </Card>

        {/* Availability right now */}
        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4',
            inUseNow
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-green-300 bg-green-50 text-green-900'
          )}>
          {inUseNow ? (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <div className="text-sm">
            <div className="font-semibold">
              {inUseNow ? 'In use right now' : 'Available right now'}
            </div>
            {inUseNow && (
              <div className="mt-0.5">
                {inUseNow.requester}
                {inUseNow.department ? ` (${inUseNow.department})` : ''} —{' '}
                {formatSpan(inUseNow)}
                {formatTimeRange(inUseNow)
                  ? `, ${formatTimeRange(inUseNow)}`
                  : ''}
              </div>
            )}
          </div>
        </div>

        {/* Month calendar */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">
                {format(month, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center gap-2">
                {loadingSchedule && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMonth((m) => subMonths(m, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setMonth(new Date())}>
                  Today
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMonth((m) => addMonths(m, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b bg-muted/30 py-2 text-center text-xs font-semibold text-muted-foreground">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {weeks.map((week, weekIdx) => (
              <div
                key={weekIdx}
                className="grid grid-cols-7">
                {week.map((day) => {
                  const dayBookings = booked.filter((r) => occursOn(r, day))
                  const isToday = isSameDay(day, new Date())
                  const inMonth = isSameMonth(day, monthStart)
                  const isSelected = selectedDay
                    ? isSameDay(day, selectedDay)
                    : false

                  return (
                    <button
                      key={day.toString()}
                      type="button"
                      disabled={dayBookings.length === 0}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        'flex min-h-[72px] flex-col border p-1.5 text-left transition-colors',
                        !inMonth && 'bg-muted/30 text-muted-foreground',
                        dayBookings.length > 0
                          ? 'cursor-pointer hover:bg-accent/50'
                          : 'cursor-default',
                        isToday && 'border-primary/40 bg-primary/5',
                        isSelected && 'ring-2 ring-inset ring-primary'
                      )}>
                      <span
                        className={cn(
                          'text-xs font-medium',
                          isToday && 'font-bold text-primary'
                        )}>
                        {format(day, 'd')}
                      </span>
                      {dayBookings.length > 0 && (
                        <span className="mt-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          {dayBookings.length} booked
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bookings for the day tapped on the calendar */}
        {selectedDay && (
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">
                  {format(selectedDay, 'EEEE, MMMM d, yyyy')}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDay(null)}>
                  Close
                </Button>
              </div>
              <div className="space-y-2">
                {dayList.map((r) => (
                  <BookingRow
                    key={r.id}
                    reservation={r}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming */}
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-semibold">
              Upcoming in {format(month, 'MMMM yyyy')}
            </h3>
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing booked for this unit in this period.
              </p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((r) => (
                  <BookingRow
                    key={r.id}
                    reservation={r}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="pb-4 text-center text-xs text-gray-500">
          Municipality of Dumingag — Unit Schedule Portal
        </p>
      </div>
    </div>
  )
}

function BookingRow({ reservation }: { reservation: ReservationTypes }) {
  const timeRange = formatTimeRange(reservation)

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">
          {reservation.requester}
          {reservation.department ? ` / ${reservation.department}` : ''}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatSpan(reservation)}
          </span>
          {timeRange && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {timeRange}
            </span>
          )}
        </div>
        {reservation.purpose && (
          <p className="mt-1 text-xs text-muted-foreground">
            {reservation.purpose}
          </p>
        )}
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
          reservationStatusColors[reservation.status] ||
            'border-muted bg-muted text-muted-foreground'
        )}>
        {reservation.status || '—'}
      </span>
    </div>
  )
}
