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
import {
  AlertCircle,
  CalendarIcon,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  DollarSign,
  Droplet,
  Fuel,
} from 'lucide-react'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

const languages = [
  { label: 'English', value: 'en' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Spanish', value: 'es' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Russian', value: 'ru' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Chinese', value: 'zh' },
] as const

const FormSchema = z.object({
  requester: z.string().min(1, {
    message: 'Requester is required.',
  }),
  destination: z.string().optional(),
  department_id: z.coerce.string().min(1, {
    message: 'Requesting Department is required.',
  }),
  po_id: z.coerce.string().optional(),
  ca_id: z.coerce.string().optional(),
  vehicle_id: z.coerce.string().min(1, {
    message: 'Vehicle is required.',
  }),
  transaction_type: z.string().default('Purchase Order'),
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
  starting_balance: z.coerce
    .number({
      required_error: 'Starting Balance (L) is required.',
      invalid_type_error: 'Starting Balance must be a number.',
    })
    .gte(0, {
      message: 'Starting Balance must be greater than or equal to 0.',
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
  const { setToast, hasAccess } = useFilter()
  const { supabase, session, systemUsers, currentUser } = useSupabase()
  const hasRisAdminAccess = hasAccess('ris_admin')

  const [vehicles, setVehicles] = useState<RisVehicleTypes[] | []>([])
  const [departments, setDepartments] = useState<RisDepartmentTypes[] | []>([])
  const [purchaseOrders, setPurchaseOrders] = useState<RisPoTypes[] | []>([])
  const [cashAdvances, setCashAdvances] = useState<RisCaTypes[] | []>([])

  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [dieselPrice, setDieselPrice] = useState(0)
  const [gasolinePrice, setGasolinePrice] = useState(0)
  const [remainingLiters, setRemainingLiters] = useState<number | null>(null)
  const [remainingAmount, setRemainingAmount] = useState<number | null>(null)
  const [selectedPO, setSelectedPO] = useState<RisPoTypes | null>(null)

  // Error message
  const [errorMessage, setErrorMessage] = useState('')

  const user: AccountTypes = systemUsers.find(
    (user: AccountTypes) => user.id === session.user.id,
  )

  console.log('editData', user)

  const wrapperRef = useRef<HTMLDivElement>(null)

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      requester: editData ? editData.requester : '',
      destination: editData ? editData.destination : '',
      department_id: editData ? editData.department_id : '',
      vehicle_id: editData ? editData.vehicle_id : '',
      transaction_type: editData ? editData.transaction_type : 'Purchase Order',
      type: editData ? editData.type : '',
      po_id: editData ? editData.po_id || '' : '',
      ca_id: editData ? editData.ca_id || '' : '',
      quantity: editData ? editData.quantity : 0,
      starting_balance: editData ? editData.starting_balance : 0,
      price: editData ? editData.price || 0 : 0,
      purpose: editData ? editData.purpose : '',
      date_requested: editData ? new Date(editData.date_requested) : new Date(),
    },
  })

  // Helper function to calculate total amount based on quantity and price
  const getTotalAmount = (): number => {
    const quantity = form.watch('quantity') || 0
    const price = form.watch('price') || 0
    return Number(quantity) * Number(price)
  }

  // Helper function to calculate maximum quantity based on type
  const getMaxQuantity = (): number | null => {
    if (!selectedPO) return null

    const currentType = form.watch('type')

    // For Fuel PO type: return remaining amount (not liters)
    if (selectedPO.type === 'Fuel') {
      return remainingAmount !== null ? remainingAmount : null
    }

    // For Diesel or Gasoline form type: use remaining liters
    if (currentType === 'Diesel' || currentType === 'Gasoline') {
      return remainingLiters !== null ? remainingLiters : null
    }

    return null
  }

  const onSubmit = async (formdata: z.infer<typeof FormSchema>) => {
    // Set transaction_type to Purchase Order by default
    formdata.transaction_type = 'Purchase Order'

    if (
      formdata.transaction_type === 'Purchase Order' &&
      formdata.po_id === ''
    ) {
      setErrorMessage('Please select P.O.')
      return
    }
    setErrorMessage('')

    // Validate quantity/total amount against maximum based on type
    const maxQuantity = getMaxQuantity()

    if (selectedPO?.type === 'Fuel') {
      // For Fuel PO type: validate total amount against available amount
      const totalAmount = (formdata.quantity || 0) * (formdata.price || 0)
      if (maxQuantity !== null && totalAmount > maxQuantity) {
        const errorMessage = `Total amount (₱${totalAmount.toFixed(2)}) cannot exceed available amount (₱${maxQuantity.toFixed(2)})`
        form.setError('quantity', {
          type: 'manual',
          message: errorMessage,
        })
        return
      }
    } else {
      // For Diesel/Gasoline: validate quantity against remaining liters
      if (maxQuantity !== null && formdata.quantity > maxQuantity) {
        const errorMessage = `Quantity cannot exceed available liters (${maxQuantity.toFixed(2)} L)`
        form.setError('quantity', {
          type: 'manual',
          message: errorMessage,
        })
        return
      }
    }

    if (editData) {
      await handleUpdate(formdata)
    } else {
      await handleCreate(formdata)
    }
  }

  const handleCreate = async (formdata: z.infer<typeof FormSchema>) => {
    try {
      const totalAmount = (formdata.quantity || 0) * (formdata.price || 0)

      const newData = {
        requester: formdata.requester,
        destination: formdata.destination,
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
        starting_balance: formdata.starting_balance,
        price: formdata.price,
        total_amount: totalAmount,
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
          (d) => d.id.toString() === formdata.department_id,
        ),
        purchase_order: purchaseOrders?.find(
          (p) => p.id.toString() === formdata.po_id,
        ),
        cash_advance: cashAdvances?.find(
          (p) => p.id.toString() === formdata.ca_id,
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
      const totalAmount = (formdata.quantity || 0) * (formdata.price || 0)

      const newData = {
        requester: formdata.requester,
        destination: formdata.destination,
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
        starting_balance: formdata.starting_balance,
        price: formdata.price,
        total_amount: totalAmount,
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
          (d) => d.id.toString() === formdata.department_id,
        ),
        purchase_order: purchaseOrders?.find(
          (p) => p.id.toString() === formdata.po_id,
        ),
        cash_advance: cashAdvances?.find(
          (p) => p.id.toString() === formdata.ca_id,
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
      const { data } = await supabase
        .from('ddm_ris_departments')
        .select()
        .order('name', { ascending: true })
      setDepartments(data)
    })()

    // Fetch purchase orders - filter by user access
    ;(async () => {
      if (!session?.user?.email) return

      // Admin emails that can see all records
      const adminEmails = ['arfel@ddm.com', 'berlcamp@gmail.com']
      const isAdmin =
        adminEmails.includes(session.user.email) || hasRisAdminAccess

      let data
      // For non-admin users, filter by department_id
      if (!isAdmin) {
        if (currentUser?.department_id) {
          const result = await supabase
            .from('ddm_ris_purchase_orders')
            .select(
              '*, ddm_ris_appropriation:appropriation(*),ddm_ris(quantity)',
            )
            .eq('department_id', currentUser.department_id)
            .order('po_number', { ascending: true })
          data = result.data
        } else {
          // No department_id available, show empty list
          data = []
        }
      } else {
        // Admin users see all Purchase Orders
        const result = await supabase
          .from('ddm_ris_purchase_orders')
          .select(
            '*, ddm_ris_appropriation:appropriation(*),ddm_ris(quantity, total_amount, price)',
          )
          .order('po_number', { ascending: true })
        data = result.data
      }

      // setPurchaseOrders(data)

      // Mutate the data to get the remaining quantity/amount
      const updatedData: RisPoTypes[] = []
      if (data) {
        data.forEach((item: RisPoTypes) => {
          // For Fuel type: calculate remaining amount
          if (item.type === 'Fuel') {
            const totalAmountUsed = item.ddm_ris
              ? item.ddm_ris.reduce(
                  (accumulator, ris) =>
                    accumulator +
                    Number(ris.total_amount || ris.quantity * ris.price || 0),
                  0,
                )
              : 0
            const remainingAmount = Number(item.amount) - totalAmountUsed

            // Show "Overused" if negative, otherwise show "Available"
            const amountLabel =
              remainingAmount < 0
                ? ` (Overused: ₱${Math.abs(remainingAmount).toFixed(2)})`
                : ` (Available: ₱${remainingAmount.toFixed(2)})`
            updatedData.push({
              ...item,
              remaining_quantity: amountLabel,
            })
          } else {
            // For Diesel/Gasoline: calculate remaining quantity
            const totalQuantityUsed = item.ddm_ris
              ? item.ddm_ris.reduce(
                  (accumulator, ris) => accumulator + Number(ris.quantity),
                  0,
                )
              : 0
            const remainingQuantity = Number(item.quantity) - totalQuantityUsed

            // Exclude on list if remain quantity is 0
            if (remainingQuantity > 0) {
              updatedData.push({
                ...item,
                remaining_quantity: ` (Available: ${remainingQuantity.toFixed(
                  2,
                )} Liters)`,
              })
            }
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
                0,
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
  }, [session?.user?.email, currentUser?.department_id, hasRisAdminAccess])

  // Initialize remaining liters when editing
  useEffect(() => {
    if (editData && editData.po_id && purchaseOrders.length > 0) {
      const po = purchaseOrders.find(
        (po) => po.id.toString() === editData.po_id?.toString(),
      )
      if (po) {
        setSelectedPO(po)

        // For Fuel PO type: calculate remaining amount
        if (po.type === 'Fuel') {
          const availableAmount = po.amount || 0
          // Calculate total amount used
          const totalAmountUsed = po.ddm_ris
            ? po.ddm_ris.reduce(
                (accumulator, ris) =>
                  accumulator +
                  Number(ris.total_amount || ris.quantity * ris.price || 0),
                0,
              )
            : 0
          // Add back the current record's amount since we're editing
          const currentAmount = Number(
            editData.total_amount || editData.quantity * editData.price || 0,
          )
          const remaining = availableAmount - totalAmountUsed + currentAmount
          setRemainingAmount(remaining)
          setRemainingLiters(null)
        } else {
          // For Diesel/Gasoline: calculate remaining liters
          const totalQuantityUsed = po.ddm_ris
            ? po.ddm_ris.reduce(
                (accumulator, ris) => accumulator + Number(ris.quantity),
                0,
              )
            : 0
          // Add back the current record's quantity since we're editing
          const currentQuantity = Number(editData.quantity)
          const remaining =
            Number(po.quantity) - totalQuantityUsed + currentQuantity
          setRemainingLiters(remaining)
          setRemainingAmount(null)
        }
      }
    }
  }, [editData, purchaseOrders])

  // const handleKeyDown = (event: KeyboardEvent) => {
  //   if (event.key === 'Escape') {
  //     hideModal()
  //   }
  // }
  // useEffect(() => {
  //   document.addEventListener('keydown', handleKeyDown)
  //   return () => {
  //     document.removeEventListener('keydown', handleKeyDown)
  //   }
  // }, [wrapperRef])

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
                <div className="md:grid md:grid-cols-2 md:gap-4">
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
                                  !field.value && 'text-muted-foreground',
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
                    name="po_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          Purchase Order
                        </FormLabel>
                        <Select
                          onValueChange={(value) => {
                            const po = purchaseOrders?.find(
                              (po) => po.id.toString() === value,
                            )
                            form.setValue('po_id', value)
                            setSelectedPO(po || null)
                            if (po) {
                              // Automatically set the requesting department to the P.O.'s department
                              if (po.department_id) {
                                form.setValue(
                                  'department_id',
                                  po.department_id.toString(),
                                  { shouldValidate: true },
                                )
                              }
                              if (po.type !== 'Fuel') {
                                form.setValue('type', po.type)
                              }
                              setDieselPrice(po.diesel_price || 0)
                              setGasolinePrice(po.gasoline_price || 0)

                              // For Fuel PO type: calculate remaining amount
                              if (po.type === 'Fuel') {
                                const availableAmount = po.amount || 0
                                // Calculate total amount used
                                const totalAmountUsed = po.ddm_ris
                                  ? po.ddm_ris.reduce(
                                      (accumulator, ris) =>
                                        accumulator +
                                        Number(
                                          ris.total_amount ||
                                            ris.quantity * ris.price ||
                                            0,
                                        ),
                                      0,
                                    )
                                  : 0
                                // If editing, add back the current record's amount
                                const currentAmount =
                                  editData &&
                                  editData.po_id === po.id.toString()
                                    ? Number(
                                        editData.total_amount ||
                                          editData.quantity * editData.price ||
                                          0,
                                      )
                                    : 0
                                const remaining =
                                  availableAmount -
                                  totalAmountUsed +
                                  currentAmount
                                setRemainingAmount(remaining)
                                setRemainingLiters(null)
                              } else {
                                // Calculate and store remaining liters for Diesel/Gasoline types
                                const totalQuantityUsed = po.ddm_ris
                                  ? po.ddm_ris.reduce(
                                      (accumulator, ris) =>
                                        accumulator + Number(ris.quantity),
                                      0,
                                    )
                                  : 0
                                // If editing, add back the current record's quantity
                                const currentQuantity =
                                  editData &&
                                  editData.po_id === po.id.toString()
                                    ? Number(editData.quantity)
                                    : 0
                                const remaining =
                                  Number(po.quantity) -
                                  totalQuantityUsed +
                                  currentQuantity
                                setRemainingLiters(remaining)
                                setRemainingAmount(null)
                              }
                            } else {
                              setRemainingLiters(null)
                              setRemainingAmount(null)
                              setSelectedPO(null)
                            }
                          }}
                          value={field.value?.toString() || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose P.O." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {purchaseOrders
                              ?.filter((po) => {
                                // Allow ris_admin access to see all purchase orders
                                if (hasAccess('ris_admin')) {
                                  return true
                                }
                                // Otherwise, filter by department_id
                                return po.department_id === user.department_id
                              })
                              .map((po, idx) => (
                                <SelectItem
                                  key={idx}
                                  value={po.id.toString()}>
                                  {po.po_number}-{po.type}
                                  {po.remaining_quantity}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {(() => {
                          const currentType = form.watch('type')
                          if (!selectedPO) return null

                          // For Fuel PO type: display available amount
                          if (
                            selectedPO.type === 'Fuel' &&
                            remainingAmount !== null
                          ) {
                            // Show "Overused" if negative, otherwise show "Available"
                            const isOverused = remainingAmount < 0
                            const amountLabel = isOverused
                              ? 'Overused Amount'
                              : 'Available Amount'
                            const bgColor = isOverused
                              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                              : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                            const textColor = isOverused
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-blue-700 dark:text-blue-400'

                            return (
                              <div
                                className={`flex items-center gap-2 px-3 py-2 rounded-md border ${bgColor} ${textColor} text-sm font-medium mt-2`}>
                                {isOverused ? (
                                  <AlertCircle className="h-4 w-4" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                <span>
                                  {amountLabel}: ₱
                                  {Math.abs(remainingAmount).toFixed(2)}
                                </span>
                              </div>
                            )
                          }

                          // For Diesel or Gasoline form type: display available liters
                          if (
                            (currentType === 'Diesel' ||
                              currentType === 'Gasoline') &&
                            remainingLiters !== null
                          ) {
                            // Show "Overused" if negative, otherwise show "Available"
                            const isOverused = remainingLiters < 0
                            const label = isOverused ? 'Overused' : 'Available'
                            const bgColor = isOverused
                              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                              : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                            const textColor = isOverused
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-blue-700 dark:text-blue-400'

                            return (
                              <div
                                className={`flex items-center gap-2 px-3 py-2 rounded-md border ${bgColor} ${textColor} text-sm font-medium mt-2`}>
                                {isOverused ? (
                                  <AlertCircle className="h-4 w-4" />
                                ) : (
                                  <Droplet className="h-4 w-4" />
                                )}
                                <span>
                                  {label}:{' '}
                                  {Math.abs(remainingLiters).toFixed(2)} Liters
                                </span>
                              </div>
                            )
                          }

                          return null
                        })()}
                        <FormMessage />
                        {errorMessage !== '' && (
                          <div className="flex items-center gap-2 px-3 py-2 mt-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm font-medium">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{errorMessage}</span>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
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
                          value={field.value?.toString() || ''}>
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
                      <FormItem className="flex flex-col">
                        <FormLabel className="app__form_label">
                          Vehicle
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  'w-full justify-between',
                                  !field.value && 'text-muted-foreground',
                                )}>
                                {field.value
                                  ? `${
                                      vehicles.find(
                                        (vehicle) =>
                                          vehicle.id.toString() ===
                                          field.value.toString(),
                                      )?.name
                                    }-${
                                      vehicles.find(
                                        (vehicle) =>
                                          vehicle.id.toString() ===
                                          field.value.toString(),
                                      )?.plate_number
                                    }`
                                  : 'Select Vehicle'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search vehicle..." />
                              <CommandList>
                                <CommandEmpty>No vehicle found.</CommandEmpty>
                                <CommandGroup>
                                  {vehicles.map((vehicle) => (
                                    <CommandItem
                                      value={vehicle.id}
                                      key={vehicle.id}
                                      onSelect={() => {
                                        form.setValue(
                                          'vehicle_id',
                                          field.value.toString() === vehicle.id
                                            ? ''
                                            : vehicle.id,
                                        )
                                      }}>
                                      {vehicle.name}-{vehicle.plate_number}
                                      <Check
                                        className={cn(
                                          'ml-auto',
                                          vehicle.id.toString() ===
                                            field.value.toString()
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label flex items-center gap-2">
                          <Fuel className="h-4 w-4" />
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
                            editData ? editData.type.toString() : field.value
                          }>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Diesel">
                              <div className="flex items-center gap-2">
                                <Droplet className="h-4 w-4 text-blue-500" />
                                <span>Diesel</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Gasoline">
                              <div className="flex items-center gap-2">
                                <Droplet className="h-4 w-4 text-orange-500" />
                                <span>Gasoline</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Calculation Section */}
                  <div className="md:col-span-2 pt-2 pb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Calculation Details
                      </span>
                      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => {
                      const maxQty = getMaxQuantity()
                      const fieldValue =
                        typeof field.value === 'number'
                          ? field.value
                          : parseFloat(String(field.value || 0))
                      const currentValue = fieldValue || 0
                      const isNearLimit =
                        maxQty !== null && currentValue > maxQty * 0.9
                      const exceedsLimit =
                        maxQty !== null && currentValue > maxQty

                      return (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Quantity (Liters)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder={'Enter quantity'}
                                max={maxQty !== null ? maxQty : undefined}
                                className={cn(
                                  exceedsLimit &&
                                    'border-red-500 focus-visible:ring-red-500',
                                  isNearLimit &&
                                    !exceedsLimit &&
                                    'border-yellow-500 focus-visible:ring-yellow-500',
                                )}
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (
                                    maxQty !== null &&
                                    parseFloat(value) > maxQty
                                  ) {
                                    field.onChange(maxQty.toString())
                                  } else {
                                    field.onChange(value)
                                  }
                                }}
                              />

                              <Droplet className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => {
                      const totalAmount = getTotalAmount()
                      const quantity = form.watch('quantity') || 0
                      const price = form.watch('price') || 0
                      const maxAmount =
                        selectedPO?.type === 'Fuel' ? remainingAmount : null
                      const exceedsAvailable =
                        maxAmount !== null && totalAmount > maxAmount
                      const hasTotalAmount = quantity > 0 && price > 0

                      return (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Price per Liter (₱)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                className={cn(
                                  exceedsAvailable &&
                                    'border-red-500 focus-visible:ring-red-500',
                                )}
                                {...field}
                              />
                              <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                          </FormControl>
                          {hasTotalAmount && (
                            <div
                              className={cn(
                                'mt-3 p-4 rounded-lg border-2 transition-all',
                                exceedsAvailable
                                  ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800'
                                  : 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800',
                              )}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {exceedsAvailable ? (
                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                  ) : (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  )}
                                  <span
                                    className={cn(
                                      'text-sm font-semibold',
                                      exceedsAvailable
                                        ? 'text-red-700 dark:text-red-400'
                                        : 'text-green-700 dark:text-green-400',
                                    )}>
                                    Total Amount
                                  </span>
                                </div>
                                <span
                                  className={cn(
                                    'text-lg font-bold',
                                    exceedsAvailable
                                      ? 'text-red-700 dark:text-red-400'
                                      : 'text-green-700 dark:text-green-400',
                                  )}>
                                  ₱{totalAmount.toFixed(2)}
                                </span>
                              </div>
                              {selectedPO?.type === 'Fuel' &&
                                maxAmount !== null && (
                                  <div
                                    className={cn(
                                      'mt-2 pt-2 border-t text-xs flex items-center justify-between',
                                      exceedsAvailable
                                        ? 'border-red-200 dark:border-red-800'
                                        : 'border-green-200 dark:border-green-800',
                                    )}>
                                    <span
                                      className={cn(
                                        exceedsAvailable
                                          ? 'text-red-600 dark:text-red-400'
                                          : 'text-gray-600 dark:text-gray-400',
                                      )}>
                                      {exceedsAvailable
                                        ? '⚠ Exceeds Available'
                                        : 'Available Amount'}
                                    </span>
                                    <span
                                      className={cn(
                                        'font-semibold',
                                        exceedsAvailable
                                          ? 'text-red-700 dark:text-red-400'
                                          : 'text-gray-700 dark:text-gray-300',
                                      )}>
                                      ₱{maxAmount.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="starting_balance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          Starting Balance (Liters)
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="any"
                              placeholder="0.00"
                              {...field}
                            />
                            <Droplet className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
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
                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          Destination
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Destination"
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
