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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trucks } from '@/constants/TrackerConstants'
import type { RisVehicleTypes } from '@/types'
import { Loader2, X } from 'lucide-react'

const FormSchema = z.object({
  vehicle_name: z.string().min(1, {
    message: 'Name is required.',
  }),
  plate_number: z.string().min(1, {
    message: 'Plate No is required.',
  }),
  category: z.string().min(1, {
    message: 'Category required.',
  }),
})

interface ModalProps {
  hideModal: () => void
  editData: RisVehicleTypes | null
}

export default function AddEditModal({ hideModal, editData }: ModalProps) {
  const { setToast } = useFilter()
  const { supabase, session } = useSupabase()

  const wrapperRef = useRef<HTMLDivElement>(null)

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      vehicle_name: editData ? editData.name : '',
      plate_number: editData ? editData.plate_number : '',
      category: editData?.category ?? '',
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
        name: formdata.vehicle_name,
        plate_number: formdata.plate_number,
        category: formdata.category,
      }

      const { data, error } = await supabase
        .from('ddm_ris_vehicles')
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
      setToast('error', 'Something went wrong. Please try again.')
    }
  }

  const handleUpdate = async (formdata: z.infer<typeof FormSchema>) => {
    if (!editData) return

    try {
      const newData = {
        name: formdata.vehicle_name,
        plate_number: formdata.plate_number,
        category: formdata.category,
      }

      const { data, error } = await supabase
        .from('ddm_ris_vehicles')
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
      setToast('error', 'Something went wrong. Please try again.')
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
                {editData ? 'Edit Vehicle' : 'New Vehicle'}
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Vehicles listed here can be selected on R.I.S. fuel requests.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Close"
              disabled={isSubmitting}
              onClick={hideModal}
              className="h-8 w-8 p-0">
              <X
                aria-hidden="true"
                className="h-4 w-4"
              />
            </Button>
          </div>

          <div className="app__modal_body">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="vehicle_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          Vehicle Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Toyota Hilux"
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
                    name="plate_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          Plate Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. ABC 1234"
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="app__form_label">
                          Category
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {trucks.map((t, i) => (
                              <SelectItem
                                key={i}
                                value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Choose the type that best describes this vehicle.
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
                    {isSubmitting && (
                      <Loader2
                        aria-hidden="true"
                        className="mr-1.5 h-4 w-4 animate-spin"
                      />
                    )}
                    {isSubmitting
                      ? 'Saving...'
                      : editData
                        ? 'Save Changes'
                        : 'Add Vehicle'}
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
