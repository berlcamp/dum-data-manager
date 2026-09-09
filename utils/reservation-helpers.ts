import type { ReservationTypes, ReservationVehicleTypes } from '@/types'
import { addDays, format, isValid, parse, startOfDay } from 'date-fns'

export const RESERVATION_STATUSES = [
  'Pending',
  'Confirmed',
  'Approved',
  'Completed',
  'Cancelled',
]

// A cancelled reservation no longer holds its vehicles.
const BLOCKING_STATUSES = new Set([
  'Pending',
  'Confirmed',
  'Approved',
  'Completed',
])

export const DATE_FMT = 'yyyy-MM-dd'

/**
 * Parses a "1:30 PM" / "1 PM" time string into minutes past midnight.
 * Returns null when the string is empty or unparseable.
 */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time || time.trim() === '') return null

  for (const pattern of ['h:mm a', 'h a', 'HH:mm']) {
    const parsed = parse(time.trim(), pattern, new Date(1970, 0, 1))
    if (isValid(parsed)) {
      return parsed.getHours() * 60 + parsed.getMinutes()
    }
  }
  return null
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : parse(value, DATE_FMT, new Date())
  return isValid(date) ? startOfDay(date) : null
}

export interface ReservationSpan {
  start: Date
  end: Date
}

/** The inclusive day span a reservation covers. */
export function getReservationSpan(
  reservation: Pick<ReservationTypes, 'date' | 'date_end'>
): ReservationSpan | null {
  const start = toDate(reservation.date)
  if (!start) return null
  const end = toDate(reservation.date_end) ?? start
  return { start, end: end < start ? start : end }
}

/**
 * Absolute start/end instants, used for overlap tests. A missing departure time
 * means "from the start of the day"; a missing return time means "until the end
 * of the last day", so partially-filled rows still block the days they cover.
 */
export function getReservationInstants(reservation: {
  date: string | Date
  date_end?: string | Date | null
  time?: string | null
  time_end?: string | null
}): { start: number; end: number } | null {
  const start = toDate(reservation.date)
  if (!start) return null
  const endDay = toDate(reservation.date_end) ?? start
  const lastDay = endDay < start ? start : endDay

  const startMinutes = timeToMinutes(reservation.time) ?? 0
  const endMinutes = timeToMinutes(reservation.time_end) ?? 24 * 60 - 1

  const startInstant = start.getTime() + startMinutes * 60_000
  let endInstant = lastDay.getTime() + endMinutes * 60_000

  // Guard against a return time earlier than the departure time on a
  // single-day reservation — treat it as running to the end of that day.
  if (endInstant < startInstant) {
    endInstant = lastDay.getTime() + (24 * 60 - 1) * 60_000
  }

  return { start: startInstant, end: endInstant }
}

/** True when the reservation covers the given calendar day. */
export function occursOn(reservation: ReservationTypes, day: Date): boolean {
  const span = getReservationSpan(reservation)
  if (!span) return false
  const target = startOfDay(day).getTime()
  return target >= span.start.getTime() && target <= span.end.getTime()
}

/** Every day the reservation covers, as `yyyy-MM-dd` strings. */
export function getReservationDays(reservation: ReservationTypes): string[] {
  const span = getReservationSpan(reservation)
  if (!span) return []

  const days: string[] = []
  let day = span.start
  // Defensive cap so a bad row can never spin the calendar forever.
  while (day <= span.end && days.length < 400) {
    days.push(format(day, DATE_FMT))
    day = addDays(day, 1)
  }
  return days
}

export function isMultiDay(reservation: ReservationTypes): boolean {
  const span = getReservationSpan(reservation)
  if (!span) return false
  return span.start.getTime() !== span.end.getTime()
}

/** The vehicles a reservation holds, de-duplicated. */
export function getReservationVehicles(
  reservation: ReservationTypes
): ReservationVehicleTypes[] {
  const vehicles: ReservationVehicleTypes[] = []
  const seen = new Set<string>()

  const push = (vehicle: ReservationVehicleTypes | null | undefined) => {
    if (!vehicle?.id) return
    const key = String(vehicle.id)
    if (seen.has(key)) return
    seen.add(key)
    vehicles.push(vehicle)
  }

  reservation.assignments?.forEach((assignment) => push(assignment.vehicle))
  // Pre-migration rows only carry the single embedded vehicle.
  push(reservation.vehicle)

  return vehicles
}

/** The vehicle ids a reservation holds, whichever shape the row is in. */
export function getReservationVehicleIds(reservation: {
  vehicle_id?: string | null
  assignments?: Array<{ vehicle_id: string }> | null
}): string[] {
  const ids = new Set<string>()
  reservation.assignments?.forEach((assignment) => {
    if (assignment.vehicle_id != null) ids.add(String(assignment.vehicle_id))
  })
  if (reservation.vehicle_id != null && String(reservation.vehicle_id) !== '') {
    ids.add(String(reservation.vehicle_id))
  }
  return Array.from(ids)
}

export function vehicleLabel(
  vehicle: ReservationVehicleTypes | null | undefined
): string {
  if (!vehicle) return '—'
  return vehicle.plate_number
    ? `${vehicle.name} (${vehicle.plate_number})`
    : vehicle.name
}

/** Human-readable span, e.g. "Mar 3" or "Mar 3 – Mar 7, 2026". */
export function formatSpan(reservation: ReservationTypes): string {
  const span = getReservationSpan(reservation)
  if (!span) return '—'
  if (span.start.getTime() === span.end.getTime()) {
    return format(span.start, 'MMM d, yyyy')
  }
  const sameYear = span.start.getFullYear() === span.end.getFullYear()
  return `${format(span.start, sameYear ? 'MMM d' : 'MMM d, yyyy')} – ${format(
    span.end,
    'MMM d, yyyy'
  )}`
}

/** Departure/return times as a single label. */
export function formatTimeRange(reservation: ReservationTypes): string {
  if (!reservation.time) return ''
  return reservation.time_end
    ? `${reservation.time} – ${reservation.time_end}`
    : reservation.time
}

export function isBlocking(status: string | null | undefined): boolean {
  // Rows created before statuses were set are treated as holding the vehicle.
  if (!status || status.trim() === '') return true
  return BLOCKING_STATUSES.has(status)
}

export interface ConflictCandidate {
  id: string
  requester: string
  department: string
  date: string
  date_end: string | null
  time: string | null
  time_end: string | null
  status: string | null
  vehicle_id: string | null
  assignments?: Array<{ vehicle_id: string }> | null
}

/**
 * Maps vehicle id -> the existing reservations that would clash with the given
 * span. `excludeId` skips the reservation currently being edited.
 */
export function buildConflictMap(
  candidates: ConflictCandidate[],
  span: {
    date: Date
    date_end: Date
    time?: string | null
    time_end?: string | null
  },
  excludeId?: string | null
): Record<string, ConflictCandidate[]> {
  const target = getReservationInstants(span)
  if (!target) return {}

  const map: Record<string, ConflictCandidate[]> = {}

  candidates.forEach((candidate) => {
    if (excludeId && String(candidate.id) === String(excludeId)) return
    if (!isBlocking(candidate.status)) return

    const other = getReservationInstants(candidate)
    if (!other) return

    // Half-open comparison: a reservation returning at 3 PM does not clash with
    // one departing at 3 PM.
    if (!(target.start < other.end && other.start < target.end)) return

    getReservationVehicleIds(candidate).forEach((vehicleId) => {
      map[vehicleId] = map[vehicleId] ?? []
      map[vehicleId].push(candidate)
    })
  })

  return map
}

export function describeConflict(conflict: ConflictCandidate): string {
  const span = formatSpan(conflict as unknown as ReservationTypes)
  const times = conflict.time
    ? conflict.time_end
      ? `, ${conflict.time} – ${conflict.time_end}`
      : `, ${conflict.time}`
    : ''
  const who = conflict.requester || 'Someone'
  const dept = conflict.department ? ` (${conflict.department})` : ''
  return `${who}${dept} — ${span}${times}`
}
