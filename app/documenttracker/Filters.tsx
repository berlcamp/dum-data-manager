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
import { documentTypes } from '@/constants/TrackerConstants'
import { cn } from '@/lib/utils'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

interface FilterTypes {
  setFilterDate: (date: Date | undefined) => void
  setFilterTypes: (type: any[]) => void
  setFilterKeyword: (keyword: string) => void
}

const FormSchema = z.object({
  dateReceived: z.date().optional(),
  keyword: z.string().optional(),
})

const Filters = ({
  setFilterDate,
  setFilterTypes,
  setFilterKeyword,
}: FilterTypes) => {
  //
  const [selectedTypes, setSelectedTypes] = useState<string[] | []>([])

  const form = useForm<z.infer<typeof FormSchema>>({
    defaultValues: { dateReceived: undefined, keyword: '' },
  })

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setFilterDate(data.dateReceived)
    setFilterTypes(selectedTypes)
    setFilterKeyword(data.keyword || '')
  }

  // clear all filters
  const handleClear = () => {
    form.reset()
    setFilterDate(undefined)
    setFilterTypes([])
    setSelectedTypes([])
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
                    <FormLabel className="app__form_label">Keyword</FormLabel>
                    <Input
                      placeholder="Search keyword"
                      {...field}
                    />
                  </FormItem>
                )}
              />
            </div>
            <div className="items-center inline-flex app__filter_field_container">
              <FormField
                control={form.control}
                name="dateReceived"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="app__form_label">
                      Date Received
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-[240px] pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}>
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
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
              <FormItem className="flex flex-col">
                <FormLabel className="app__form_label">Type</FormLabel>
                <Listbox
                  value={selectedTypes}
                  onChange={setSelectedTypes}
                  multiple>
                  <div className="relative w-72">
                    <Listbox.Button className="app__listbox_btn">
                      <span className="block truncate text-xs">
                        Type: {selectedTypes.map((type) => type).join(', ')}
                      </span>
                      <span className="app__listbox_icon">
                        <ChevronDownIcon
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      </span>
                    </Listbox.Button>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0">
                      <Listbox.Options className="app__listbox_options">
                        {documentTypes.map((doc, itemIdx) => (
                          <Listbox.Option
                            key={itemIdx}
                            className={({ active }) =>
                              `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                active
                                  ? 'bg-amber-50 text-amber-900'
                                  : 'text-gray-900'
                              }`
                            }
                            value={doc.type}>
                            {({ selected }) => (
                              <>
                                <span
                                  className={`block truncate text-xs ${
                                    selected ? 'font-medium' : 'font-normal'
                                  }`}>
                                  {doc.type}
                                </span>
                                {selected ? (
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                    <CheckIcon
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                    />
                                  </span>
                                ) : null}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
              </FormItem>
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
