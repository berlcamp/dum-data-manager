import { CustomButton } from '@/components/index'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSupabase } from '@/context/SupabaseProvider'
import { cn } from '@/lib/utils'
import {
  RisAppropriationTypes,
  RisCaTypes,
  RisDepartmentTypes,
  RisPoTypes,
  RisVehicleTypes,
} from '@/types'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

interface FilterTypes {
  setFilterAppropriation: (a: string) => void
  setFilterVehicle: (a: string) => void
  setFilterStatus: (status: string) => void
  setFilterDepartment: (d: string) => void
  setFilterCa: (ca: string) => void
  setFilterPo: (po: string) => void
  setFilterDateFrom: (date: Date | undefined) => void
  setFilterDateTo: (date: Date | undefined) => void
  setFilterKeyword: (keyword: string) => void
}

const FormSchema = z.object({
  keyword: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  appropriation: z.string().optional(),
  vehicle: z.string().optional(),
  status: z.string().optional(),
  department: z.string().optional(),
  purchase_order: z.string().optional(),
  cash_advance: z.string().optional(),
})

const Filters = ({
  setFilterCa,
  setFilterPo,
  setFilterAppropriation,
  setFilterVehicle,
  setFilterStatus,
  setFilterDepartment,
  setFilterDateFrom,
  setFilterDateTo,
  setFilterKeyword,
}: FilterTypes) => {
  const [appropriations, setAppropriations] = useState<
    RisAppropriationTypes[] | []
  >([])
  const [departments, setDepartments] = useState<RisDepartmentTypes[] | []>([])
  const [purchaseOrders, setPurchaseOrders] = useState<RisPoTypes[] | []>([])
  const [cashAdvances, setCashAdvances] = useState<RisCaTypes[] | []>([])
  const [vehicles, setVehicles] = useState<RisVehicleTypes[] | []>([])

  const { supabase } = useSupabase()

  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: {
      dateFrom: undefined,
      dateTo: undefined,
      appropriation: '',
      vehicle: '',
      status: '',
      department: '',
      purchase_order: '',
      cash_advance: '',
      keyword: '',
    },
  })

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setFilterCa(data.cash_advance || 'All')
    setFilterPo(data.purchase_order || 'All')
    setFilterAppropriation(data.appropriation || 'All')
    setFilterVehicle(data.vehicle || 'All')
    setFilterStatus(data.status || 'All')
    setFilterDepartment(data.department || 'All')
    setFilterDateFrom(data.dateFrom)
    setFilterDateTo(data.dateTo)
    setFilterKeyword(data.keyword || '')
  }

  // clear all filters
  const handleClear = () => {
    form.reset()
    setFilterPo('All')
    setFilterCa('All')
    setFilterAppropriation('All')
    setFilterVehicle('All')
    setFilterStatus('All')
    setFilterDepartment('All')
    setFilterDateFrom(undefined)
    setFilterDateTo(undefined)
    setFilterKeyword('')
  }

  useEffect(() => {
    // Fetch Appropriations
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_appropriations')
        .select()
        .order('name', { ascending: true })
      setAppropriations(data)
    })()
    // Fetch Departments
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_departments')
        .select()
        .order('name', { ascending: true })
      setDepartments(data)
    })()
    // Fetch POs
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_purchase_orders')
        .select()
        .order('po_number', { ascending: true })
      setPurchaseOrders(data)
    })()
    // Fetch CAa
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_cash_advances')
        .select()
        .order('ca_number', { ascending: true })
      setCashAdvances(data)
    })()
    // Fetch vehicles
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_vehicles')
        .select()
        .order('name', { ascending: true })
      setVehicles(data)
    })()
    console.log('filter data fetched successfully')
  }, [])

  return (
    <div className="">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="items-center space-x-2 space-y-1">
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="keyword"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="app__form_label">Search</FormLabel>
                    <Input
                      placeholder="Requester / Purpose"
                      className="w-[200px]"
                      {...field}
                    />
                  </FormItem>
                )}
              />
            </div>
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="app__form_label">Date From</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-[140px] pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}>
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>From</span>
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
                  </FormItem>
                )}
              />
            </div>
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="app__form_label">Date To</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-[140px] pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}>
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>To</span>
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
                  </FormItem>
                )}
              />
            </div>
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="purchase_order"
                render={({ field }) => (
                  <FormItem className="w-[140px]">
                    <FormLabel className="app__form_label">P.O.</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                      defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {purchaseOrders?.map((a, i) => (
                          <SelectItem
                            key={i}
                            value={a.id.toString()}>
                            {a.po_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="cash_advance"
                render={({ field }) => (
                  <FormItem className="w-[140px]">
                    <FormLabel className="app__form_label">C.A.</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                      defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cashAdvances?.map((a, i) => (
                          <SelectItem
                            key={i}
                            value={a.id.toString()}>
                            {a.ca_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem className="w-[140px]">
                    <FormLabel className="app__form_label">
                      Departments
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                      defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments?.map((item, idx) => (
                          <SelectItem
                            key={idx}
                            value={item.id.toString()}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="appropriation"
                render={({ field }) => (
                  <FormItem className="w-[140px]">
                    <FormLabel className="app__form_label">
                      Appropriation
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                      defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {appropriations?.map((item, idx) => (
                          <SelectItem
                            key={idx}
                            value={item.id.toString()}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="vehicle"
                render={({ field }) => (
                  <FormItem className="w-[140px]">
                    <FormLabel className="app__form_label">Vehicle</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                      defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles?.map((item, idx) => (
                          <SelectItem
                            key={idx}
                            value={item.id.toString()}>
                            {item.name} - {item.plate_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="w-[140px]">
                    <FormLabel className="app__form_label">Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                      defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <CustomButton
              containerStyles="app__btn_green"
              title="Apply Filter"
              btnType="submit"
              handleClick={form.handleSubmit(onSubmit)}
            />
            <CustomButton
              containerStyles="app__btn_gray"
              title="Clear Filter"
              btnType="button"
              handleClick={handleClear}
            />
          </div>
        </form>
      </Form>
    </div>
  )
}

export default Filters
