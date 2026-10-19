import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Filter, Search, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

interface FilterTypes {
  setFilterKeyword: (keyword: string) => void
}

const FormSchema = z.object({
  keyword: z.string().optional(),
})

const Filters = ({ setFilterKeyword }: FilterTypes) => {
  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: { keyword: '' },
  })

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setFilterKeyword(data.keyword || '')
  }

  // clear all filters
  const handleClear = () => {
    form.reset()
    setFilterKeyword('')
  }

  const keyword = form.watch('keyword')
  const activeFilterCount = keyword ? 1 : 0

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
                      placeholder="Department name"
                      className="h-9 bg-white pl-8 dark:bg-gray-900"
                      {...field}
                    />
                  </div>
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
