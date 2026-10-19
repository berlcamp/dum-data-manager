'use client'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
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
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { useFilter } from '@/context/FilterContext'
import { useEffect, useRef } from 'react'

// Redux imports
import { useDispatch, useSelector } from 'react-redux'

import { Input } from '@/components/ui/input'
import type { RisAppropriationTypes } from '@/types'
import { Loader2, Save, X } from 'lucide-react'

const FormSchema = z.object({
  appropriation_name: z.string().min(1, {
    message: 'Appropriation Name is required.',
  }),
  amount: z.coerce // use coerce to cast to string to number https://stackoverflow.com/questions/76878664/react-hook-form-and-zod-inumber-input
    .number({
      required_error: 'Amount is required.',
      invalid_type_error: 'Amount is required..',
    })
    .gte(1, {
      message: 'Amount is required...',
    }),
})

interface ModalProps {
  hideModal: () => void
  editData: RisAppropriationTypes | null
}

export default function AddEditModal({ hideModal, editData }: ModalProps) {
  const { setToast } = useFilter()
  const { supabase } = useSupabase()

  const wrapperRef = useRef<HTMLDivElement>(null)

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      appropriation_name: editData ? editData.name : '',
      amount: editData ? editData.amount : 0,
    },
  })

  const onSubmit = async (formdata: z.infer<typeof FormSchema>) => {
    if (editData) {
      await handleUpdate(formdata)
    } else {
      await handleCreate(formdata)
    }
  }

  const handleCreate = async (formdata: z.infer<typeof FormSchema>) => {
    try {
      const newData = {
        name: formdata.appropriation_name,
        amount: formdata.amount,
      }

      const { data, error } = await supabase
        .from('ddm_ris_appropriations')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      // Append new data in redux
      const updatedData = {
        ...newData,
        id: data[0].id,
      }
      dispatch(updateList([updatedData, ...globallist]))

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // hide the modal
      hideModal()
    } catch (error) {
      console.error('error', error)
    }
  }

  const handleUpdate = async (formdata: z.infer<typeof FormSchema>) => {
    if (!editData) return

    try {
      const newData = {
        name: formdata.appropriation_name,
        amount: formdata.amount,
      }

      const { data, error } = await supabase
        .from('ddm_ris_appropriations')
        .update(newData)
        .eq('id', editData.id)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        ...newData,
        id: editData.id,
      }
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      items[foundIndex] = { ...items[foundIndex], ...updatedData }
      dispatch(updateList(items))

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // hide the modal
      hideModal()
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

  const isSubmitting = form.formState.isSubmitting

  return (
    <div
      ref={wrapperRef}
      className="app__modal_wrapper">
      <div className="app__modal_wrapper2">
        <div className="app__modal_wrapper3">
          <div className="app__modal_header">
            <div>
              <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
                {editData ? 'Edit Appropriation' : 'New Appropriation'}
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Budget source that Department Allocations draw from
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              aria-label="Close"
              onClick={hideModal}>
              <X
                aria-hidden="true"
                className="h-4 w-4"
              />
            </Button>
          </div>

          <div className="app__modal_body">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="appropriation_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          Appropriation Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Fuel, Oil and Lubricants"
                            className="h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          Allocated Amount
                        </FormLabel>
                        <div className="relative">
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            ₱
                          </span>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="any"
                              placeholder="0.00"
                              className="h-9 pl-7 tabular-nums"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormDescription className="text-xs">
                          Total budget for this appropriation, up to 2 decimal
                          places. Approved R.I.S. are deducted from it.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="app__modal_footer mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={hideModal}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="bg-emerald-600 text-white hover:bg-emerald-700">
                    {isSubmitting ? (
                      <Loader2
                        aria-hidden="true"
                        className="mr-1.5 h-4 w-4 animate-spin"
                      />
                    ) : (
                      <Save
                        aria-hidden="true"
                        className="mr-1.5 h-4 w-4"
                      />
                    )}
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}
