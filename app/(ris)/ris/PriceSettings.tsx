'use client'
import { CustomButton } from '@/components/index'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useSupabase } from '@/context/SupabaseProvider'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
// Redux imports
import { useFilter } from '@/context/FilterContext'
import { useEffect, useRef } from 'react'

// Redux imports

import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

const FormSchema = z.object({
  gasoline: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Gasoline is required.',
      invalid_type_error: 'Gasoline is required..',
    })
    .gte(1, {
      message: 'Gasoline price is required...',
    }),
  diesel: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Diesel is required.',
      invalid_type_error: 'Diesel is required..',
    })
    .gte(1, {
      message: 'Diesel price is required...',
    }),
})

interface ModalProps {
  refetchPrice: () => void
  hideModal: () => void
}

export default function PriceSettings({ hideModal, refetchPrice }: ModalProps) {
  const { setToast } = useFilter()
  const { supabase } = useSupabase()

  const wrapperRef = useRef<HTMLDivElement>(null)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      gasoline: 0,
      diesel: 0,
    },
  })

  const onSubmit = async (formdata: z.infer<typeof FormSchema>) => {
    await handleAddPrice(formdata)
  }

  const handleAddPrice = async (formdata: z.infer<typeof FormSchema>) => {
    try {
      const newData = {
        date: format(new Date(), 'yyyy-MM-dd'),
        diesel: formdata.diesel,
        gasoline: formdata.gasoline,
      }

      const { data, error } = await supabase
        .from('ddm_ris_prices')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // hide the modal
      hideModal()
      // refetch prices
      refetchPrice()
    } catch (error) {
      console.error('error', error)
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      hideModal()
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [wrapperRef])

  return (
    <div
      ref={wrapperRef}
      className="app__modal_wrapper">
      <div className="app__modal_wrapper2">
        <div className="app__modal_wrapper3">
          <div className="app__modal_header">
            <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
              Fuel Price Details
            </h5>
            <CustomButton
              containerStyles="app__btn_gray"
              title="Close"
              btnType="button"
              handleClick={hideModal}
            />
          </div>

          <div className="app__modal_body">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="md:grid md:grid-cols-2 md:gap-4">
                  <FormField
                    control={form.control}
                    name="diesel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          Diesel Price per Liter
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Diesel price per Liter"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gasoline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          Gasoline Price per Liter
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Gasoline price per Liter"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <hr className="my-4" />
                <div className="app__modal_footer">
                  <CustomButton
                    btnType="submit"
                    isDisabled={form.formState.isSubmitting}
                    title={form.formState.isSubmitting ? 'Saving...' : 'Submit'}
                    containerStyles="app__btn_green"
                  />
                  <CustomButton
                    btnType="button"
                    isDisabled={form.formState.isSubmitting}
                    title="Cancel"
                    handleClick={hideModal}
                    containerStyles="app__btn_gray"
                  />
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}
