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
import { recount } from '@/GlobalRedux/Features/recountSlice'
import { useDispatch, useSelector } from 'react-redux'

import { Input } from '@/components/ui/input'
import {
  departments,
  docRouting,
  documentTypes,
  statusList,
} from '@/constants/TrackerConstants'
import type { AccountTypes, AttachmentTypes, DocumentTypes } from '@/types'
import { generateRandomNumber } from '@/utils/text-helper'
import { XMarkIcon } from '@heroicons/react/20/solid'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import Attachment from './Attachment'

const FormSchema = z.object({
  type: z.string().min(1, {
    message: 'Type is required.',
  }),
  location: z.string().min(1, {
    message: 'Current Location is required.',
  }),
  status: z.string().min(1, {
    message: 'Status is required.',
  }),
  requester: z.string().optional(),
  amount: z.string().optional(),
  agency: z.string().min(1, {
    message: 'Requesting department/agency is required.',
  }),
  particulars: z.string().min(1, {
    message: 'Particulars is required.',
  }),
  contact_number: z.string().optional(),
  specify: z.string().optional(),
  cheque_no: z.string().optional(),
  date_received: z.date({
    required_error: 'Date Received is required.',
  }),
  activity_date: z.date().optional(),
})

interface ModalProps {
  hideModal: () => void
  editData: DocumentTypes | null
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
      type: editData ? editData.type : '',
      location: editData ? editData.location : defaultLocation?.default,
      status: editData ? editData.status : 'Open',
      specify: editData ? editData.specify || '' : '',
      requester: editData ? editData.requester || '' : '',
      contact_number: editData ? editData.contact_number || '' : '',
      cheque_no: editData ? editData.cheque_no || '' : '',
      agency: editData ? editData.agency || '' : '',
      amount: editData ? editData.amount || '' : '',
      particulars: editData ? editData.particulars : '',
      date_received: editData ? new Date(editData.date_received) : new Date(),
      activity_date: editData
        ? editData.activity_date
          ? new Date(editData.activity_date)
          : undefined
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

    const type = documentTypes.find((t) => t.type === formdata.type)?.shortcut
    const routingNo = await getLatestRoutingNo(formdata.type)
    const routingSlipNo = `${type || 'DOC'}-${routingNo}`

    try {
      const newData = {
        routing_no: routingNo,
        routing_slip_no: routingSlipNo,
        type: formdata.type,
        location: formdata.location,
        status: formdata.status,
        received_by: `${user.firstname} ${user.middlename || ''} ${
          user.lastname || ''
        }`,
        contact_number: formdata.contact_number,
        cheque_no: formdata.cheque_no,
        agency: formdata.agency,
        specify: formdata.specify,
        amount: formdata.amount,
        date_received: format(new Date(formdata.date_received), 'yyyy-MM-dd'),
        activity_date: formdata.activity_date
          ? format(new Date(formdata.activity_date), 'yyyy-MM-dd')
          : null,
        particulars: formdata.particulars,
        requester: formdata.requester,
        user_id: session.user.id,
      }

      const { data, error } = await supabase
        .from('ddm_trackers')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      // Add tracker route logs
      const trackerRoutes = {
        tracker_id: data[0].id,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'h:mm a'),
        user_id: session.user.id,
        user: `${user.firstname} ${user.middlename || ''} ${
          user.lastname || ''
        }`,
        title: formdata.location,
        message: '',
      }
      await supabase.from('ddm_tracker_routes').insert(trackerRoutes)

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

    const type = documentTypes.find((t) => t.type === formdata.type)?.shortcut

    let routingNo = 1
    let routingSlipNo = ''

    if (editData.type !== formdata.type) {
      routingNo = await getLatestRoutingNo(formdata.type)
      routingSlipNo = `${type || 'DOC'}-${routingNo}`
    } else {
      routingNo = editData.routing_no
      routingSlipNo = `${type || 'DOC'}-${routingNo}`
    }

    try {
      const newData = {
        routing_no: routingNo,
        routing_slip_no: routingSlipNo,
        status: formdata.status,
        type: formdata.type,
        specify: formdata.specify,
        amount: formdata.amount,
        contact_number: formdata.contact_number,
        cheque_no: formdata.cheque_no,
        agency: formdata.agency,
        location: formdata.location,
        date_received: format(new Date(formdata.date_received), 'yyyy-MM-dd'),
        activity_date: formdata.activity_date
          ? format(new Date(formdata.activity_date), 'yyyy-MM-dd')
          : null,
        particulars: formdata.particulars,
        requester: formdata.requester,
      }

      const { error } = await supabase
        .from('ddm_trackers')
        .update(newData)
        .eq('id', editData.id)

      if (error) throw new Error(error.message)

      // Add tracker route logs
      const trackerRoutes = []
      const logMessages = []

      if (formdata.status !== editData.status) {
        logMessages.push({
          field: 'Status',
          before: editData.status,
          after: formdata.status,
        })
      }
      if (formdata.type !== editData.type) {
        logMessages.push({
          field: 'Type',
          before: editData.type,
          after: formdata.type,
        })
      }
      if (formdata.amount !== editData.amount) {
        logMessages.push({
          field: 'Amount',
          before: editData.amount,
          after: formdata.amount,
        })
      }
      if (formdata.cheque_no !== editData.cheque_no) {
        logMessages.push({
          field: 'Cheque No',
          before: editData.cheque_no,
          after: formdata.cheque_no,
        })
      }
      if (formdata.agency !== editData.agency) {
        logMessages.push({
          field: 'Agency',
          before: editData.agency,
          after: formdata.agency,
        })
      }
      if (
        format(new Date(formdata.date_received), 'yyyy-MM-dd') !==
        format(new Date(editData.date_received), 'yyyy-MM-dd')
      ) {
        logMessages.push({
          field: 'Date Received',
          before: format(new Date(editData.date_received), 'yyyy-MM-dd'),
          after: format(new Date(formdata.date_received), 'yyyy-MM-dd'),
        })
      }
      if (
        formdata.activity_date &&
        format(new Date(formdata.activity_date), 'yyyy-MM-dd') !==
          format(new Date(editData.activity_date), 'yyyy-MM-dd')
      ) {
        logMessages.push({
          field: 'Activity Date',
          before: format(new Date(editData.activity_date), 'yyyy-MM-dd'),
          after: format(new Date(formdata.activity_date), 'yyyy-MM-dd'),
        })
      }
      if (formdata.requester !== editData.requester) {
        logMessages.push({
          field: 'Requester',
          before: editData.requester,
          after: formdata.requester,
        })
      }

      if (logMessages.length > 0) {
        trackerRoutes.push({
          tracker_id: editData.id,
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'h:mm a'),
          user_id: session.user.id,
          user: `${user.firstname} ${user.middlename || ''} ${
            user.lastname || ''
          }`,
          title: 'Details updated',
          message: logMessages,
        })
      }
      if (formdata.location !== editData.location) {
        trackerRoutes.push({
          tracker_id: editData.id,
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'h:mm a'),
          user_id: session.user.id,
          user: `${user.firstname} ${user.middlename || ''} ${
            user.lastname || ''
          }`,
          title: formdata.location,
        })
      }

      if (trackerRoutes.length > 0) {
        await supabase.from('ddm_tracker_routes').insert(trackerRoutes)

        // Reload route logs
        dispatch(recount())
      }

      // Upload files
      const uploadedFiles = await handleUploadFiles(editData.id)

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
      // append uploaded files to attachments column
      const updatedAttachments = [
        ...(items[foundIndex].attachments || []),
        ...uploadedFiles,
      ]
      items[foundIndex] = {
        ...items[foundIndex],
        attachments: updatedAttachments,
        ...updatedData,
      }
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

  const getLatestRoutingNo = async (type: string) => {
    const { data, error } = await supabase
      .from('ddm_trackers')
      .select('routing_no')
      .not('routing_no', 'is', null)
      .eq('archived', false)
      .eq('type', type)
      .order('routing_no', { ascending: false })
      .limit(1)

    if (!error) {
      if (data.length > 0) {
        const rn = !isNaN(data[0].routing_no)
          ? Number(data[0].routing_no) + 1
          : 1
        return rn
      } else {
        return 1
      }
    } else {
      return 1
    }
  }

  const handleUploadFiles = async (id: string) => {
    const newAttachments: any = []

    // Upload attachments
    await Promise.all(
      selectedImages.map(async (file: File) => {
        const fileName = `${generateRandomNumber(2)}_${file.name}`
        const { error } = await supabase.storage
          .from('ddm_documents')
          .upload(`tracker/${id}/${fileName}`, file)

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
        .from('ddm_trackers')
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
                              if (value === 'Other Documents') {
                                setShowSpecify(true)
                              } else {
                                setShowSpecify(false)
                              }
                              if (value === 'Cheque') {
                                setShowCheckNo(true)
                              } else {
                                setShowCheckNo(false)
                              }
                            }}
                            defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose Type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {documentTypes.map((doc, index) => (
                                <SelectItem
                                  key={index}
                                  value={doc.type}>
                                  {doc.type}
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
                              Specify Type
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
                      name="activity_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col space-y-3">
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
                    {showCheckNo && (
                      <FormField
                        control={form.control}
                        name="cheque_no"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="app__form_label">
                              Cheque No.
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Cheque No"
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
                        <FormItem className="flex flex-col space-y-3">
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
                      name="agency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Requesting Department/Agency
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Department/Agency"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contact_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Contact Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Contact Number"
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
                              className="resize-none h-24"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Current Location
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose Location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {docRouting.map((route, index) => (
                                <SelectItem
                                  key={index}
                                  value={route.status}>
                                  {route.status}
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
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Status
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statusList.map((s, index) => (
                                <SelectItem
                                  key={index}
                                  value={s.status}>
                                  {s.status}
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
                      name="requester"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="app__form_label">
                            Name / Payee
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Requester/Payee Name"
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
                            Amount
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="Amount"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
