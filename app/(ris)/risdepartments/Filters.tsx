import { CustomButton } from '@/components/index'
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

interface FilterTypes {
  setFilterKeyword: (keyword: string) => void
}

const FormSchema = z.object({
  keyword: z.string().optional(),
})

const Filters = ({ setFilterKeyword }: FilterTypes) => {
  //
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
                      Search Department
                    </FormLabel>
                    <Input
                      placeholder="Search Department Name"
                      className="w-[340px]"
                      {...field}
                    />
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
