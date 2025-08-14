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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFilter } from '@/context/FilterContext'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone, type FileWithPath } from 'react-dropzone'

// Redux imports
import { useDispatch, useSelector } from 'react-redux'

import { Input } from '@/components/ui/input'
import { departments } from '@/constants/TrackerConstants'
import type { AccountTypes, AttachmentTypes, LcrTypes } from '@/types'
import { generateRandomNumber } from '@/utils/text-helper'
import { XMarkIcon } from '@heroicons/react/20/solid'
import Attachment from './Attachment'

const FormSchema = z.object({
  reg_no: z.string().min(1, {
    message: 'Reg No. is required.',
  }),
  type: z.string().min(1, {
    message: 'Type is required.',
  }),
  firstname: z.string().optional(),
  middlename: z.string().optional(),
  lastname: z.string().optional(),
  father: z.string().optional(),
  mother: z.string().optional(),
  husband_firstname: z.string().optional(),
  husband_middlename: z.string().optional(),
  husband_lastname: z.string().optional(),
  wife_firstname: z.string().optional(),
  wife_middlename: z.string().optional(),
  wife_lastname: z.string().optional(),
  date: z.string().min(1, {
    message: 'Date is required.',
  }),
})

interface ModalProps {
  hideModal: () => void
  editData: LcrTypes | null
}

export default function AddEditModal({ hideModal, editData }: ModalProps) {
  const { setToast } = useFilter()
  const { supabase, session, systemUsers } = useSupabase()

  const [selectedImages, setSelectedImages] = useState<any>([])
  const [saving, setSaving] = useState(false)

  const [showSpecify, setShowSpecify] = useState(
    editData ? (editData.type === 'Other Documents' ? true : false) : false
  )
  const [showCheckNo, setShowCheckNo] = useState(
    editData ? (editData.type === 'Disbursement Voucher' ? true : false) : false
  )
  const [specifyLabel, setSpecifyLabel] = useState('')

  const [attachments, setAttachments] = useState<AttachmentTypes[] | []>([])

  const wrapperRef = useRef<HTMLDivElement>(null)

  const user: AccountTypes = systemUsers.find(
    (user: AccountTypes) => user.id === session.user.id
  )
  const defaultLocation = departments.find((d) => d.office === user.department)

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const globalRoutesList = useSelector((state: any) => state.routes.value)
  const dispatch = useDispatch()

  const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    setSelectedImages(
      acceptedFiles.map((file) =>
        Object.assign(file, {
          filename: file.name,
        })
      )
    )
  }, [])

  const maxSize = 5242880 // 5 MB in bytes
  const { getRootProps, getInputProps, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.docx'],
      'application/vnd.ms-excel': ['.xlsx'],
    },
    maxSize,
  })

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      date: editData ? editData.date : '',
      reg_no: editData ? editData.reg_no : '',
      type: editData ? editData.type : '',
      firstname: editData ? editData.firstname : '',
      middlename: editData ? editData.middlename : '',
      lastname: editData ? editData.lastname : '',
      father: editData ? editData.father_name : '',
      mother: editData ? editData.mother_name : '',
      husband_firstname: editData ? editData.husband_firstname : '',
      husband_middlename: editData ? editData.husband_middlename : '',
      husband_lastname: editData ? editData.husband_lastname : '',
      wife_firstname: editData ? editData.wife_firstname : '',
      wife_middlename: editData ? editData.wife_middlename : '',
      wife_lastname: editData ? editData.wife_lastname : '',
    },
  })

  const onSubmit = async (formdata: z.infer<typeof FormSchema>) => {
    if (saving) return

    if (editData) {
      await handleUpdate(formdata)
    } else {
      await handleCreate(formdata)
    }
  }

  const handleCreate = async (formdata: z.infer<typeof FormSchema>) => {
    setSaving(true)

    try {
      const newData = {
        date: formdata.date,
        reg_no: formdata.reg_no,
        type: formdata.type,
        firstname: formdata.firstname,
        middlename: formdata.middlename,
        lastname: formdata.lastname,
        father_name: formdata.father,
        mother_name: formdata.mother,
        husband_firstname: formdata.husband_firstname,
        husband_middlename: formdata.husband_middlename,
        husband_lastname: formdata.husband_lastname,
        wife_firstname: formdata.wife_firstname,
        wife_middlename: formdata.wife_middlename,
        wife_lastname: formdata.wife_lastname,
      }

      const { data, error } = await supabase
        .from('ddm_lcr')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      // Upload files
      const uploadedFiles = await handleUploadFiles(data[0].id)

      // Append new data in redux
      const updatedData = {
        ...newData,
        ddm_user: user,
        id: data[0].id,
        attachments: uploadedFiles,
        date_received: data[0].date_received,
        activity_date: data[0].activity_date || null,
      }
      dispatch(updateList([updatedData, ...globallist]))

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // hide the modal
      hideModal()
    } catch (error) {
      // pop up the error message
      setToast('error', JSON.stringify(error))
      console.error('error', error)
    }

    setSaving(false)
  }

  const handleUpdate = async (formdata: z.infer<typeof FormSchema>) => {
    if (!editData) return

    try {
      const newData = {
        date: formdata.date,
        reg_no: formdata.reg_no,
        type: formdata.type,
        firstname: formdata.firstname,
        middlename: formdata.middlename,
        lastname: formdata.lastname,
        father_name: formdata.father,
        mother_name: formdata.mother,
        husband_firstname: formdata.husband_firstname,
        husband_middlename: formdata.husband_middlename,
        husband_lastname: formdata.husband_lastname,
        wife_firstname: formdata.wife_firstname,
        wife_middlename: formdata.wife_middlename,
        wife_lastname: formdata.wife_lastname,
      }

      const { error } = await supabase
        .from('ddm_lcr')
        .update(newData)
        .eq('id', editData.id)

      if (error) throw new Error(error.message)

      // Upload files
      const uploadedFiles = await handleUploadFiles(editData.id)

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
      // pop up the error message
      setToast('error', error)
      console.error('error', error)
    }

    setSaving(false)
  }

  const handleUploadFiles = async (id: string) => {
    const newAttachments: any = []

    // Upload attachments
    await Promise.all(
      selectedImages.map(async (file: File) => {
        const fileName = `${generateRandomNumber(2)}_${file.name}`
        const { error } = await supabase.storage
          .from('ddm_documents')
          .upload(`lcr/${id}/${fileName}`, file)

        if (error) {
          console.log(error)
        } else {
          newAttachments.push({ name: fileName })
        }
      })
    )

    // Update attachments on database column
    if (newAttachments.length > 0) {
      const { error } = await supabase
        .from('ddm_lcr')
        .update({ attachments: newAttachments })
        .eq('id', id)
    }

    return newAttachments
  }

  const deleteFile = (file: FileWithPath) => {
    const files = selectedImages.filter(
      (f: FileWithPath) => f.path !== file.path
    )
    setSelectedImages(files)
  }

  const selectedFiles = selectedImages?.map((file: any, index: number) => (
    <div
      key={index}
      className="flex space-x-1 py-px items-center justify-start relative align-top">
      <XMarkIcon
        onClick={() => deleteFile(file)}
        className="cursor-pointer w-5 h-5 text-red-400"
      />
      <span className="text-xs">{file.filename}</span>
    </div>
  ))

  const fetchAttachments = async () => {
    if (!editData) return false
    const { data, error }: { data: AttachmentTypes[] | []; error: unknown } =
      await supabase.storage
        .from('ddm_documents')
        .list(`tracker/${editData.id}`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        })

    if (error) console.error(error)

    setAttachments(data)
  }

  useEffect(() => {
    if (editData) {
      void fetchAttachments()
    }
  }, [])

  useEffect(() => {
    if (fileRejections.length > 0) {
      setSelectedImages([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileRejections])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapperRef])

  return (
    <div
      ref={wrapperRef}
      className="app__modal_wrapper">
      <div className="app__modal_wrapper2_large">
        <div className="app__modal_wrapper3">
          <div className="app__modal_header">
            <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
              Details
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
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Type
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              form.setValue('type', value)
                            }}
                            defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose Type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Certificate of Live Birth">
                                Certificate of Live Birth
                              </SelectItem>
                              <SelectItem value="Certificate of Marriage">
                                Certificate of Marriage
                              </SelectItem>
                              <SelectItem value="Certificate of Death">
                                Certificate of Death
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {(form.watch('type') === 'Certificate of Live Birth' ||
                      form.watch('type') === 'Certificate Death') && (
                      <>
                        <FormField
                          control={form.control}
                          name="firstname"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                First Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="First name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="middlename"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Middle Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Middle name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastname"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Last Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Last name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    {form.watch('type') === 'Certificate of Marriage' && (
                      <>
                        <FormField
                          control={form.control}
                          name="husband_firstname"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Husband First Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Husband First name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="husband_middlename"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Husband Middle Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Husband Middle name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="husband_lastname"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Husband Last Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Husband Last name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    {form.watch('type') !== '' && (
                      <>
                        <FormField
                          control={form.control}
                          name="reg_no"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Reg No.
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Reg No"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                  <div className="space-y-4">
                    {form.watch('type') !== '' && (
                      <>
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Date Registered
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    {form.watch('type') === 'Certificate of Marriage' && (
                      <>
                        <FormField
                          control={form.control}
                          name="wife_firstname"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Wife First Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Wife First name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="wife_middlename"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Wife Middle Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Wife Middle name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="wife_lastname"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Wife Last Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Wife Last name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    {form.watch('type') === 'Certificate of Live Birth' && (
                      <>
                        <FormField
                          control={form.control}
                          name="father"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Father Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Father Name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="mother"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <FormLabel className="app__form_label">
                                Mother Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Mother name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    {form.watch('type') === 'xxx' && (
                      <>
                        <div className="app__form_label">Attachments:</div>

                        {editData && (
                          <div className="mb-2">
                            {attachments?.length === 0 ? (
                              <div className="text-sm">No attachments</div>
                            ) : (
                              <div className="text-sm mb-2">Attachments:</div>
                            )}
                            {attachments?.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2 justify-start">
                                <Attachment
                                  file={file.name}
                                  id={editData.id}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <div
                          {...getRootProps()}
                          className="w-1/2 cursor-pointer border-2 border-dashed border-gray-300 bg-gray-100 text-gray-600 px-4 py-2">
                          <input {...getInputProps()} />
                          <p className="text-xs">Click here to attach files</p>
                        </div>
                        {fileRejections.length === 0 &&
                          selectedImages.length > 0 && (
                            <div className="py-4">
                              <div className="text-xs font-medium mb-2">
                                Files to upload:
                              </div>
                              {selectedFiles}
                            </div>
                          )}
                        {fileRejections.length > 0 && (
                          <div className="py-4">
                            <p className="text-red-500 text-xs">
                              File rejected. Please make sure its an image, PDF,
                              DOC, or Excel file and less than 5MB.
                            </p>
                          </div>
                        )}
                      </>
                    )}
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
