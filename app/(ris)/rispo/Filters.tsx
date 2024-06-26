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
import { RisAppropriationTypes } from '@/types'
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

const Filters = ({
  setFilterType,
  setFilterKeyword,
  setFilterAppropriation,
}: FilterTypes) => {
  //
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
                      Search P.O.
                    </FormLabel>
                    <Input
                      placeholder="P.O. Number / Description"
                      {...field}
                    />
                  </FormItem>
                )}
              />
            </div>
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="app__form_label">Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Gasoline">Gasoline</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
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
