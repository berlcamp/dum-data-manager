'use client'
import { CustomButton } from '@/components/index'
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
import { Textarea } from '@/components/ui/textarea'
import { useFilter } from '@/context/FilterContext'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

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
import type {
  AccountTypes,
  ReservationTypes,
  ReservationVehicleTypes,
} from '@/types'
import { generateTimeArray } from '@/utils/text-helper'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

const FormSchema = z.object({
  requester: z.string().min(1, {
    message: 'Requester is required.',
  }),
  vehicle_id: z.coerce.string().min(1, {
    message: 'Vehicle is required.',
  }),
  department: z.string().min(1, {
    message: 'Department is required.',
  }),
  purpose: z.string().min(1, {
    message: 'Purpose is required.',
  }),
  date: z.date({
    required_error: 'Date is required.',
  }),
  time: z.string().min(1, {
    message: 'Time is required.',
  }),
})

interface ModalProps {
  hideModal: () => void
  editData: ReservationTypes | null
}

export default function AddEditModal({ hideModal, editData }: ModalProps) {
  const { setToast } = useFilter()
  const { supabase, session, systemUsers } = useSupabase()

  const [vehicles, setVehicles] = useState<ReservationVehicleTypes[] | []>([])

  const user: AccountTypes = systemUsers.find(
    (user: AccountTypes) => user.id === session.user.id
  )

  const wrapperRef = useRef<HTMLDivElement>(null)

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      requester: editData ? editData.requester : '',
      department: editData ? editData.department : '',
      vehicle_id: editData ? editData.vehicle_id : '',
      purpose: editData ? editData.purpose : '',
      time: editData ? editData.time : '',
      date: editData ? new Date(editData.date) : new Date(),
    },
  })

  const onSubmit = async (formdata: z.infer<typeof FormSchema>) => {
    if (editData) {
      await handleUpdate(formdata)
    } else {
      await handleCreate(formdata)
    }
  }

  const handleCreate = async (formdata: z.infer<typeof FormSchema>) => {
    try {
      const newData = {
        requester: formdata.requester,
        department: formdata.department,
        vehicle_id: formdata.vehicle_id,
        type: 'Vehicle',
        purpose: formdata.purpose,
        time: formdata.time,
        date: format(new Date(formdata.date), 'yyyy-MM-dd'),
      }

      const { data, error } = await supabase
        .from('ddm_reservations')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      // Append new data in redux
      const updatedData = {
        ...newData,
        id: data[0].id,
        vehicle: vehicles?.find((v) => v.id.toString() === formdata.vehicle_id),
      }
      dispatch(updateList([updatedData, ...globallist]))

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // hide the modal
      hideModal()
    } catch (error) {
      console.error('error', error)
    }
  }

  const handleUpdate = async (formdata: z.infer<typeof FormSchema>) => {
    if (!editData) return

    try {
      const newData = {
        requester: formdata.requester,
        department: formdata.department,
        vehicle_id: formdata.vehicle_id,
        purpose: formdata.purpose,
        time: formdata.time,
        date: format(new Date(formdata.date), 'yyyy-MM-dd'),
      }

      const { data, error } = await supabase
        .from('ddm_reservations')
        .update(newData)
        .eq('id', editData.id)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        ...newData,
        id: editData.id,
        vehicle: vehicles?.find((v) => v.id.toString() === formdata.vehicle_id),
      }
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      items[foundIndex] = { ...items[foundIndex], ...updatedData }
      dispatch(updateList(items))

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // hide the modal
      hideModal()
    } catch (error) {
      console.error('error', error)
    }
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
      setVehicles(data)
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
              Reservation Details
            </h5>
            <CustomButton
              containerStyles="app__btn_gray"
              title="Close"
              btnType="button"
              handleClick={hideModal}
            />
          </div>

          <div className="app__modal_body">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="md:grid md:grid-cols-2 md:gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="app__form_label">
                          Departure Date
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}>
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0"
                            align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date('1900-01-01')}
                              initialFocus
                            />
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
                          defaultValue={
                            editData ? editData.time.toString() : field.value
                          }>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {generateTimeArray(false)?.map((t, idx) => (
                              <SelectItem
                                key={idx}
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
                    name="vehicle_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          Vehicle
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={
                            editData
                              ? editData.vehicle_id.toString()
                              : field.value
                          }>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose Vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vehicles?.map((vehicle, idx) => (
                              <SelectItem
                                key={idx}
                                value={vehicle.id.toString()}>
                                {vehicle.name} - {vehicle.plate_number}
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
                <hr className="my-4" />
                <div className="app__modal_footer">
                  <CustomButton
                    btnType="submit"
                    isDisabled={form.formState.isSubmitting}
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
    </div>
  )
}
