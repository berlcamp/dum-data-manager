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
import { RisAppropriationTypes } from '@/types'
import { Filter, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

interface FilterTypes {
  setFilterType: (type: string) => void
  setFilterKeyword: (keyword: string) => void
  setFilterAppropriation: (a: string) => void
}

const FormSchema = z.object({
  type: z.string().optional(),
  keyword: z.string().optional(),
  appropriation: z.string().optional(),
})

const typeOptions = ['Fuel', 'Gasoline', 'Diesel', 'Oil and Lubricants']

const Filters = ({
  setFilterType,
  setFilterKeyword,
  setFilterAppropriation,
}: FilterTypes) => {
  const [appropriations, setAppropriations] = useState<
    RisAppropriationTypes[] | []
  >([])

  const { supabase } = useSupabase()

  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: { type: '', keyword: '', appropriation: '' },
  })

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setFilterType(data.type || 'All')
    setFilterAppropriation(data.appropriation || 'All')
    setFilterKeyword(data.keyword || '')
  }

  // clear all filters
  const handleClear = () => {
    form.reset()
    setFilterType('All')
    setFilterAppropriation('All')
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
  }, [])

  const watched = form.watch()
  const activeFilterCount = Object.values(watched).filter(
    (value) => value !== undefined && value !== '' && value !== 'All',
  ).length

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <FormField
              control={form.control}
              name="keyword"
              render={({ field }) => (
                <FormItem className="min-w-0 sm:col-span-2">
                  <FormLabel className="app__form_label">Search</FormLabel>
                  <div className="relative">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      placeholder="Department Allocation no. or description"
                      className="h-9 bg-white pl-8 dark:bg-gray-900"
                      {...field}
                    />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="app__form_label">Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger className="h-9 bg-white dark:bg-gray-900">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      {typeOptions.map((t) => (
                        <SelectItem
                          key={t}
                          value={t}>
                          {t}
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
                <FormItem className="min-w-0">
                  <FormLabel className="app__form_label">
                    Appropriation
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value?.toString() ?? ''}>
                    <FormControl>
                      <SelectTrigger className="h-9 bg-white dark:bg-gray-900">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      {appropriations?.map((item) => (
                        <SelectItem
                          key={item.id}
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
