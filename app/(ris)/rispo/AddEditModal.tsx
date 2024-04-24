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
import type { AccountTypes, RisAppropriationTypes, RisPoTypes } from '@/types'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

const FormSchema = z.object({
  type: z.string().min(1, {
    message: 'Type is required.',
  }),
  po_number: z.string().min(1, {
    message: 'PO No is required.',
  }),
  appropriation: z.string().min(1, {
    message: 'Appropriation No is required.',
  }),
  price: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Price per liter is required.',
      invalid_type_error: 'Price per liter is required..',
    })
    .gte(1, {
      message: 'Price per liter is required...',
    }),
  quantity: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Quantity (L) is required.',
      invalid_type_error: 'Quantity (L) is required..',
    })
    .gte(1, {
      message: 'Quantity (L) is required...',
    }),
  description: z.string().min(1, {
    message: 'Description is required.',
  }),
  po_date: z.date({
    required_error: 'PO Date is required.',
  }),
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
      type: editData ? editData.type : '',
      po_number: editData ? editData.po_number : '',
      appropriation: editData ? editData.appropriation?.toString() || '' : '',
      price: editData ? editData.price : 0,
      quantity: editData ? editData.quantity : 0,
      description: editData ? editData.description : '',
      po_date: editData ? new Date(editData.po_date) : new Date(),
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
        type: formdata.type,
        description: formdata.description,
        po_number: formdata.po_number,
        appropriation: formdata.appropriation,
        price: formdata.price,
        quantity: formdata.quantity,
        amount: Number(formdata.quantity) * Number(formdata.price),
        po_date: format(new Date(formdata.po_date), 'yyyy-MM-dd'),
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
            (a) => a.id.toString() === formdata.appropriation.toString()
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
    }
  }

  const handleUpdate = async (formdata: z.infer<typeof FormSchema>) => {
    if (!editData) return

    try {
      const newData = {
        type: formdata.type,
        description: formdata.description,
        po_number: formdata.po_number,
        appropriation: formdata.appropriation,
        price: formdata.price,
        quantity: formdata.quantity,
        amount: Number(formdata.quantity) * Number(formdata.price),
        po_date: format(new Date(formdata.po_date), 'yyyy-MM-dd'),
        created_by: session.user.id,
      }

      const { error } = await supabase
        .from('ddm_ris_purchase_orders')
        .update(newData)
        .eq('id', editData.id)

      if (error) throw new Error(error.message)

      // update price per liter on all RIS if PO price has changed
      if (
        editData.price !== formdata.price ||
        editData.appropriation !== formdata.appropriation ||
        editData.type !== formdata.type
      ) {
        await supabase
          .from('ddm_ris')
          .update({
            price: formdata.price,
            type: formdata.type,
          })
          .eq('po_id', editData.id)
      }

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        ...newData,
        id: editData.id,
        po_date: format(new Date(formdata.po_date), 'yyyy-MM-dd'),
        ddm_ris_appropriation: {
          id: formdata.appropriation,
          name: appropriations.find(
            (a) => a.id.toString() === formdata.appropriation.toString()
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
                0
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
      <div className="app__modal_wrapper2">
        <div className="app__modal_wrapper3">
          <div className="app__modal_header">
            <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
              P.O. Details
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
                <div className="md:grid md:grid-cols-1 md:gap-4">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="po_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="app__form_label">
                            P.O. Date
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
                            P.O. Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="P.O. Number"
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
                              <SelectTrigger>
                                <SelectValue placeholder="Choose Appropriation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {appropriations?.map((a, i) => (
                                <SelectItem
                                  key={i}
                                  value={a.id.toString()}>
                                  {a.name} ( Available Amount:{' '}
                                  {Number(a.remaining_amount).toLocaleString(
                                    'en-US',
                                    {
                                      minimumFractionDigits: 2, // Minimum number of decimal places
                                      maximumFractionDigits: 2, // Maximum number of decimal places
                                    }
                                  )}
                                  )
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
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Type
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose Type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Gasoline">Gasoline</SelectItem>
                              <SelectItem value="Diesel">Diesel</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Price per Liter
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Price per Liter"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                              placeholder="Quantity"
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
                  </div>
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
