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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useFilter } from '@/context/FilterContext'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

// Redux imports
import { useDispatch, useSelector } from 'react-redux'

import { Input } from '@/components/ui/input'
import type {
  AccountTypes,
  RisAppropriationTypes,
  RisDepartmentTypes,
  RisPoTypes,
} from '@/types'
import { format } from 'date-fns'
import { CalendarIcon, Loader2, X } from 'lucide-react'

// Allow saving even if the total amount exceeds the appropriation's remaining amount
const ALLOW_SAVE_WHEN_EXCEEDED = true

const FormSchema = z.object({
  type: z.string().min(1, {
    message: 'Type is required.',
  }),
  po_number: z.string().min(1, {
    message: 'Department Allocation No. is required.',
  }),
  appropriation: z.string().min(1, {
    message: 'Appropriation No is required.',
  }),
  department_id: z.string().min(1, {
    message: 'Department is required.',
  }),
  quantity: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Quantity (L) is required.',
      invalid_type_error: 'Quantity (L) is required..',
    }),
  description: z.string().min(1, {
    message: 'Description is required.',
  }),
  supplier: z.string().optional(),
  diesel_price: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Diesel price is required.',
      invalid_type_error: 'Diesel price is required..',
    }),
  total_amount: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Amount limit is required.',
      invalid_type_error: 'Amount limit is required..',
    }),
  gasoline_price: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Gasoline price is required.',
      invalid_type_error: 'Gasoline price is required..',
    }),
  oil_price: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Oil and Lubricants price is required.',
      invalid_type_error: 'Oil and Lubricants price is required..',
    }),
  po_date: z.date({
    required_error: 'Department Allocation Date is required.',
  }),
  allow_overconsumed: z.boolean(),
})

interface ModalProps {
  hideModal: () => void
  editData: RisPoTypes | null
}

export default function AddEditModal({ hideModal, editData }: ModalProps) {
  const { setToast } = useFilter()
  const { supabase, session, systemUsers } = useSupabase()

  const [appropriations, setAppropriations] = useState<
    RisAppropriationTypes[] | []
  >([])

  const [departments, setDepartments] = useState<RisDepartmentTypes[] | []>([])

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
      type: editData ? editData.type : '',
      po_number: editData ? editData.po_number : '',
      appropriation: editData ? editData.appropriation?.toString() || '' : '',
      department_id: editData ? editData.department_id?.toString() || '' : '',
      gasoline_price: editData ? editData.gasoline_price : 0,
      diesel_price: editData ? editData.diesel_price : 0,
      oil_price: editData ? (editData.oil_price ?? 0) : 0,
      total_amount: editData ? editData.amount : 0,
      quantity: editData ? editData.quantity : 0,
      description: editData ? editData.description : '',
      supplier: editData?.supplier ?? '',
      po_date: editData ? new Date(editData.po_date) : new Date(),
      allow_overconsumed: editData
        ? (editData.allow_overconsumed ?? false)
        : false,
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
      let price = 0
      if (formdata.type === 'Gasoline') {
        price = formdata.gasoline_price
      }
      if (formdata.type === 'Diesel') {
        price = formdata.diesel_price
      }
      if (formdata.type === 'Oil and Lubricants') {
        price = formdata.oil_price
      }
      const newData = {
        type: formdata.type,
        description: formdata.description,
        po_number: formdata.po_number,
        appropriation: formdata.appropriation,
        department_id: formdata.department_id,
        supplier: formdata.supplier?.trim() || null,
        diesel_price: formdata.diesel_price,
        gasoline_price: formdata.gasoline_price,
        oil_price: formdata.oil_price,
        quantity: formdata.quantity,
        amount: formdata.total_amount,
        po_date: format(new Date(formdata.po_date), 'yyyy-MM-dd'),
        allow_overconsumed: formdata.allow_overconsumed,
        created_by: session.user.id,
      }

      const { data, error } = await supabase
        .from('ddm_ris_purchase_orders')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      // Append new data in redux
      const updatedData = {
        ...newData,
        id: data[0].id,
        po_date: data[0].po_date,
        ddm_user: user,
        ddm_ris_appropriation: {
          id: formdata.appropriation,
          name: appropriations.find(
            (a) => a.id.toString() === formdata.appropriation.toString(),
          )?.name,
        },
        department: {
          id: formdata.department_id,
          name: departments.find(
            (d) => d.id.toString() === formdata.department_id.toString(),
          )?.name,
        },
      }
      dispatch(updateList([updatedData, ...globallist]))

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // hide the modal
      hideModal()
    } catch (error) {
      console.error('error', error)
      setToast('error', 'Something went wrong. Please try again.')
    }
  }

  const handleUpdate = async (formdata: z.infer<typeof FormSchema>) => {
    if (!editData) return

    try {
      let price = 0
      if (formdata.type === 'Gasoline') {
        price = formdata.gasoline_price
      }
      if (formdata.type === 'Diesel') {
        price = formdata.diesel_price
      }
      if (formdata.type === 'Oil and Lubricants') {
        price = formdata.oil_price
      }

      const newData: any = {
        type: formdata.type,
        description: formdata.description,
        po_number: formdata.po_number,
        appropriation: formdata.appropriation,
        department_id: formdata.department_id,
        supplier: formdata.supplier?.trim() || null,
        diesel_price: formdata.diesel_price,
        amount: formdata.total_amount,
        gasoline_price: formdata.gasoline_price,
        oil_price: formdata.oil_price,
        quantity: formdata.quantity,
        // Don't include amount/total_amount in update - database calculates it via DEFAULT/trigger
        po_date: format(new Date(formdata.po_date), 'yyyy-MM-dd'),
        allow_overconsumed: formdata.allow_overconsumed,
        created_by: session.user.id,
      }

      const { error } = await supabase
        .from('ddm_ris_purchase_orders')
        .update(newData)
        .eq('id', editData.id)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      // Calculate amount for local state (database calculates total_amount automatically)
      const calculatedAmount =
        formdata.type === 'Fuel'
          ? formdata.total_amount
          : Number(formdata.quantity) * Number(price)
      const updatedData = {
        ...newData,
        id: editData.id,
        amount: calculatedAmount,
        po_date: format(new Date(formdata.po_date), 'yyyy-MM-dd'),
        ddm_ris_appropriation: {
          id: formdata.appropriation,
          name: appropriations.find(
            (a) => a.id.toString() === formdata.appropriation.toString(),
          )?.name,
        },
        department: {
          id: formdata.department_id,
          name: departments.find(
            (d) => d.id.toString() === formdata.department_id.toString(),
          )?.name,
        },
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
      setToast('error', 'Something went wrong. Please try again.')
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      hideModal()
    }
  }

  useEffect(() => {
    ;(async () => {
      // Fetch appropriations
      const { data } = await supabase
        .from('ddm_ris_appropriations')
        .select('*,ddm_ris_purchase_orders(amount)')

      // Mutate the data to get the available amount
      const updatedData: RisAppropriationTypes[] = []
      if (data) {
        data.forEach((item: RisAppropriationTypes) => {
          const totalUsed = item.ddm_ris_purchase_orders
            ? item.ddm_ris_purchase_orders.reduce(
                (accumulator, po) => accumulator + Number(po.amount),
                0,
              )
            : 0
          const remainingAmount = Number(item.amount) - totalUsed

          // Exclude on list if remain quantity is 0
          if (!editData) {
            if (remainingAmount > 0) {
              updatedData.push({
                ...item,
                remaining_amount: remainingAmount,
              })
            }
          } else {
            updatedData.push({
              ...item,
              remaining_amount: remainingAmount,
            })
          }
        })
      }
      setAppropriations(updatedData)

      // Fetch departments
      const { data: deptData } = await supabase
        .from('ddm_ris_departments')
        .select()
        .order('name', { ascending: true })
      if (deptData) setDepartments(deptData)
    })()
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [wrapperRef])

  const selectedType = form.watch('type')
  const isSubmitting = form.formState.isSubmitting
  const sectionHeading =
    'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'
  const helperText = 'text-xs text-muted-foreground'

  return (
    <div
      ref={wrapperRef}
      className="app__modal_wrapper">
      <div className="app__modal_wrapper2_large">
        <div className="app__modal_wrapper3">
          <div className="flex items-start justify-between gap-3 rounded-t-md border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <div>
              <h5 className="text-base font-semibold leading-normal text-gray-900 dark:text-gray-100">
                {editData
                  ? 'Edit Department Allocation'
                  : 'New Department Allocation'}
              </h5>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {editData
                  ? `Dept. Allocation #: ${editData.po_number}`
                  : 'Set the budget a department can charge R.I.S. against'}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Close"
              disabled={isSubmitting}
              onClick={hideModal}>
              <X
                aria-hidden="true"
                className="h-4 w-4"
              />
            </Button>
          </div>

          <div className="relative min-h-0 overflow-y-auto p-4 sm:p-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-6 md:grid-cols-2">
                  <section
                    aria-labelledby="dept-alloc-details"
                    className="space-y-4">
                    <h6
                      id="dept-alloc-details"
                      className={sectionHeading}>
                      Allocation details
                    </h6>
                    <FormField
                      control={form.control}
                      name="po_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="app__form_label">
                            Department Allocation Date
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'h-9 w-full pl-3 text-left font-normal',
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
                                disabled={(date) =>
                                  date < new Date('1900-01-01')
                                }
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
                      name="po_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Department Allocation No.
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 2026-001"
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
                      name="appropriation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Appropriation
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value.toString()}
                            defaultValue={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Choose Appropriation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {appropriations?.map((a) => (
                                <SelectItem
                                  key={a.id}
                                  value={a.id.toString()}>
                                  {a.name} (Available: ₱
                                  {Number(a.remaining_amount).toLocaleString(
                                    'en-US',
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )}
                                  )
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!editData && (
                            <p className={helperText}>
                              Only appropriations with an available amount are
                              listed.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Department
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value.toString()}
                            defaultValue={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Choose Department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments?.map((d) => (
                                <SelectItem
                                  key={d.id}
                                  value={d.id.toString()}>
                                  {d.name}
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
                      name="supplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Supplier{' '}
                            <span className="font-normal text-gray-400">
                              (optional)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Supplier"
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
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Description
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Description"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </section>
                  <section
                    aria-labelledby="dept-alloc-limits"
                    className="space-y-4">
                    <h6
                      id="dept-alloc-limits"
                      className={sectionHeading}>
                      Fuel type &amp; limits
                    </h6>
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Type
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              form.setValue('type', value)
                            }}
                            defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Choose Type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Gasoline">Gasoline</SelectItem>
                              <SelectItem value="Diesel">Diesel</SelectItem>
                              <SelectItem value="Oil and Lubricants">
                                Oil and Lubricants
                              </SelectItem>
                              <SelectItem value="Fuel">Fuel</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className={helperText}>
                            Fuel is tracked by amount; Gasoline, Diesel and Oil
                            and Lubricants by liters.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {!selectedType && (
                      <div className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        Choose a type to enter prices and limits.
                      </div>
                    )}
                    {(selectedType === 'Fuel' ||
                      selectedType === 'Gasoline') && (
                      <FormField
                        control={form.control}
                        name="gasoline_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="app__form_label">
                              Gasoline price per Liter (₱)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="Price per Liter"
                                className="h-9 tabular-nums"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {(selectedType === 'Fuel' || selectedType === 'Diesel') && (
                      <FormField
                        control={form.control}
                        name="diesel_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="app__form_label">
                              Diesel price per Liter (₱)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="Price per Liter"
                                className="h-9 tabular-nums"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {selectedType === 'Oil and Lubricants' && (
                      <FormField
                        control={form.control}
                        name="oil_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="app__form_label">
                              Oil and Lubricants price per Liter (₱)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="Price per Liter"
                                className="h-9 tabular-nums"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {(selectedType === 'Gasoline' ||
                      selectedType === 'Diesel' ||
                      selectedType === 'Oil and Lubricants') && (
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="app__form_label">
                              Quantity (Liters)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="Quantity"
                                className="h-9 tabular-nums"
                                {...field}
                              />
                            </FormControl>
                            <p className={helperText}>
                              Total liters this allocation covers.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {selectedType === 'Fuel' && (
                      <FormField
                        control={form.control}
                        name="total_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="app__form_label">
                              Total Amount (₱)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="Total Amount"
                                className="h-9 tabular-nums"
                                {...field}
                              />
                            </FormControl>
                            <p className={helperText}>
                              Spending limit R.I.S. can draw from.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="allow_overconsumed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Over-consumed Department Allocation
                          </FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === 'allow')
                            }
                            value={field.value ? 'allow' : 'disallow'}
                            defaultValue={field.value ? 'allow' : 'disallow'}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Choose option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="allow">Allow</SelectItem>
                              <SelectItem value="disallow">Disallow</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className={helperText}>
                            When allowed, this Department Allocation stays
                            selectable even when fully consumed or
                            over-consumed.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </section>
                </div>
                <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 dark:border-gray-700 sm:flex-row sm:justify-end">
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
                    {isSubmitting && (
                      <Loader2
                        aria-hidden="true"
                        className="mr-1.5 h-4 w-4 animate-spin"
                      />
                    )}
                    {isSubmitting
                      ? 'Saving…'
                      : editData
                        ? 'Save Changes'
                        : 'Create Department Allocation'}
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
