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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useSupabase } from '@/context/SupabaseProvider'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useFilter } from '@/context/FilterContext'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone, type FileWithPath } from 'react-dropzone'

// Redux imports
import { useDispatch, useSelector } from 'react-redux'

import { Input } from '@/components/ui/input'
import { docTypes } from '@/constants/TrackerConstants'
import type { AccountTypes, AttachmentTypes, DocumentTypes } from '@/types'
import { XMarkIcon } from '@heroicons/react/20/solid'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import Attachment from './Attachment'

const FormSchema = z.object({
  type: z.string().min(1, {
    message: 'Type is required.',
  }),
  requester: z.string().min(1, {
    message: 'Requester is required.',
  }),
  particulars: z.string().min(1, {
    message: 'Particulars is required.',
  }),
  specify: z.string().optional(),
  date_received: z.date({
    required_error: 'Date Received is required.',
  }),
  activity_date: z.date().optional(),
})

interface ModalProps {
  hideModal: () => void
  editData: DocumentTypes | null
}

export default function AddDocumentModal({ hideModal, editData }: ModalProps) {
  const { setToast } = useFilter()
  const { supabase, session, systemUsers } = useSupabase()

  const [selectedImages, setSelectedImages] = useState<any>([])
  const [saving, setSaving] = useState(false)

  const [showSpecify, setShowSpecify] = useState(
    editData
      ? editData.type === 'Others' || editData.type === 'Medical Assistance'
        ? true
        : false
      : false
  )
  const [specifyLabel, setSpecifyLabel] = useState('')

  const [attachments, setAttachments] = useState<AttachmentTypes[] | []>([])

  const wrapperRef = useRef<HTMLDivElement>(null)

  const user: AccountTypes = systemUsers.find(
    (user: AccountTypes) => user.id === session.user.id
  )

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
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
      type: editData ? editData.type : '',
      specify: editData ? editData.specify : '',
      requester: editData ? editData.requester : '',
      particulars: editData ? editData.particulars : '',
      date_received: editData ? new Date(editData.date_received) : new Date(),
      activity_date: editData
        ? new Date(editData.activity_date) || undefined
        : undefined,
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
        status: 'Open',
        type: formdata.type,
        specify: formdata.specify,
        date_received: format(new Date(formdata.date_received), 'yyyy-MM-dd'),
        activity_date: formdata.activity_date
          ? format(new Date(formdata.activity_date), 'yyyy-MM-dd')
          : null,
        particulars: formdata.particulars,
        requester: formdata.requester,
        user_id: session.user.id,
      }

      const { data, error } = await supabase
        .from('ddm_letter_trackers')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      // Append new data in redux
      const updatedData = {
        ...newData,
        id: data[0].id,
        date_received: data[0].date_received,
        activity_date: data[0].activity_date || null,
      }
      dispatch(updateList([updatedData, ...globallist]))

      // Upload files
      await handleUploadFiles(data[0].id)

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // hide the modal
      hideModal()
    } catch (error) {
      console.error('error', error)
    }

    setSaving(false)
  }

  const handleUpdate = async (formdata: z.infer<typeof FormSchema>) => {
    if (!editData) return
    console.log(formdata)
    setSaving(true)

    try {
      const newData = {
        type: formdata.type,
        specify: formdata.specify,
        date_received: format(new Date(formdata.date_received), 'yyyy-MM-dd'),
        activity_date: formdata.activity_date
          ? format(new Date(formdata.activity_date), 'yyyy-MM-dd')
          : null,
        particulars: formdata.particulars,
        requester: formdata.requester,
        user_id: session.user.id,
      }

      const { data, error } = await supabase
        .from('ddm_letter_trackers')
        .update(newData)
        .eq('id', editData.id)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        ...newData,
        id: editData.id,
        date_received: format(new Date(formdata.date_received), 'yyyy-MM-dd'),
        activity_date: formdata.activity_date
          ? format(new Date(formdata.activity_date), 'yyyy-MM-dd')
          : null,
      }
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      items[foundIndex] = { ...items[foundIndex], ...updatedData }
      dispatch(updateList(items))

      // Upload files
      await handleUploadFiles(editData.id)

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // hide the modal
      hideModal()
    } catch (error) {
      console.error('error', error)
    }

    setSaving(false)
  }

  const handleUploadFiles = async (id: string) => {
    const newAttachments: any = []

    // Upload attachments
    await Promise.all(
      selectedImages.map(async (file: File) => {
        const { error } = await supabase.storage
          .from('ddm_documents')
          .upload(`letter_tracker/${id}/${file.name}`, file)

        if (error) {
          console.log(error)
        } else {
          newAttachments.push({ name: file.name })
        }
      })
    )

    // Update attachments on database column
    const { error } = await supabase
      .from('ddm_letter_trackers')
      .update({ attachments: newAttachments })
      .eq('id', id)
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
        .list(`letter_tracker/${editData.id}`, {
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
                  <div className="space-y-6">
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
                              if (value === 'Others') {
                                setShowSpecify(true)
                                setSpecifyLabel('Specify Type')
                              } else if (value === 'Medical Assistance') {
                                setShowSpecify(true)
                                setSpecifyLabel('Specify Hospital')
                              } else {
                                setShowSpecify(false)
                              }
                            }}
                            defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose Type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {docTypes.map((type, index) => (
                                <SelectItem
                                  key={type}
                                  value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {showSpecify && (
                      <FormField
                        control={form.control}
                        name="specify"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="app__form_label">
                              {specifyLabel}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={specifyLabel}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="date_received"
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
                                    'pl-3 text-left font-normal',
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
                                disabled={(date) =>
                                  date < new Date('1900-01-01')
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="activity_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="app__form_label">
                            Activity Date
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'pl-3 text-left font-normal',
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
                                disabled={(date) =>
                                  date < new Date('1900-01-01')
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="requester"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Requester
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Requesting Department / Requester Name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="particulars"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Particulars
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Particulars"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="w-full mt-6 md:mt-0">
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
                      className="cursor-pointer border-2 border-dashed border-gray-300 bg-gray-100 text-gray-600 px-4 py-10">
                      <input {...getInputProps()} />
                      <p className="text-xs">
                        Drag and drop some files here, or click to select files
                      </p>
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
