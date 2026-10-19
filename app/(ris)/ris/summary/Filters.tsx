import { Button } from '@/components/ui/button'
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
import { RisAppropriationTypes, RisDepartmentTypes } from '@/types'
import { Filter, X } from 'lucide-react'
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

  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: {
      dateFrom: '',
      dateTo: '',
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
      dateFrom: '',
      dateTo: '',
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

  const watched = form.watch()
  const activeFilterCount = Object.values(watched).filter(
    (value) => value !== undefined && value !== '' && value !== 'All',
  ).length

  const renderSelect = (
    name: 'department' | 'appropriation',
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-0">
          <FormLabel className="app__form_label">{label}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value != null ? field.value.toString() : ''}>
            <FormControl>
              <SelectTrigger className="h-9 bg-white dark:bg-gray-900">
                <SelectValue placeholder="All" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {options.map((o) => (
                <SelectItem
                  key={o.value}
                  value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  )

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <FormField
              control={form.control}
              name="dateFrom"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="app__form_label">Date From</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-9 bg-white dark:bg-gray-900"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateTo"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="app__form_label">Date To</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-9 bg-white dark:bg-gray-900"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {renderSelect(
              'department',
              'Department',
              departments.map((d) => ({
                value: d.id.toString(),
                label: d.name,
              })),
            )}
            {renderSelect(
              'appropriation',
              'Appropriation',
              appropriations.map((a) => ({
                value: a.id.toString(),
                label: a.name,
              })),
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Filter
                aria-hidden="true"
                className="mr-1.5 h-4 w-4"
              />
              Apply Filters
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleClear}
              disabled={activeFilterCount === 0}>
              <X
                aria-hidden="true"
                className="mr-1.5 h-4 w-4"
              />
              Clear
              {activeFilterCount > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default Filters
