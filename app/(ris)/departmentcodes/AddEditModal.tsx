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
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { useFilter } from '@/context/FilterContext'
import { useEffect, useRef, useState } from 'react'

// Redux imports
import { useDispatch, useSelector } from 'react-redux'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  RisDepartmentCodeTypes,
  RisDepartmentTypes,
  RisPoTypes,
} from '@/types'
import { generateRandomAlphaNumber } from '@/utils/text-helper'

const FormSchema = z.object({
  po_id: z.string().min(1, {
    message: 'P.O. is required.',
  }),
  department_id: z.string().min(1, {
    message: 'Department is required.',
  }),
})

interface ModalProps {
  hideModal: () => void
  editData: RisDepartmentCodeTypes | null
}

export default function AddEditModal({ hideModal, editData }: ModalProps) {
  const { setToast } = useFilter()
  const { supabase, session } = useSupabase()
  const [departments, setDepartments] = useState<RisDepartmentTypes[] | []>([])
  const [purchaseOrders, setPurchaseOrders] = useState<RisPoTypes[] | []>([])

  const wrapperRef = useRef<HTMLDivElement>(null)

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      po_id: editData ? editData.po_id.toString() : '',
      department_id: editData ? editData.department_id.toString() : '',
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
        code: generateRandomAlphaNumber(5),
        po_id: formdata.po_id,
        department_id: formdata.department_id,
        status: 'Active',
      }

      const { data, error } = await supabase
        .from('ddm_ris_department_codes')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      // Append new data in redux
      const updatedData = {
        ...newData,
        id: data[0].id,
        department: departments?.find(
          (d) => d.id.toString() === formdata.department_id
        ),
        purchase_order: purchaseOrders?.find(
          (p) => p.id.toString() === formdata.po_id
        ),
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
        po_id: formdata.po_id,
        department_id: formdata.department_id,
      }

      const { data, error } = await supabase
        .from('ddm_ris_department_codes')
        .update(newData)
        .eq('id', editData.id)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        ...newData,
        id: editData.id,
        department: departments?.find(
          (d) => d.id.toString() === formdata.department_id
        ),
        purchase_order: purchaseOrders?.find(
          (p) => p.id.toString() === formdata.po_id
        ),
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

  useEffect(() => {
    // Fetch departments
    ;(async () => {
      const { data } = await supabase.from('ddm_ris_departments').select()
      setDepartments(data)
    })()

    // Fetch purchase orders
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_purchase_orders')
        .select('*, ddm_ris_appropriation:appropriation(*),ddm_ris(quantity)')
        .order('po_number', { ascending: true })

      // setPurchaseOrders(data)

      // Mutate the data to get the remaining quantity
      const updatedData: RisPoTypes[] = []
      if (data) {
        data.forEach((item: RisPoTypes) => {
          const totalQuantityUsed = item.ddm_ris
            ? item.ddm_ris.reduce(
                (accumulator, ris) => accumulator + Number(ris.quantity),
                0
              )
            : 0
          const remainingQuantity = Number(item.quantity) - totalQuantityUsed

          // Exclude on list if remain quantity is 0
          if (item.type !== 'Fuel') {
            if (remainingQuantity > 0) {
              updatedData.push({
                ...item,
                remaining_quantity: ` (Available: ${remainingQuantity.toFixed(
                  2
                )} Liters)`,
              })
            }
          } else {
            updatedData.push({
              ...item,
              remaining_quantity: '',
            })
          }
        })
      }
      setPurchaseOrders(updatedData)
    })()
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="app__modal_wrapper">
      <div className="app__modal_wrapper2">
        <div className="app__modal_wrapper3">
          <div className="app__modal_header">
            <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
              Request Code
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
                <div className="md:grid md:grid-cols-1 md:gap-4">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="department_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Requesting Department
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={
                              editData
                                ? editData.department_id.toString()
                                : field.value
                            }>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose Department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments?.map((department, idx) => (
                                <SelectItem
                                  key={idx}
                                  value={department.id.toString()}>
                                  {department.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="po_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            P.O.
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={
                              editData ? editData.po_id.toString() : field.value
                            }>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose P.O." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {purchaseOrders?.map((po, idx) => (
                                <SelectItem
                                  key={idx}
                                  value={po.id.toString()}>
                                  {po.po_number}-{po.type}
                                  {po.remaining_quantity}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
