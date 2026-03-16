import { CustomButton } from '@/components/index'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSupabase } from '@/context/SupabaseProvider'
import {
  RisAppropriationTypes,
  RisDepartmentTypes,
} from '@/types'
import { endOfMonth, startOfMonth } from 'date-fns'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

interface FilterTypes {
  setFilterAppropriation: (a: string) => void
  setFilterDepartment: (d: string) => void
  setFilterDateFrom: (date: Date | undefined) => void
  setFilterDateTo: (date: Date | undefined) => void
}

const FormSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  department: z.string().optional(),
  appropriation: z.string().optional(),
})

const Filters = ({
  setFilterDepartment,
  setFilterAppropriation,
  setFilterDateFrom,
  setFilterDateTo,
}: FilterTypes) => {
  const [appropriations, setAppropriations] = useState<
    RisAppropriationTypes[] | []
  >([])
  const [departments, setDepartments] = useState<RisDepartmentTypes[] | []>([])

  const { supabase } = useSupabase()

  const now = new Date()
  const defaultDateFrom = startOfMonth(now).toISOString().slice(0, 10)
  const defaultDateTo = endOfMonth(now).toISOString().slice(0, 10)

  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: {
      dateFrom: defaultDateFrom,
      dateTo: defaultDateTo,
      department: '',
      appropriation: '',
    },
  })

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setFilterDepartment(data.department || 'All')
    setFilterAppropriation(data.appropriation || 'All')
    setFilterDateFrom(data.dateFrom ? new Date(data.dateFrom) : undefined)
    setFilterDateTo(data.dateTo ? new Date(data.dateTo) : undefined)
  }

  const handleClear = () => {
    form.reset({
      dateFrom: undefined,
      dateTo: undefined,
      department: '',
      appropriation: '',
    })
    setFilterDepartment('All')
    setFilterAppropriation('All')
    setFilterDateFrom(undefined)
    setFilterDateTo(undefined)
  }

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_appropriations')
        .select()
        .order('name', { ascending: true })
      setAppropriations(data || [])
    })()
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_departments')
        .select()
        .order('name', { ascending: true })
      setDepartments(data || [])
    })()
  }, [supabase])

  return (
    <div className="">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-wrap items-end gap-3">
            <FormField
              control={form.control}
              name="dateFrom"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="app__form_label">Date From</FormLabel>
                  <FormControl>
                    <Input type="date" className="w-[140px]" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateTo"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="app__form_label">Date To</FormLabel>
                  <FormControl>
                    <Input type="date" className="w-[140px]" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem className="w-[160px]">
                  <FormLabel className="app__form_label">Department</FormLabel>
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
                        <SelectItem key={idx} value={item.id.toString()}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="appropriation"
              render={({ field }) => (
                <FormItem className="w-[160px]">
                  <FormLabel className="app__form_label">Appropriation</FormLabel>
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
                        <SelectItem key={idx} value={item.id.toString()}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
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
