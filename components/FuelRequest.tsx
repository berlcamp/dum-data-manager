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
import { z } from 'zod'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

// Redux imports
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
import { cn } from '@/lib/utils'

// Redux imports

import { Input } from '@/components/ui/input'
import { useSupabase } from '@/context/SupabaseProvider'
import { RisDepartmentCodeTypes, RisVehicleTypes } from '@/types'
import type { PortalBalance } from '@/utils/portal-fuel'
import { startingBalanceSchema } from '@/utils/ris-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Download,
  Droplet,
} from 'lucide-react'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { KeyboardEvent, useEffect, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'

pdfMake.vfs = (pdfFonts as any).pdfMake?.vfs || (pdfFonts as any).vfs

const FormSchema = z.object({
  requester: z.string().min(1, {
    message: 'Requester is required.',
  }),
  destination: z.string().min(1, {
    message: 'Destination is required.',
  }),
  vehicle_id: z.coerce.string().min(1, {
    message: 'Vehicle is required.',
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
  starting_balance: startingBalanceSchema(true),
  purpose: z.string().min(1, {
    message: 'Purpose is required.',
  }),
  date_requested: z.date({
    required_error: 'Date is required.',
  }),
})

export default function FuelRequest() {
  const [vehicles, setVehicles] = useState<RisVehicleTypes[] | []>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [code, setCode] = useState('')
  const [selectedItem, setSelectedItem] =
    useState<RisDepartmentCodeTypes | null>(null)
  // Computed server-side — the portal is anonymous and cannot read ddm_ris.
  const [balance, setBalance] = useState<PortalBalance | null>(null)
  const [downloadingHistory, setDownloadingHistory] = useState(false)
  const [formError, setFormError] = useState('')

  const { supabase } = useSupabase()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      requester: '',
      destination: '',
      vehicle_id: '',
      type: '',
      quantity: 0,
      starting_balance: undefined,
      purpose: '',
      date_requested: new Date(),
    },
  })

  // Validation failed — say so next to the button that was just clicked,
  // naming the fields, since the per-field messages are further up the form.
  const onInvalid = (errors: FieldErrors<z.infer<typeof FormSchema>>) => {
    const messages = Object.values(errors)
      .map((error) => error?.message)
      .filter(Boolean)

    setFormError(
      messages.length > 0
        ? (messages as string[]).join(' ')
        : 'Please complete all the required fields.'
    )
  }

  const onSubmit = async (formdata: z.infer<typeof FormSchema>) => {
    if (!selectedItem) return

    setFormError('')

    try {
      // The balance is re-checked on the server before the R.I.S. is created —
      // the figure on screen may be stale and the browser cannot read ddm_ris.
      const res = await fetch('/api/fuelrequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          requester: formdata.requester,
          destination: formdata.destination,
          vehicle_id: formdata.vehicle_id,
          type: formdata.type,
          quantity: formdata.quantity,
          starting_balance: formdata.starting_balance,
          purpose: formdata.purpose,
          date_requested: format(
            new Date(formdata.date_requested),
            'yyyy-MM-dd'
          ),
        }),
        cache: 'no-store',
      })
      const result = await res.json()

      if (result.error_message !== '') {
        setErrorMessage(result.error_message)
        return
      }

      setErrorMessage('')
      setSuccessMessage(
        'Request successfully submitted and waiting for approval. Once approved, you can go to MMO and Look for Arfel.'
      )
      setSelectedItem(null)
      setBalance(null)
    } catch (error) {
      console.error('error', error)
      setErrorMessage('Something went wrong. Please try again.')
    }
  }

  const handleSubmitCode = async () => {
    // The remaining balance depends on ddm_ris, which anonymous visitors cannot
    // read, so the lookup runs on the server with the service role.
    const res = await fetch('/api/fuelcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      cache: 'no-store',
    })
    const result = await res.json()

    if (result.error_message === '' && result.item) {
      setErrorMessage('')
      setSelectedItem(result.item as RisDepartmentCodeTypes)
      setBalance(result.balance)
    } else {
      setSelectedItem(null)
      setBalance(null)
      setErrorMessage(result.error_message || 'This code does not exist')
    }
  }

  const handleDownloadHistory = async () => {
    if (!code || downloadingHistory) return

    setDownloadingHistory(true)
    try {
      const res = await fetch('/api/fuelhistory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        cache: 'no-store',
      })
      const result = await res.json()

      if (result.error_message) {
        setErrorMessage(result.error_message)
        return
      }

      const items: {
        date_requested: string
        requester: string
        destination: string
        vehicle: string
        type: string
        quantity: number
        price: number
        amount: number
        status: string
      }[] = result.items ?? []

      const tableBody: any[] = [
        [
          { text: 'Date', style: 'tableHeader' },
          { text: 'Requester', style: 'tableHeader' },
          { text: 'Vehicle', style: 'tableHeader' },
          { text: 'Destination', style: 'tableHeader' },
          { text: 'Type', style: 'tableHeader' },
          { text: 'Qty (L)', style: 'tableHeader' },
          { text: 'Price', style: 'tableHeader' },
          { text: 'Amount', style: 'tableHeader' },
          { text: 'Status', style: 'tableHeader' },
        ],
      ]

      for (const item of items) {
        tableBody.push([
          item.date_requested
            ? format(new Date(item.date_requested), 'MM/dd/yyyy')
            : '',
          item.requester || '',
          item.vehicle || '',
          item.destination || '',
          item.type || '',
          Number(item.quantity ?? 0).toFixed(2),
          Number(item.price ?? 0).toFixed(4),
          Number(item.amount ?? 0).toFixed(4),
          item.status || '',
        ])
      }

      const docDefinition: any = {
        pageOrientation: 'landscape',
        pageSize: 'A4',
        content: [
          { text: 'FUEL REQUEST TRANSACTION HISTORY', style: 'header' },
          {
            text: `Code: ${code}${
              selectedItem?.department?.name
                ? `   •   Department: ${selectedItem.department.name}`
                : ''
            }${
              selectedItem?.purchase_order?.po_number
                ? `   •   P.O.: ${selectedItem.purchase_order.po_number}`
                : ''
            }`,
            style: 'subHeader',
          },
          items.length === 0
            ? {
                text: 'No fuel requests have been submitted using this code yet.',
                margin: [0, 10, 0, 0],
              }
            : {
                table: {
                  headerRows: 1,
                  widths: [
                    'auto',
                    '*',
                    '*',
                    '*',
                    'auto',
                    'auto',
                    'auto',
                    'auto',
                    'auto',
                  ],
                  body: tableBody,
                },
                layout: {
                  hLineWidth: () => 0.5,
                  vLineWidth: () => 0.5,
                  hLineColor: () => '#000000',
                  vLineColor: () => '#000000',
                },
              },
        ],
        styles: {
          header: {
            fontSize: 14,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 5],
          },
          subHeader: {
            fontSize: 9,
            alignment: 'center',
            margin: [0, 0, 0, 10],
          },
          tableHeader: {
            bold: true,
            alignment: 'center',
          },
        },
        defaultStyle: {
          fontSize: 8,
          alignment: 'center',
        },
      }

      pdfMake.createPdf(docDefinition).download(`FuelRequestHistory_${code}.pdf`)
    } catch (error) {
      console.error('error', error)
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setDownloadingHistory(false)
    }
  }

  const handleCancel = async () => {
    setErrorMessage('')
    setFormError('')
    setCode('')
    setSelectedItem(null)
    setBalance(null)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      handleSubmitCode()
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
  }, [])

  return (
    <>
      <div>
        <div className="mt-12 flex mb-20 flex-col space-y-6 items-center">
          {successMessage === '' && (
            <div className="text-center text-xl font-medium uppercase">
              Fuel Request
            </div>
          )}
          {!selectedItem && successMessage === '' && (
            <div className="w-[440px] p-1 border bg-white flex flex-col space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter Your Request Code"
                    className="p-4 w-full text-center outline-none text-xl text-gray-700 font-medium"
                  />
                  {code !== '' && (
                    <CustomButton
                      containerStyles="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-500 border border-emerald-600 font-bold px-4 py-2 text-white rounded-sm"
                      title="Submit"
                      btnType="button"
                      handleClick={handleSubmitCode}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          {errorMessage !== '' && (
            <div className="text-red-500 text-lg font-semibold">
              {errorMessage}
            </div>
          )}
          {successMessage !== '' && (
            <div className="text-green-700 font-bold">{successMessage}</div>
          )}
          {selectedItem && (
            <div className="w-4/5 md:w-1/2 p-4 border flex flex-col space-y-4 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium text-gray-600">
                      Request Code:{' '}
                    </div>
                    <div className="text-base text-gray-700 font-bold">
                      {code}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium text-gray-600">
                      Department:{' '}
                    </div>
                    <div className="text-base text-gray-700 font-bold">
                      {selectedItem.department.name}
                    </div>
                  </div>
                  {selectedItem.purchase_order?.po_number && (
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium text-gray-600">
                        P.O.:{' '}
                      </div>
                      <div className="text-base text-gray-700 font-bold">
                        {selectedItem.purchase_order.po_number}
                      </div>
                    </div>
                  )}
                  {balance && (
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium text-gray-600">
                        {balance.label}:{' '}
                      </div>
                      <div
                        className={`text-base font-bold ${
                          balance.depleted ? 'text-red-600' : 'text-emerald-700'
                        }`}>
                        {balance.value}
                      </div>
                    </div>
                  )}
                </div>
                <CustomButton
                  btnType="button"
                  title={
                    downloadingHistory
                      ? 'Preparing PDF...'
                      : 'Download Transaction History (PDF)'
                  }
                  isDisabled={downloadingHistory}
                  handleClick={handleDownloadHistory}
                  containerStyles="app__btn_blue ml-auto w-auto shrink-0 inline-flex items-center gap-2 whitespace-nowrap"
                  rightIcon={<Download className="h-4 w-4" />}
                />
              </div>
              {balance?.depleted ? (
                <div className="w-full border border-red-200 bg-red-50 p-4 space-y-3">
                  <div className="text-red-700 font-bold">
                    No Remaining Balance
                  </div>
                  <div className="text-sm text-red-700">
                    This P.O. has already used up its full allocation, so fuel
                    requests can no longer be submitted with this code. Please
                    contact your department head or MMO.
                  </div>
                  <CustomButton
                    btnType="button"
                    title="Enter Another Code"
                    handleClick={handleCancel}
                    containerStyles="app__btn_gray"
                  />
                </div>
              ) : (
                <div className="w-full">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
                      className="space-y-4">
                      <div className="space-y-4">
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
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="date_requested"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
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
                                        !field.value && 'text-muted-foreground'
                                      )}>
                                      {field.value
                                        ? `${
                                            vehicles.find(
                                              (vehicle) =>
                                                vehicle.id.toString() ===
                                                field.value.toString()
                                            )?.name
                                          }-${
                                            vehicles.find(
                                              (vehicle) =>
                                                vehicle.id.toString() ===
                                                field.value.toString()
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
                                      <CommandEmpty>
                                        No vehicle found.
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {vehicles.map((vehicle) => (
                                          <CommandItem
                                            value={vehicle.id}
                                            key={vehicle.id}
                                            onSelect={() => {
                                              form.setValue(
                                                'vehicle_id',
                                                field.value.toString() ===
                                                  vehicle.id
                                                  ? ''
                                                  : vehicle.id
                                              )
                                            }}>
                                            {vehicle.name}-{vehicle.plate_number}
                                            <Check
                                              className={cn(
                                                'ml-auto',
                                                vehicle.id.toString() ===
                                                  field.value.toString()
                                                  ? 'opacity-100'
                                                  : 'opacity-0'
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
                              <FormLabel className="app__form_label">
                                Fuel Type
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose Type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(selectedItem.purchase_order.type === 'Fuel' ||
                                    selectedItem.purchase_order.type ===
                                      'Diesel') && (
                                    <SelectItem value="Diesel">Diesel</SelectItem>
                                  )}
                                  {(selectedItem.purchase_order.type === 'Fuel' ||
                                    selectedItem.purchase_order.type ===
                                      'Gasoline') && (
                                    <SelectItem value="Gasoline">
                                      Gasoline
                                    </SelectItem>
                                  )}
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
                                    value={field.value ?? ''}
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
                      <div className="space-y-4">
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

                      {/* The per-field messages sit mid-form, so a blocked
                          submit also reports itself next to the button. */}
                      {formError !== '' && (
                        <div className="border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                          {formError}
                        </div>
                      )}

                      <div className="app__modal_footer">
                        <CustomButton
                          btnType="button"
                          isDisabled={form.formState.isSubmitting}
                          title={
                            form.formState.isSubmitting ? 'Saving...' : 'Cancel'
                          }
                          handleClick={handleCancel}
                          containerStyles="app__btn_gray"
                        />
                        <CustomButton
                          btnType="submit"
                          isDisabled={form.formState.isSubmitting}
                          title={
                            form.formState.isSubmitting ? 'Saving...' : 'Submit'
                          }
                          containerStyles="app__btn_green"
                        />
                      </div>
                    </form>
                  </Form>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-auto bg-gray-800 p-4 text-white fixed bottom-0 w-full">
          <div className="text-white text-center text-xs">&copy; DDM v1.0</div>
        </div>
      </div>
    </>
  )
}
