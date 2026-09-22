'use client'
import { ConfirmModal, CustomButton } from '@/components/index'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useSupabase } from '@/context/SupabaseProvider'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { useFilter } from '@/context/FilterContext'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useRef, useState } from 'react'

// Redux imports
import { useDispatch, useSelector } from 'react-redux'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ReservationTypes, ReservationVehicleTypes } from '@/types'
import { generateTimeArray } from '@/utils/text-helper'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import {
  AlertTriangle,
  Boxes,
  Building2,
  CalendarIcon,
  Car,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Loader2,
  Search,
  Speaker,
  Tent,
  type LucideIcon,
} from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  RESERVATION_STATUSES,
  buildConflictMap,
  describeConflict,
  getReservationVehicleIds,
  vehicleLabel,
  type ConflictCandidate,
} from '@/utils/reservation-helpers'
import { type ReservationUnitCategory } from '@/constants/TrackerConstants'
import { categoryOf, groupUnitsByCategory } from '@/utils/reservation-units'
import type { ReactNode } from 'react'

const NO_RETURN_TIME = 'none'

type SectionId = 'schedule' | 'units' | 'details'

const ALL_SECTIONS: SectionId[] = ['schedule', 'units', 'details']

// Which section holds each field, so a validation error can open the section
// hiding it instead of failing silently behind a collapsed header.
const FIELD_SECTIONS: Record<string, SectionId> = {
  date: 'schedule',
  date_end: 'schedule',
  time: 'schedule',
  time_end: 'schedule',
  vehicle_ids: 'units',
  requester: 'details',
  department: 'details',
  status: 'details',
  purpose: 'details',
}

const CATEGORY_ICONS: Record<ReservationUnitCategory, LucideIcon> = {
  Vehicle: Car,
  Tents: Tent,
  Venue: Building2,
  'Sound System': Speaker,
}

// The modal is filled in on phones out in the field, so every section folds
// away and the collapsed header keeps showing what was chosen.
const CollapsibleSection = ({
  icon,
  title,
  badge,
  summary,
  open,
  onToggle,
  className,
  children,
}: {
  icon: ReactNode
  title: string
  badge?: ReactNode
  summary?: string
  open: boolean
  onToggle: () => void
  className?: string
  children: ReactNode
}) => (
  <section
    className={cn(
      'rounded-md border bg-white dark:bg-gray-700 dark:border-gray-600',
      className,
    )}>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-2 p-4 text-left">
      {icon}
      <h6 className="text-sm font-semibold">{title}</h6>
      {badge}
      <div className="ml-auto flex min-w-0 items-center gap-2 pl-2">
        {!open && summary && (
          <span className="truncate text-xs text-muted-foreground">
            {summary}
          </span>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </div>
    </button>
    {open && <div className="px-4 pb-4">{children}</div>}
  </section>
)

const FormSchema = z
  .object({
    requester: z.string().min(1, {
      message: 'Requester is required.',
    }),
    vehicle_ids: z.array(z.string()).min(1, {
      message: 'Select at least one vehicle.',
    }),
    department: z.string().min(1, {
      message: 'Department is required.',
    }),
    purpose: z.string().min(1, {
      message: 'Purpose is required.',
    }),
    status: z.string().min(1, {
      message: 'Status is required.',
    }),
    date: z.date({
      required_error: 'Departure date is required.',
    }),
    date_end: z.date({
      required_error: 'Return date is required.',
    }),
    time: z.string().min(1, {
      message: 'Departure time is required.',
    }),
    time_end: z.string().optional(),
  })
  .refine((data) => data.date_end >= data.date, {
    message: 'Return date cannot be before the departure date.',
    path: ['date_end'],
  })

type FormValues = z.infer<typeof FormSchema>

interface ModalProps {
  hideModal: () => void
  editData: ReservationTypes | null
}

export default function AddEditModal({ hideModal, editData }: ModalProps) {
  const { setToast } = useFilter()
  const { supabase } = useSupabase()

  const [vehicles, setVehicles] = useState<ReservationVehicleTypes[]>([])
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  // Collapsible sections: one at a time on a phone, all open on a desktop.
  const [isMobile, setIsMobile] = useState(false)
  const [openSections, setOpenSections] = useState<SectionId[]>(ALL_SECTIONS)
  // Closed by default — `isCategoryOpen` still expands a category on search or
  // when it holds an already-selected unit (e.g. editing an existing booking).
  const [openCategories, setOpenCategories] = useState<
    ReservationUnitCategory[]
  >([])

  // Availability
  const [conflictMap, setConflictMap] = useState<
    Record<string, ConflictCandidate[]>
  >({})
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const wrapperRef = useRef<HTMLDivElement>(null)

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      requester: editData ? editData.requester : '',
      department: editData ? editData.department : '',
      vehicle_ids: editData ? getReservationVehicleIds(editData) : [],
      purpose: editData ? editData.purpose : '',
      status: editData?.status ? editData.status : 'Pending',
      time: editData ? editData.time : '',
      time_end: editData?.time_end ? editData.time_end : NO_RETURN_TIME,
      date: editData ? new Date(editData.date) : new Date(),
      date_end: editData
        ? new Date(editData.date_end ?? editData.date)
        : new Date(),
    },
  })

  const dateFrom = form.watch('date')
  const dateTo = form.watch('date_end')
  const timeFrom = form.watch('time')
  const timeTo = form.watch('time_end')
  const selectedVehicleIds = form.watch('vehicle_ids')

  const timeOptions = useMemo(() => generateTimeArray(false), [])

  const nights =
    dateFrom && dateTo ? differenceInCalendarDays(dateTo, dateFrom) : 0

  // Re-check availability whenever the window changes. Conflicts are computed
  // over the whole window so a multi-day trip blocks every day it covers.
  useEffect(() => {
    if (!dateFrom || !dateTo || dateTo < dateFrom) return

    let cancelled = false
    const timer = setTimeout(() => {
      void (async () => {
        setCheckingAvailability(true)
        try {
          const from = format(dateFrom, 'yyyy-MM-dd')
          const to = format(dateTo, 'yyyy-MM-dd')

          const { data, error } = await supabase
            .from('ddm_reservations')
            .select(
              'id, requester, department, date, date_end, time, time_end, status, vehicle_id, assignments:ddm_reservation_vehicle_assignments(vehicle_id)'
            )
            .lte('date', to)
            .or(`date_end.gte.${from},and(date_end.is.null,date.gte.${from})`)

          if (error) throw new Error(error.message)
          if (cancelled) return

          setConflictMap(
            buildConflictMap(
              (data ?? []) as ConflictCandidate[],
              {
                date: dateFrom,
                date_end: dateTo,
                time: timeFrom,
                time_end: timeTo === NO_RETURN_TIME ? null : timeTo,
              },
              editData?.id
            )
          )
        } catch (error) {
          console.error('availability check failed', error)
        } finally {
          if (!cancelled) setCheckingAvailability(false)
        }
      })()
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [dateFrom, dateTo, timeFrom, timeTo])

  const bookedSelected = selectedVehicleIds.filter(
    (id) => (conflictMap[id]?.length ?? 0) > 0
  )
  const availableCount = vehicles.filter(
    (v) => (conflictMap[String(v.id)]?.length ?? 0) === 0
  ).length

  const filteredVehicles = vehicles.filter((v) => {
    const kw = vehicleSearch.trim().toLowerCase()
    if (kw === '') return true
    return (
      v.name.toLowerCase().includes(kw) ||
      (v.plate_number ?? '').toLowerCase().includes(kw) ||
      categoryOf(v).toLowerCase().includes(kw) ||
      (v.code ?? '').toLowerCase().includes(kw)
    )
  })

  // Units are not all vehicles — tents, venues and the sound system are booked
  // here too, so the picker is grouped by category instead of one flat list.
  const unitGroups = groupUnitsByCategory(filteredVehicles)
  const searching = vehicleSearch.trim() !== ''

  // A search expands every matching group, and a group holding something
  // already selected stays open so an edit shows its own picks.
  const isCategoryOpen = (
    category: ReservationUnitCategory,
    units: ReservationVehicleTypes[],
  ) =>
    searching ||
    openCategories.includes(category) ||
    units.some((unit) => selectedVehicleIds.includes(String(unit.id)))

  const scheduleSummary =
    dateFrom && dateTo
      ? `${format(dateFrom, 'MMM d')}${
          nights > 0 ? ` – ${format(dateTo, 'MMM d')}` : ''
        }${timeFrom ? ` · ${timeFrom}` : ''}`
      : 'Not set'

  const unitsSummary =
    selectedVehicleIds.length === 0
      ? 'None selected'
      : `${selectedVehicleIds.length} selected`

  const requester = form.watch('requester')
  const department = form.watch('department')
  const detailsSummary =
    requester || department
      ? [requester, department].filter(Boolean).join(' — ')
      : 'Not filled in'

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')

    const apply = () => {
      setIsMobile(query.matches)
      setOpenSections(query.matches ? ['schedule'] : ALL_SECTIONS)
      setOpenCategories([])
    }

    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  // Opening a section on a phone closes the others, so the form never turns
  // into one long scroll.
  const toggleSection = (section: SectionId) => {
    setOpenSections((current) =>
      current.includes(section)
        ? current.filter((s) => s !== section)
        : isMobile
          ? [section]
          : [...current, section],
    )
  }

  const openSection = (section: SectionId) => {
    setOpenSections((current) =>
      current.includes(section)
        ? current
        : isMobile
          ? [section]
          : [...current, section],
    )
  }

  const toggleCategory = (category: ReservationUnitCategory) => {
    setOpenCategories((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category],
    )
  }

  // One unit card; pulled out so the grouped picker below stays readable.
  const renderUnit = (vehicle: ReservationVehicleTypes) => {
    const id = String(vehicle.id)
    const conflicts = conflictMap[id] ?? []
    const isBooked = conflicts.length > 0
    const isSelected = selectedVehicleIds.includes(id)

    return (
      <label
        key={id}
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
          isSelected
            ? 'border-primary bg-primary/5'
            : 'hover:bg-accent/40',
          isBooked &&
            'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
        )}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) =>
            toggleVehicle(id, checked === true)
          }
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">
              {vehicleLabel(vehicle)}
            </span>
            {isBooked ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-300">
                <AlertTriangle className="h-3 w-3" />
                Booked
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <CheckCircle2 className="h-3 w-3" />
                Available
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            {vehicle.code && (
              <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-white">
                {vehicle.code}
              </span>
            )}
          </div>
          {isBooked && (
            <ul className="mt-1.5 space-y-0.5 text-xs text-red-700 dark:text-red-300">
              {conflicts.slice(0, 2).map((c) => (
                <li key={c.id}>
                  {describeConflict(c)}
                </li>
              ))}
              {conflicts.length > 2 && (
                <li className="opacity-75">
                  +{conflicts.length - 2} more booking
                  {conflicts.length - 2 > 1 ? 's' : ''}
                </li>
              )}
            </ul>
          )}
        </div>
      </label>
    )
  }

  const toggleVehicle = (vehicleId: string, checked: boolean) => {
    const current = form.getValues('vehicle_ids')
    const next = checked
      ? Array.from(new Set([...current, vehicleId]))
      : current.filter((id) => id !== vehicleId)
    form.setValue('vehicle_ids', next, { shouldValidate: true })
  }

  // A field that fails validation inside a collapsed section would otherwise
  // just look like a form that refuses to submit.
  const onInvalid = (errors: Record<string, unknown>) => {
    const section = FIELD_SECTIONS[Object.keys(errors)[0]]
    if (section) openSection(section)
  }

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (!range?.from) return
    form.setValue('date', range.from, { shouldValidate: true })
    form.setValue('date_end', range.to ?? range.from, { shouldValidate: true })
  }

  const onSubmit = async (formdata: FormValues) => {
    if (bookedSelected.length > 0) {
      setToast(
        'error',
        'One or more selected vehicles are already booked for this schedule.'
      )
      return
    }

    if (editData) {
      await handleUpdate(formdata)
    } else {
      await handleCreate(formdata)
    }
  }

  /** Replaces the vehicle rows attached to a reservation. */
  const syncAssignments = async (
    reservationId: string,
    vehicleIds: string[]
  ) => {
    const { error: deleteError } = await supabase
      .from('ddm_reservation_vehicle_assignments')
      .delete()
      .eq('reservation_id', reservationId)

    if (deleteError) throw new Error(deleteError.message)

    const { error: insertError } = await supabase
      .from('ddm_reservation_vehicle_assignments')
      .insert(
        vehicleIds.map((vehicleId) => ({
          reservation_id: reservationId,
          vehicle_id: vehicleId,
        }))
      )

    if (insertError) throw new Error(insertError.message)
  }

  /** Shapes the saved row the way `fetchVehicleReservations` returns it. */
  const buildListItem = (formdata: FormValues, id: string) => {
    const selected = formdata.vehicle_ids
      .map((vehicleId) => vehicles.find((v) => String(v.id) === vehicleId))
      .filter((v): v is ReservationVehicleTypes => Boolean(v))

    return {
      id,
      type: 'Vehicle',
      requester: formdata.requester,
      department: formdata.department,
      purpose: formdata.purpose,
      status: formdata.status,
      time: formdata.time,
      time_end:
        formdata.time_end === NO_RETURN_TIME ? null : formdata.time_end ?? null,
      date: format(formdata.date, 'yyyy-MM-dd'),
      date_end: format(formdata.date_end, 'yyyy-MM-dd'),
      vehicle_id: formdata.vehicle_ids[0],
      vehicle: selected[0],
      assignments: selected.map((vehicle) => ({
        vehicle_id: String(vehicle.id),
        vehicle,
      })),
    }
  }

  const handleCreate = async (formdata: FormValues) => {
    try {
      const newData = {
        requester: formdata.requester,
        department: formdata.department,
        // Mirrors the first vehicle so pre-existing reads keep working.
        vehicle_id: formdata.vehicle_ids[0],
        type: 'Vehicle',
        status: formdata.status,
        purpose: formdata.purpose,
        time: formdata.time,
        time_end:
          formdata.time_end === NO_RETURN_TIME
            ? null
            : formdata.time_end ?? null,
        date: format(formdata.date, 'yyyy-MM-dd'),
        date_end: format(formdata.date_end, 'yyyy-MM-dd'),
      }

      const { data, error } = await supabase
        .from('ddm_reservations')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      await syncAssignments(data[0].id, formdata.vehicle_ids)

      // Append new data in redux
      dispatch(
        updateList([buildListItem(formdata, data[0].id), ...globallist])
      )

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // hide the modal
      hideModal()
    } catch (error) {
      console.error('error', error)
      setToast('error', 'Something went wrong while saving.')
    }
  }

  const handleUpdate = async (formdata: FormValues) => {
    if (!editData) return

    try {
      const newData = {
        requester: formdata.requester,
        department: formdata.department,
        vehicle_id: formdata.vehicle_ids[0],
        status: formdata.status,
        purpose: formdata.purpose,
        time: formdata.time,
        time_end:
          formdata.time_end === NO_RETURN_TIME
            ? null
            : formdata.time_end ?? null,
        date: format(formdata.date, 'yyyy-MM-dd'),
        date_end: format(formdata.date_end, 'yyyy-MM-dd'),
      }

      const { error } = await supabase
        .from('ddm_reservations')
        .update(newData)
        .eq('id', editData.id)

      if (error) throw new Error(error.message)

      await syncAssignments(editData.id, formdata.vehicle_ids)

      // Update data in redux
      const items = [...globallist]
      const updatedData = buildListItem(formdata, editData.id)
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      if (foundIndex !== -1) {
        items[foundIndex] = { ...items[foundIndex], ...updatedData }
      }
      dispatch(updateList(items))

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // hide the modal
      hideModal()
    } catch (error) {
      console.error('error', error)
      setToast('error', 'Something went wrong while saving.')
    }
  }

  const handleDelete = async () => {
    if (!editData) return

    try {
      const { error } = await supabase
        .from('ddm_reservations')
        .delete()
        .eq('id', editData.id)

      if (error) {
        throw new Error(error.message)
      }

      // Remove data in redux
      const items = [...globallist]
      const updatedList = items.filter(
        (item) => item.id.toString() !== editData.id.toString()
      )
      dispatch(updateList(updatedList))

      setToast('success', 'Successfully deleted')
      setShowConfirmDelete(false)
      hideModal()
    } catch (error) {}
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      hideModal()
    }
  }

  useEffect(() => {
    // Fetch vehicles
    ;(async () => {
      const { data } = await supabase
        .from('ddm_reservation_vehicles')
        .select()
        .order('name', { ascending: true })
      setVehicles(data ?? [])
    })()
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [wrapperRef])

  return (
    <div
      ref={wrapperRef}
      className="app__modal_wrapper">
      <div className="app__modal_wrapper2_large">
        <div className="app__modal_wrapper3">
          <div className="app__modal_header">
            <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
              {editData ? 'Edit Reservation' : 'New Reservation'}
            </h5>
            <div className="flex space-x-2">
              {editData && (
                <CustomButton
                  containerStyles="app__btn_red"
                  title="Delete"
                  btnType="button"
                  handleClick={() => setShowConfirmDelete(true)}
                />
              )}
              <CustomButton
                containerStyles="app__btn_gray"
                title="Close"
                btnType="button"
                handleClick={hideModal}
              />
            </div>
          </div>

          <div className="app__modal_body">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
                {/* Schedule */}
                <CollapsibleSection
                  icon={
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  }
                  title="Schedule"
                  badge={
                    nights > 0 ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {nights + 1} days
                      </span>
                    ) : undefined
                  }
                  summary={scheduleSummary}
                  open={openSections.includes('schedule')}
                  onToggle={() => toggleSection('schedule')}>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="date"
                      render={() => (
                        <FormItem className="flex flex-col md:col-span-1">
                          <FormLabel className="app__form_label">
                            Date Range
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    'justify-start pl-3 text-left font-normal',
                                    !dateFrom && 'text-muted-foreground'
                                  )}>
                                  {dateFrom ? (
                                    dateTo &&
                                    dateTo.getTime() !== dateFrom.getTime() ? (
                                      <span>
                                        {format(dateFrom, 'MMM d')} –{' '}
                                        {format(dateTo, 'MMM d, yyyy')}
                                      </span>
                                    ) : (
                                      <span>{format(dateFrom, 'PPP')}</span>
                                    )
                                  ) : (
                                    <span>Pick a date range</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start">
                              <Calendar
                                mode="range"
                                numberOfMonths={2}
                                defaultMonth={dateFrom}
                                selected={{ from: dateFrom, to: dateTo }}
                                onSelect={handleRangeSelect}
                                disabled={(date) =>
                                  date < new Date('1900-01-01')
                                }
                                initialFocus
                              />
                              <div className="flex items-center gap-2 border-t p-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const today = new Date()
                                    handleRangeSelect({
                                      from: today,
                                      to: today,
                                    })
                                  }}>
                                  Today
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRangeSelect({
                                      from: dateFrom,
                                      to: addDays(dateFrom, 2),
                                    })
                                  }>
                                  3 days
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRangeSelect({
                                      from: dateFrom,
                                      to: addDays(dateFrom, 6),
                                    })
                                  }>
                                  1 week
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Departure Time
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timeOptions.map((t) => (
                                <SelectItem
                                  key={t}
                                  value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time_end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Return Time{' '}
                            <span className="font-normal text-muted-foreground">
                              (optional)
                            </span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? NO_RETURN_TIME}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={NO_RETURN_TIME}>
                                Whole day
                              </SelectItem>
                              {timeOptions.map((t) => (
                                <SelectItem
                                  key={t}
                                  value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="date_end"
                    render={() => (
                      <FormItem>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleSection>

                {/* Vehicles */}
                <CollapsibleSection
                  className="mt-4"
                  icon={<Boxes className="h-4 w-4 text-muted-foreground" />}
                  title="Units"
                  badge={
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {selectedVehicleIds.length} selected
                    </span>
                  }
                  summary={unitsSummary}
                  open={openSections.includes('units')}
                  onToggle={() => toggleSection('units')}>
                  <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                    <div className="flex items-center gap-3">
                      {checkingAvailability ? (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Checking availability…
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {availableCount} of {vehicles.length} free for this
                          schedule
                        </span>
                      )}
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={vehicleSearch}
                          onChange={(e) => setVehicleSearch(e.target.value)}
                          placeholder="Name, plate or code"
                          className="h-8 w-44 pl-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="vehicle_ids"
                    render={() => (
                      <FormItem>
                        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                          {unitGroups.length === 0 && (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                              No units match “{vehicleSearch}”.
                            </p>
                          )}
                          {unitGroups.map(({ category, units }) => {
                            const Icon = CATEGORY_ICONS[category]
                            const open = isCategoryOpen(category, units)
                            const selectedInCategory = units.filter((unit) =>
                              selectedVehicleIds.includes(String(unit.id)),
                            ).length

                            return (
                              <div
                                key={category}
                                className="rounded-md border dark:border-gray-600">
                                <button
                                  type="button"
                                  onClick={() => toggleCategory(category)}
                                  aria-expanded={open}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {category}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {units.length} unit
                                    {units.length > 1 ? 's' : ''}
                                  </span>
                                  {selectedInCategory > 0 && (
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                      {selectedInCategory} selected
                                    </span>
                                  )}
                                  <ChevronDown
                                    className={cn(
                                      'ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                      open && 'rotate-180',
                                    )}
                                  />
                                </button>
                                {open && (
                                  <div className="grid gap-2 border-t p-2 dark:border-gray-600 md:grid-cols-2">
                                    {units.map(renderUnit)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {bookedSelected.length > 0 && (
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <span className="font-medium">
                          {bookedSelected.length} selected vehicle
                          {bookedSelected.length > 1 ? 's are' : ' is'} already
                          booked
                        </span>{' '}
                        for this schedule. Change the dates, the times, or the
                        selection before saving.
                      </div>
                    </div>
                  )}
                </CollapsibleSection>

                {/* Request details */}
                <CollapsibleSection
                  className="mt-4"
                  icon={
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  }
                  title="Request Details"
                  summary={detailsSummary}
                  open={openSections.includes('details')}
                  onToggle={() => toggleSection('details')}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="requester"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Requester
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Requester Name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Department
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Department Name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Status
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RESERVATION_STATUSES.map((s) => (
                                <SelectItem
                                  key={s}
                                  value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Purpose
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Purpose"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleSection>

                <hr className="my-4" />
                <div className="app__modal_footer">
                  <CustomButton
                    btnType="submit"
                    isDisabled={
                      form.formState.isSubmitting || bookedSelected.length > 0
                    }
                    title={form.formState.isSubmitting ? 'Saving...' : 'Submit'}
                    containerStyles="app__btn_green"
                  />
                  <CustomButton
                    btnType="button"
                    isDisabled={form.formState.isSubmitting}
                    title="Cancel"
                    handleClick={hideModal}
                    containerStyles="app__btn_gray"
                  />
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
      {showConfirmDelete && (
        <ConfirmModal
          onConfirm={handleDelete}
          header="Confirm Delete"
          btnText="Yes, Delete"
          message="Are you sure you want to delete this?"
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
    </div>
  )
}
