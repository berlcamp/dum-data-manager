'use client'

import { CustomButton } from '@/components/index'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import Excel from 'exceljs'
import { saveAs } from 'file-saver'

// Redux imports
import { barangays } from '@/constants/TrackerConstants'
import { useSupabase } from '@/context/SupabaseProvider'
import { ProfileSurveyTypes } from '@/types'
import { fetchCategories, fetchProfiles } from '@/utils/fetchApi'

interface ModalProps {
  hideModal: () => void
}

interface ExportFormSchema {
  barangay: string
  type: string
  survey_id: string
}

export default function ExportModal({ hideModal }: ModalProps) {
  const [downloading, setDownloading] = useState(false)
  const [surveys, setSurveys] = useState<any>([])
  const { supabase } = useSupabase()

  const wrapperRef = useRef<HTMLDivElement>(null)

  const {
    register,
    formState: { errors },
    reset,
    handleSubmit,
  } = useForm<ExportFormSchema>({
    mode: 'onSubmit',
  })

  const onExportSubmit = async (formdata: ExportFormSchema) => {
    setDownloading(true)

    // Create a new workbook and add a worksheet
    const workbook = new Excel.Workbook()
    const worksheet = workbook.addWorksheet('Sheet 1')

    // Add data to the worksheet
    worksheet.columns = [
      { header: '#', key: 'no', width: 20 },
      { header: 'ID (do not edit)', key: 'profile_id', width: 20 },
      { header: 'Fullname (do not edit)', key: 'fullname', width: 20 },
      // { header: 'Barangay (do not edit)', key: 'barangay', width: 20 },
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

    const profile_ids = result.data.map((object) => object.id)
    const categories = await fetchCategories(
      {
        profile_ids: profile_ids,
        survey_id: formdata.survey_id,
        type: formdata.type,
      },
      99999,
      0
    )

    // Data for the Excel file
    const data: any[] = []
    categories.data.forEach((item, index) => {
      data.push({
        no: index + 1,
        profile_id: `${item.profile_id}`,
        fullname: `${item.profile.fullname}`,
        // barangay: `${item.profile.address}`,
        category: `${item.category}`,
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

  useEffect(() => {
    ;(async () => {
      const result = await supabase
        .from('ddm_profile_surveys')
        .select()
        .order('id', { ascending: true })
      setSurveys(result.data)
    })()
  }, [])

  return (
    <>
      <div
        ref={wrapperRef}
        className="app__modal_wrapper">
        <div className="app__modal_wrapper2">
          <div className="app__modal_wrapper3">
            <div className="app__modal_header">
              <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
                Export Survey Data
              </h5>
              <CustomButton
                containerStyles="app__btn_gray"
                title="Close"
                btnType="button"
                handleClick={hideModal}
              />
            </div>

            <div className="modal-body relative p-4 overflow-x-scroll">
              <form
                onSubmit={handleSubmit(onExportSubmit)}
                className="app__modal_body">
                <div className="flex flex-col space-y-4">
                  <div className="md:grid">
                    <div className="app__label_standard">Barangay</div>
                    <div>
                      <select
                        {...register('barangay', { required: true })}
                        className="app__input_standard">
                        <option value="">Select</option>
                        {barangays.map((bar: string, i: number) => (
                          <option
                            key={i}
                            value={bar}>
                            {bar}
                          </option>
                        ))}
                      </select>
                      {errors.barangay && (
                        <div className="app__error_message">
                          Barangay is required
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:grid">
                    <div className="app__label_standard">Survey Batch</div>
                    <div>
                      <select
                        {...register('survey_id', { required: true })}
                        className="app__input_standard">
                        <option value="">Select</option>
                        {surveys.map((h: ProfileSurveyTypes, i: number) => (
                          <option
                            key={i}
                            value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                      {errors.survey_id && (
                        <div className="app__error_message">
                          Survey Batch is required
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:grid mb-4">
                    <div className="app__label_standard">Category Type</div>
                    <div>
                      <select
                        {...register('type', { required: true })}
                        className="app__input_standard">
                        <option value="">Select</option>
                        <option value="Core">Core</option>
                        <option value="BLC">BLC</option>
                        <option value="Province">Province</option>
                      </select>
                      {errors.type && (
                        <div className="app__error_message">
                          Category Type is required
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:grid md:gap-4 mb-4">
                    <div className="mt-2 text-center">
                      <CustomButton
                        containerStyles="app__btn_blue"
                        title="Export"
                        isDisabled={downloading}
                        btnType="submit"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
