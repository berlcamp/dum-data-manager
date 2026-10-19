'use client'
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
import { useEffect, useRef } from 'react'

// Redux imports
import { useDispatch, useSelector } from 'react-redux'

import { Input } from '@/components/ui/input'
import type { AccountTypes, RisCaTypes } from '@/types'
import { format } from 'date-fns'
import { CalendarIcon, Loader2, Save, X } from 'lucide-react'

const FormSchema = z.object({
  ca_number: z.string().min(1, {
    message: 'CA No is required.',
  }),
  amount: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Amount is required.',
      invalid_type_error: 'Amount is required..',
    })
    .gte(1, {
      message: 'Amount is required...',
    }),
  description: z.string().min(1, {
    message: 'Description is required.',
  }),
  ca_date: z.date({
    required_error: 'CA Date is required.',
  }),
})

interface ModalProps {
  hideModal: () => void
  editData: RisCaTypes | null
}

export default function AddEditModal({ hideModal, editData }: ModalProps) {
  const { setToast } = useFilter()
  const { supabase, session, systemUsers } = useSupabase()

  const user: AccountTypes = systemUsers.find(
    (user: AccountTypes) => user.id === session.user.id,
  )

  const wrapperRef = useRef<HTMLDivElement>(null)

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ca_number: editData ? editData.ca_number : '',
      amount: editData ? editData.amount : 0,
      description: editData ? editData.description : '',
      ca_date: editData ? new Date(editData.ca_date) : new Date(),
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
        description: formdata.description,
        ca_number: formdata.ca_number,
        amount: formdata.amount,
        ca_date: format(new Date(formdata.ca_date), 'yyyy-MM-dd'),
        created_by: session.user.id,
      }

      const { data, error } = await supabase
        .from('ddm_ris_cash_advances')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      // Append new data in redux
      const updatedData = {
        ...newData,
        id: data[0].id,
        ca_date: data[0].ca_date,
        ddm_user: user,
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
        description: formdata.description,
        ca_number: formdata.ca_number,
        amount: formdata.amount,
        ca_date: format(new Date(formdata.ca_date), 'yyyy-MM-dd'),
        created_by: session.user.id,
      }

      const { data, error } = await supabase
        .from('ddm_ris_cash_advances')
        .update(newData)
        .eq('id', editData.id)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        ...newData,
        id: editData.id,
        ca_date: format(new Date(formdata.ca_date), 'yyyy-MM-dd'),
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
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [wrapperRef])

  const isSubmitting = form.formState.isSubmitting

  return (
    <div
      ref={wrapperRef}
      className="app__modal_wrapper">
      <div className="app__modal_wrapper2">
        <div className="app__modal_wrapper3">
          <div className="app__modal_header">
            <div>
              <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
                {editData
                  ? `Edit C.A. ${editData.ca_number}`
                  : 'New Cash Advance'}
              </h5>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                All fields are required.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Close"
              onClick={hideModal}>
              <X
                aria-hidden="true"
                className="h-4 w-4"
              />
            </Button>
          </div>

          <div className="app__modal_body">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="ca_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          C.A. Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 2024-01-001"
                            className="h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ca_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="app__form_label">
                          C.A. Date
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'h-9 pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground',
                                )}>
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon
                                  aria-hidden="true"
                                  className="ml-auto h-4 w-4 opacity-50"
                                />
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
                    name="amount"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="app__form_label">
                          Total Amount
                        </FormLabel>
                        <div className="relative">
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            ₱
                          </span>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              className="h-9 pl-7 tabular-nums"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          The full cash advance. R.I.S. charged to this C.A. are
                          deducted from it.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="app__form_label">
                          Description
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What this cash advance is for"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={hideModal}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="bg-emerald-600 text-white hover:bg-emerald-700">
                    {isSubmitting ? (
                      <Loader2
                        aria-hidden="true"
                        className="mr-1.5 h-4 w-4 animate-spin"
                      />
                    ) : (
                      <Save
                        aria-hidden="true"
                        className="mr-1.5 h-4 w-4"
                      />
                    )}
                    {isSubmitting
                      ? 'Saving…'
                      : editData
                        ? 'Save Changes'
                        : 'Create C.A.'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}
