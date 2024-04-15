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
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const barangays = [
  'BAG-ONG KAUSWAGAN',
  'BAG-ONG SILANG',
  'BAGONG VALENCIA',
  'BUCAYAN',
  'CALUMANGGI',
  'CANIBONGAN',
  'CARIDAD',
  'DANLUGAN',
  'DAPIWAK',
  'DATU TUTUKAN',
  'DILUD',
  'DITULAN',
  'DULIAN',
  'DULOP',
  'GUINTANANAN',
  'GUITRAN',
  'GUMPINGAN',
  'LA FORTUNA',
  'LABANGON',
  'LIBERTAD',
  'LICABANG',
  'LIPAWAN',
  'LOWER LANDING',
  'LOWER TIMONAN',
  'MACASING',
  'MAHAYAHAY',
  'MALAGALAD',
  'MANLABAY',
  'MARALAG',
  'MARANGAN',
  'NEW BASAK',
  'SAAD',
  'SALVADOR',
  'SAN JUAN',
  'SAN PABLO',
  'SAN PEDRO',
  'SAN VICENTE',
  'SINONOK',
  'SINOTE',
  'SUNOP',
  'TAGUN',
  'TAMURAYAN',
  'UPPER LANDING',
  'UPPER TIMONAN',
]

interface FilterTypes {
  setFilterBarangay: (barangay: string) => void
}

const FormSchema = z.object({
  barangay: z.string(),
})

const Filters = ({ setFilterBarangay }: FilterTypes) => {
  //
  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: { barangay: 'All' },
  })

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setFilterBarangay(data.barangay !== 'All' ? data.barangay : '')
  }

  // clear all filters
  const handleClear = () => {
    form.reset()
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
