import { CustomButton } from '@/components/index'
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { reservationUnitCategories } from '@/constants/TrackerConstants'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

interface FilterTypes {
  setFilterKeyword: (keyword: string) => void
  setFilterCategory: (category: string) => void
}

const ALL_CATEGORIES = 'all'

const FormSchema = z.object({
  keyword: z.string().optional(),
  category: z.string().optional(),
})

const Filters = ({ setFilterKeyword, setFilterCategory }: FilterTypes) => {
  //
  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: { keyword: '', category: ALL_CATEGORIES },
  })

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setFilterKeyword(data.keyword || '')
    setFilterCategory(
      !data.category || data.category === ALL_CATEGORIES ? '' : data.category,
    )
  }

  // clear all filters
  const handleClear = () => {
    form.reset({ keyword: '', category: ALL_CATEGORIES })
    setFilterKeyword('')
    setFilterCategory('')
  }

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
                    <FormLabel className="app__form_label">
                      Search Units
                    </FormLabel>
                    <Input
                      placeholder="Search Unit Name, Category or Plate Number"
                      className="w-[340px]"
                      {...field}
                    />
                  </FormItem>
                )}
              />
            </div>
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="app__form_label">Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_CATEGORIES}>
                          All Categories
                        </SelectItem>
                        {reservationUnitCategories.map((category) => (
                          <SelectItem
                            key={category}
                            value={category}>
                            {category}
                          </SelectItem>
                        ))}
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
