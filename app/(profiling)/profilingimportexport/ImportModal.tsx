'use client'

import { CustomButton } from '@/components/index'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { ProfileSurveyTypes } from '@/types'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import CsvReader from './CsvReader'

interface ModalProps {
  hideModal: () => void
}

interface ImportFormSchema {
  survey_id: string
  type: string
  barangay: string
}

export default function ImportModal({ hideModal }: ModalProps) {
  const [surveys, setSurveys] = useState<any>([])
  const { supabase } = useSupabase()
  const { setToast } = useFilter()
  const [importing, setImporting] = useState(false)

  const wrapperRef = useRef<HTMLDivElement>(null)

  // CSV Reader
  const [csvContents, setCsvContents] = useState<any>(null)
  const [reloadCsvReader, setReloadCsvReader] = useState(false)

  const {
    register,
    formState: { errors },
    reset,
    handleSubmit,
  } = useForm<ImportFormSchema>({
    mode: 'onSubmit',
  })

  const onImportSubmit = async (formdata: ImportFormSchema) => {
    setImporting(true)

    if (csvContents) {
      let insertArray: any = []
      let deleteArray: any = []
      let profile_ids: string[] = []
      let p_id = ''
      const survey_id = formdata.survey_id
      const type = formdata.type

      // process each row starting 2nd row
      csvContents.data.slice(1).forEach((item: any, i: number) => {
        const profile_id = item[1]
        const category = item[3] === '' ? 'UC' : item[3]
        const remarks = item[4]
        p_id = profile_id

        profile_ids.push(item[1])

        //create insert array
        insertArray.push({
          profile_id,
          category,
          survey_id,
          type,
          remarks,
        })

        //create delete array
        deleteArray.push({
          profile_id,
          survey_id,
          type,
        })
      })

      try {
        //perform delete first
        const { error } = await supabase
          .from('ddm_profile_categories')
          .delete()
          .in('profile_id', profile_ids)
          .eq('survey_id', survey_id)
          .eq('type', type)

        if (error) {
          setToast(
            'error',
            'Something, went wrong. Please check if csv has correct format.'
          )
          throw new Error(error.message)
        }

        //then insert the new data
        const { error: error2 } = await supabase
          .from('ddm_profile_categories')
          .insert(insertArray)

        if (error2) {
          setToast(
            'error',
            'Something, went wrong (error2). Please check if csv has correct format.'
          )
          throw new Error(error2.message)
        }

        //add to log
        await supabase.from('ddm_profile_import_logs').insert({
          type,
          profile_id: p_id,
          survey_id,
        })

        // pop up the success message
        setToast('success', 'Successfully saved.')

        hideModal()
      } catch (error) {
        console.error('error', error)
      }

      setImporting(false)
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
                Import Survey Data
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
                onSubmit={handleSubmit(onImportSubmit)}
                className="app__modal_body">
                <div className="flex flex-col space-y-4">
                  <div className="md:grid">
                    <div className="app__label_standard">
                      Import data to Survey Batch
                    </div>
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
                  <div className="md:grid">
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
                  <div className="md:grid gap-4 pt-4">
                    <CsvReader setCsvContents={setCsvContents} />
                    <div className="bg-yellow-100 border border-yellow-200 p-1 mt-1 text-xs">
                      Please note that this action will override the current
                      profile categories for the selected category type and
                      survey batch.
                    </div>
                    <div className="mt-2 text-center">
                      <CustomButton
                        containerStyles="app__btn_blue"
                        title="Import"
                        isDisabled={importing}
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
