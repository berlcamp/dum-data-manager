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
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react'
import { KeyboardEvent, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

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

  const { supabase } = useSupabase()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      requester: '',
      destination: '',
      vehicle_id: '',
      type: '',
      quantity: 0,
      purpose: '',
      date_requested: new Date(),
    },
  })

  const onSubmit = async (formdata: z.infer<typeof FormSchema>) => {
    if (!selectedItem) return

    try {
      const price =
        formdata.type === 'Diesel'
          ? selectedItem.purchase_order.diesel_price
          : selectedItem.purchase_order.gasoline_price

      const newData = {
        requester: formdata.requester,
        destination: formdata.destination,
        department_id: selectedItem.department_id,
        po_id: selectedItem.po_id,
        vehicle_id: formdata.vehicle_id,
        transaction_type: 'Purchase Order',
        origin: 'Portal',
        type: formdata.type,
        quantity: formdata.quantity,
        price: price,
        purpose: formdata.purpose,
        date_requested: format(new Date(formdata.date_requested), 'yyyy-MM-dd'),
      }

      const { data, error } = await supabase.from('ddm_ris').insert(newData)

      if (error) throw new Error(error.message)

      setErrorMessage('')
      setSuccessMessage(
        'Request successfully submitted and waiting for approval. Once approved, you can go to MMO and Look for Arfel.'
      )
      setSelectedItem(null)
    } catch (error) {
      console.error('error', error)
    }
  }

  const handleSubmitCode = async () => {
    const { data } = await supabase
      .from('ddm_ris_department_codes')
      .select('*, purchase_order:po_id(*), department:department_id(*)')
      .eq('code', code)
      .eq('status', 'Active')
    if (code && data.length > 0) {
      setErrorMessage('')
      setSelectedItem(data[0])
      console.log(code, data[0])
    } else {
      setSelectedItem(null)
      setErrorMessage('This code does not exist')
    }
  }

  const handleCancel = async () => {
    setErrorMessage('')
    setCode('')
    setSelectedItem(null)
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
              </div>
              <div className="w-full">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
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
