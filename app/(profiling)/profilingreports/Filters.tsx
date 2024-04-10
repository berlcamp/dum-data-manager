import { CustomButton } from '@/components/index'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { profileCategories } from '@/constants/TrackerConstants'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const barangays = [
  'Bag-ong Valencia',
  'Bag-ong Kauswagan',
  'Bag-ong Silangan',
  'Bucayan',
  'Calumanggi',
  'Canibongan',
  'Caridad',
  'Danlugan',
  'Dapiwak',
  'Datu Totocan',
  'Dilud',
  'Ditulan',
  'Dulian',
  'Dulop',
  'Guintananan',
  'Guitran',
  'Gumpingan',
  'La Fortuna',
  'Labangon',
  'Libertad',
  'Licabang',
  'Lipawan',
  'Lower Landing',
  'Lower Timonan',
  'Macasing',
  'Mahayahay',
  'Manlabay',
  'Malagalad',
  'Maralag',
  'Marangan',
  'New Basak',
  'Saad',
  'Salvador',
  'San Juan',
  'San Pablo (Poblacion)',
  'San Pedro (Poblacion)',
  'San Vicente',
  'Senote',
  'Sinonok',
  'Sunop',
  'Tagun',
  'Tamurayan',
  'Upper Landing',
  'Upper Timonan',
]

interface FilterTypes {
  setFilterCategory: (category: string) => void
  setFilterBarangay: (barangay: string) => void
}

const FormSchema = z.object({
  category: z.string(),
  barangay: z.string(),
})

const Filters = ({ setFilterCategory, setFilterBarangay }: FilterTypes) => {
  //
  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: { category: 'All', barangay: 'All' },
  })

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setFilterCategory(data.category !== 'All' ? data.category : '')
    setFilterBarangay(data.barangay !== 'All' ? data.barangay : '')
  }

  // clear all filters
  const handleClear = () => {
    form.reset()
    setFilterCategory('')
    setFilterBarangay('')
  }

  return (
    <div className="">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="items-center space-x-2 space-y-1">
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="barangay"
                render={({ field }) => (
                  <FormItem className="w-[340px]">
                    <FormLabel className="app__form_label">Barangay</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Barangay" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        {barangays.map((barangay, index) => (
                          <SelectItem
                            key={index}
                            value={barangay}>
                            {barangay}
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
                name="category"
                render={({ field }) => (
                  <FormItem className="w-[340px]">
                    <FormLabel className="app__form_label">Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Barangay" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        {profileCategories.map((c, index) => (
                          <SelectItem
                            key={index}
                            value={c}>
                            {c}
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