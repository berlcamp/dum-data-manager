'use client'

import { Sidebar, Title, TopBar, Unauthorized } from '@/components/index'
import React, { CSSProperties, useState } from 'react'

import {
  formatFileSize,
  lightenDarkenColor,
  useCSVReader,
} from 'react-papaparse'

import Excel from 'exceljs'
import { saveAs } from 'file-saver'

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// Redux imports
import ProfilingSidebar from '@/components/Sidebars/ProfilingSidebar'
import { barangays, superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { ProfileTypes } from '@/types'
import { fetchProfiles } from '@/utils/fetchApi'
import { zodResolver } from '@hookform/resolvers/zod'

const FormSchema = z.object({
  barangay: z.string().min(1, {
    message: 'Select Barangay',
  }),
  type: z.string().min(1, {
    message: 'Select Type',
  }),
})

const GREY = '#CCC'
const GREY_LIGHT = 'rgba(255, 255, 255, 0.4)'
const DEFAULT_REMOVE_HOVER_COLOR = '#A01919'
const REMOVE_HOVER_COLOR_LIGHT = lightenDarkenColor(
  DEFAULT_REMOVE_HOVER_COLOR,
  40
)
const GREY_DIM = '#686868'

const styles = {
  zone: {
    alignItems: 'center',
    border: `2px dashed ${GREY}`,
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'center',
    padding: 20,
  } as CSSProperties,
  file: {
    background: 'linear-gradient(to bottom, #EEE, #DDD)',
    borderRadius: 20,
    display: 'flex',
    height: 120,
    width: 120,
    position: 'relative',
    zIndex: 10,
    flexDirection: 'column',
    justifyContent: 'center',
  } as CSSProperties,
  info: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: 10,
    paddingRight: 10,
  } as CSSProperties,
  size: {
    backgroundColor: GREY_LIGHT,
    borderRadius: 3,
    marginBottom: '0.5em',
    justifyContent: 'center',
    display: 'flex',
  } as CSSProperties,
  name: {
    backgroundColor: GREY_LIGHT,
    borderRadius: 3,
    fontSize: 12,
    marginBottom: '0.5em',
  } as CSSProperties,
  progressBar: {
    bottom: 14,
    position: 'absolute',
    width: '100%',
    paddingLeft: 10,
    paddingRight: 10,
  } as CSSProperties,
  zoneHover: {
    borderColor: GREY_DIM,
  } as CSSProperties,
  default: {
    borderColor: GREY,
  } as CSSProperties,
  remove: {
    height: 23,
    position: 'absolute',
    right: 6,
    top: 6,
    width: 23,
  } as CSSProperties,
}

const Page: React.FC = () => {
  //
  const { session } = useSupabase()
  const { hasAccess } = useFilter()
  const [downloading, setDownloading] = useState(false)

  // CSV Reader
  const [csvContents, setCsvContents] = useState<any>(null)
  const { CSVReader } = useCSVReader()
  const [zoneHover, setZoneHover] = useState(false)
  const [removeHoverColor, setRemoveHoverColor] = useState(
    DEFAULT_REMOVE_HOVER_COLOR
  )

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { barangay: '', type: '' },
  })

  const onSubmit = async (formdata: z.infer<typeof FormSchema>) => {
    void handleDownloadExcel(formdata)
  }

  const handleProcessCsvData = async () => {
    if (csvContents) {
      // process each row
      csvContents.data.forEach((item: any) => {
        const id = item[1]
        const category = item[3]
        const remarks = item[4]
      })
    }
  }

  const handleDownloadExcel = async (formdata: z.infer<typeof FormSchema>) => {
    setDownloading(true)

    // Create a new workbook and add a worksheet
    const workbook = new Excel.Workbook()
    const worksheet = workbook.addWorksheet('Sheet 1')

    // Add data to the worksheet
    worksheet.columns = [
      { header: '#', key: 'no', width: 20 },
      { header: 'ID (do not edit)', key: 'id', width: 20 },
      { header: 'Fullname (do not edit)', key: 'fullname', width: 20 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 20 },
      // Add more columns based on your data structure
    ]

    const result = await fetchProfiles(
      {
        filterBarangay: formdata.barangay,
      },
      99999,
      0
    )

    const profiles: ProfileTypes[] = result.data

    // Data for the Excel file
    const data: any[] = []
    profiles.forEach((item, index) => {
      let category = ''
      if (formdata.type === 'Core') {
        category = item.category
      }
      if (formdata.type === 'BLC') {
        category = item.blc_category
      }
      if (formdata.type === 'Province') {
        category = item.province_category
      }
      data.push({
        no: index + 1,
        id: `${item.id}`,
        fullname: `${item.fullname}`,
        barangay: `${item.address}`,
        category: `${category}`,
        remarks: ``,
      })
    })

    data.forEach((item) => {
      worksheet.addRow(item)
    })

    // Generate the Excel file
    await workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, `${formdata.barangay}-${formdata.type}.xlsx`)
    })
    setDownloading(false)
  }

  const email: string = session.user.email

  // Check access from permission settings or Super Admins
  if (!hasAccess('profiling') && !superAdmins.includes(email))
    return <Unauthorized />

  return (
    <>
      <Sidebar>
        <ProfilingSidebar />
      </Sidebar>
      <div className="app__main">
        <div>
          {/* Header */}
          <TopBar />
          <div className="app__title">
            <Title title="Export/Import" />
          </div>

          <div className="m-4 mt-4 lg:space-x-2 text-lg lg:flex items-start justify-center">
            <div className="w-full border-dashed border-2 p-2 bg-gray-50">
              <div className="text-center">Export Data to Excel</div>
              <div className="p-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="md:grid md:gap-4 mb-4">
                      <FormField
                        control={form.control}
                        name="barangay"
                        render={({ field }) => (
                          <FormItem className="w-[340px]">
                            <FormLabel className="app__form_label">
                              Barangay
                            </FormLabel>
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
                                {barangays.map((barangay, index) => (
                                  <SelectItem
                                    key={index}
                                    value={barangay}>
                                    {barangay}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="md:grid md:gap-4 mb-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="app__form_label">
                              Type
                            </FormLabel>
                            <Select onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose Type of Category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Core">Core</SelectItem>
                                <SelectItem value="BLC">BLC</SelectItem>
                                <SelectItem value="Province">
                                  Province
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <CustomButton
                        containerStyles="app__btn_blue"
                        title="Export"
                        isDisabled={downloading}
                        btnType="submit"
                        handleClick={form.handleSubmit(onSubmit)}
                      />
                    </div>
                  </form>
                </Form>
              </div>
            </div>
            <div className="w-full border-dashed border-2 p-2 bg-gray-50">
              <div className="text-center">Import Data</div>
              <div className="p-4">
                <CSVReader
                  onUploadAccepted={(results: any) => {
                    console.log('---------------------------')
                    console.log(results)
                    setCsvContents(results)
                    console.log('---------------------------')
                    setZoneHover(false)
                  }}
                  onDragOver={(event: DragEvent) => {
                    event.preventDefault()
                    setZoneHover(true)
                  }}
                  onDragLeave={(event: DragEvent) => {
                    event.preventDefault()
                    setZoneHover(false)
                  }}>
                  {({
                    getRootProps,
                    acceptedFile,
                    ProgressBar,
                    getRemoveFileProps,
                    Remove,
                  }: any) => (
                    <>
                      <div
                        {...getRootProps()}
                        style={Object.assign(
                          {},
                          styles.zone,
                          zoneHover && styles.zoneHover
                        )}>
                        {acceptedFile ? (
                          <>
                            <div style={styles.file}>
                              <div style={styles.info}>
                                <span style={styles.size}>
                                  {formatFileSize(acceptedFile.size)}
                                </span>
                                <span style={styles.name}>
                                  {acceptedFile.name}
                                </span>
                              </div>
                              <div style={styles.progressBar}>
                                <ProgressBar />
                              </div>
                              <div
                                {...getRemoveFileProps()}
                                style={styles.remove}
                                onMouseOver={(event: Event) => {
                                  event.preventDefault()
                                  setRemoveHoverColor(REMOVE_HOVER_COLOR_LIGHT)
                                }}
                                onMouseOut={(event: Event) => {
                                  event.preventDefault()
                                  setRemoveHoverColor(
                                    DEFAULT_REMOVE_HOVER_COLOR
                                  )
                                }}>
                                <Remove color={removeHoverColor} />
                              </div>
                            </div>
                          </>
                        ) : (
                          'Drop CSV file here or click to upload'
                        )}
                      </div>
                    </>
                  )}
                </CSVReader>
                <div className="mt-2 text-center">
                  <CustomButton
                    containerStyles="app__btn_blue"
                    title="Upload and Import Data"
                    isDisabled={downloading}
                    handleClick={handleProcessCsvData}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
export default Page
