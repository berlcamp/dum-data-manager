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
import type {
  AccountTypes,
  RisCaTypes,
  RisDepartmentTypes,
  RisPoTypes,
  RisTypes,
  RisVehicleTypes,
} from '@/types'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

const FormSchema = z.object({
  requester: z.string().min(1, {
    message: 'Requester is required.',
  }),
  department_id: z.coerce.string().min(1, {
    message: 'Requesting Department is required.',
  }),
  po_id: z.coerce.string().optional(),
  ca_id: z.coerce.string().optional(),
  vehicle_id: z.coerce.string().min(1, {
    message: 'Vehicle is required.',
  }),
  transaction_type: z.string().min(1, {
    message: 'Transaction Type is required',
  }),
  type: z.string().min(1, {
    message: 'Type is required',
  }),
  quantity: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Quantity (L) is required.',
      invalid_type_error: 'Quantity (L) is required..',
    })
    .gte(1, {
      message: 'Quantity (L) is required...',
    }),
  price: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number()
    .optional(),
  purpose: z.string().min(1, {
    message: 'Purpose is required.',
  }),
  date_requested: z.date({
    required_error: 'Date is required.',
  }),
})

interface ModalProps {
  hideModal: () => void
  editData: RisTypes | null
}

export default function AddEditModal({ hideModal, editData }: ModalProps) {
  const { setToast } = useFilter()
  const { supabase, session, systemUsers } = useSupabase()

  const [vehicles, setVehicles] = useState<RisVehicleTypes[] | []>([])
  const [departments, setDepartments] = useState<RisDepartmentTypes[] | []>([])
  const [purchaseOrders, setPurchaseOrders] = useState<RisPoTypes[] | []>([])
  const [cashAdvances, setCashAdvances] = useState<RisCaTypes[] | []>([])

  const [transactionType, setTransactionType] = useState('')
  const [dieselPrice, setDieselPrice] = useState(0)
  const [gasolinePrice, setGasolinePrice] = useState(0)

  // Error message
  const [errorMessage, setErrorMessage] = useState('')

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
      department_id: editData ? editData.department_id : '',
      vehicle_id: editData ? editData.vehicle_id : '',
      transaction_type: editData ? editData.transaction_type : '',
      type: editData ? editData.type : '',
      po_id: editData ? editData.po_id || '' : '',
      ca_id: editData ? editData.ca_id || '' : '',
      quantity: editData ? editData.quantity : 0,
      price: editData ? editData.price || 0 : 0,
      purpose: editData ? editData.purpose : '',
      date_requested: editData ? new Date(editData.date_requested) : new Date(),
    },
  })

  const onSubmit = async (formdata: z.infer<typeof FormSchema>) => {
    if (
      formdata.transaction_type === 'Purchase Order' &&
      formdata.po_id === ''
    ) {
      setErrorMessage('Please select P.O.')
      return
    }
    if (formdata.transaction_type === 'Cash Advance' && formdata.ca_id === '') {
      setErrorMessage('Please select C.A.')
      return
    }
    setErrorMessage('')

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
        department_id: formdata.department_id,
        po_id:
          formdata.transaction_type === 'Purchase Order'
            ? formdata.po_id
            : null,
        ca_id:
          formdata.transaction_type === 'Cash Advance' ? formdata.ca_id : null,
        vehicle_id: formdata.vehicle_id,
        transaction_type: formdata.transaction_type,
        type: formdata.type,
        quantity: formdata.quantity,
        price: formdata.price,
        status: 'Approved',
        purpose: formdata.purpose,
        date_requested: format(new Date(formdata.date_requested), 'yyyy-MM-dd'),
        created_by: session.user.id,
      }

      const { data, error } = await supabase
        .from('ddm_ris')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      // Append new data in redux
      const updatedData = {
        ...newData,
        id: data[0].id,
        date_requested: data[0].date_requested,
        ddm_user: user,
        department: departments?.find(
          (d) => d.id.toString() === formdata.department_id
        ),
        purchase_order: purchaseOrders?.find(
          (p) => p.id.toString() === formdata.po_id
        ),
        cash_advance: cashAdvances?.find(
          (p) => p.id.toString() === formdata.ca_id
        ),
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
        department_id: formdata.department_id,
        po_id:
          formdata.transaction_type === 'Purchase Order'
            ? formdata.po_id
            : null,
        ca_id:
          formdata.transaction_type === 'Cash Advance' ? formdata.ca_id : null,
        vehicle_id: formdata.vehicle_id,
        transaction_type: formdata.transaction_type,
        type: formdata.type,
        quantity: formdata.quantity,
        price: formdata.price,
        purpose: formdata.purpose,
        date_requested: format(new Date(formdata.date_requested), 'yyyy-MM-dd'),
      }

      const { data, error } = await supabase
        .from('ddm_ris')
        .update(newData)
        .eq('id', editData.id)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        ...newData,
        id: editData.id,
        date_requested: format(new Date(formdata.date_requested), 'yyyy-MM-dd'),
        department: departments?.find(
          (d) => d.id.toString() === formdata.department_id
        ),
        purchase_order: purchaseOrders?.find(
          (p) => p.id.toString() === formdata.po_id
        ),
        cash_advance: cashAdvances?.find(
          (p) => p.id.toString() === formdata.ca_id
        ),
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
        .from('ddm_ris_vehicles')
        .select()
        .order('name', { ascending: true })
      setVehicles(data)
    })()

    // Fetch departments
    ;(async () => {
      const { data } = await supabase.from('ddm_ris_departments').select()
      setDepartments(data)
    })()

    // Fetch purchase orders
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_purchase_orders')
        .select('*, ddm_ris_appropriation:appropriation(*),ddm_ris(quantity)')
        .order('po_number', { ascending: true })

      // setPurchaseOrders(data)

      // Mutate the data to get the remaining quantity
      const updatedData: RisPoTypes[] = []
      if (data) {
        data.forEach((item: RisPoTypes) => {
          const totalQuantityUsed = item.ddm_ris
            ? item.ddm_ris.reduce(
                (accumulator, ris) => accumulator + Number(ris.quantity),
                0
              )
            : 0
          const remainingQuantity = Number(item.quantity) - totalQuantityUsed

          // Exclude on list if remain quantity is 0
          if (item.type !== 'Fuel') {
            if (remainingQuantity > 0) {
              updatedData.push({
                ...item,
                remaining_quantity: ` (Available: ${remainingQuantity.toFixed(
                  2
                )} Liters)`,
              })
            }
          } else {
            updatedData.push({
              ...item,
              remaining_quantity: '',
            })
          }
        })
      }
      setPurchaseOrders(updatedData)
    })()

    // Fetch Cash Advances
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_cash_advances')
        .select('*, ddm_ris(total_amount)')
        .order('ca_number', { ascending: true })
      // Mutate the data to get the remaining quantity
      const updatedData: RisCaTypes[] = []
      if (data) {
        data.forEach((item: RisCaTypes) => {
          const totalAmountUsed = item.ddm_ris
            ? item.ddm_ris.reduce(
                (accumulator, ris) => accumulator + Number(ris.total_amount),
                0
              )
            : 0
          const remainingAmount = Number(item.amount) - totalAmountUsed

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
      setCashAdvances(updatedData)
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
              R.I.S. Details
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
                <div className="md:grid md:grid-cols-2 md:gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="transaction_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">Type</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            form.setValue('transaction_type', value)
                            form.setValue('po_id', '')
                            form.setValue('ca_id', '')
                            setTransactionType(value)
                          }}
                          defaultValue={
                            editData
                              ? editData.transaction_type.toString()
                              : field.value
                          }>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Purchase Order">
                              Purchase Order
                            </SelectItem>
                            <SelectItem value="Cash Advance">
                              Cash Advance
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:grid md:grid-cols-2 md:gap-4">
                  {(editData || form.getValues('transaction_type') !== '') && (
                    <>
                      <FormField
                        control={form.control}
                        name="date_requested"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="app__form_label">
                              Date Requested
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
                      {form.getValues('transaction_type') ===
                        'Purchase Order' && (
                        <FormField
                          control={form.control}
                          name="po_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="app__form_label">
                                Purchase Order
                              </FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  const po = purchaseOrders?.find(
                                    (po) => po.id.toString() === value
                                  )
                                  form.setValue('po_id', value)
                                  if (po) {
                                    if (po.type !== 'Fuel') {
                                      form.setValue('type', po.type)
                                    }
                                    setDieselPrice(po.diesel_price || 0)
                                    setGasolinePrice(po.gasoline_price || 0)
                                  }
                                }}
                                defaultValue={
                                  editData
                                    ? editData.po_id
                                      ? editData.po_id.toString()
                                      : field.value
                                    : field.value
                                }>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose P.O." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {purchaseOrders?.map((po, idx) => (
                                    <SelectItem
                                      key={idx}
                                      value={po.id.toString()}>
                                      {po.po_number}-{po.type}
                                      {po.remaining_quantity}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                              {errorMessage !== '' && (
                                <div className="text-red-500 text-sm font-medium">
                                  {errorMessage}
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                      )}
                      {form.getValues('transaction_type') ===
                        'Cash Advance' && (
                        <FormField
                          control={form.control}
                          name="ca_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="app__form_label">
                                Cash Advance
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={
                                  editData
                                    ? editData.ca_id
                                      ? editData.ca_id.toString()
                                      : field.value
                                    : field.value
                                }>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose C.A." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {cashAdvances?.map((ca, idx) => (
                                    <SelectItem
                                      key={idx}
                                      value={ca.id.toString()}>
                                      {ca.ca_number}-( Available:{' '}
                                      {ca.remaining_amount})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                              {errorMessage !== '' && (
                                <div className="text-red-500 text-sm font-medium">
                                  {errorMessage}
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                      )}
                      <FormField
                        control={form.control}
                        name="department_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="app__form_label">
                              Requesting Department
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={
                                editData
                                  ? editData.department_id.toString()
                                  : field.value
                              }>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose Department" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {departments?.map((department, idx) => (
                                  <SelectItem
                                    key={idx}
                                    value={department.id.toString()}>
                                    {department.name}
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
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="app__form_label">
                              Fuel Type
                            </FormLabel>
                            <Select
                              onValueChange={(value) => {
                                form.setValue('type', value)
                                if (value === 'Diesel') {
                                  form.setValue('price', dieselPrice)
                                }
                                if (value === 'Gasoline') {
                                  form.setValue('price', gasolinePrice)
                                }
                              }}
                              value={field.value}
                              defaultValue={
                                editData
                                  ? editData.type.toString()
                                  : field.value
                              }>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose Type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Diesel">Diesel</SelectItem>
                                <SelectItem value="Gasoline">
                                  Gasoline
                                </SelectItem>
                              </SelectContent>
                            </Select>
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
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="app__form_label">
                              Price per Liter
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
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
                    </>
                  )}
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
