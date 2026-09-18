import { CustomButton, OneColLayoutLoading } from '@/components/index'
import { useFilter } from '@/context/FilterContext'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

// Types
import type { AccountTypes, RisDepartmentTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { updateResultCounter } from '@/GlobalRedux/Features/resultsCounterSlice'
import { departments } from '@/constants/TrackerConstants'
import { useSupabase } from '@/context/SupabaseProvider'
import { useDispatch, useSelector } from 'react-redux'

interface ModalProps {
  hideModal: () => void
  editData: AccountTypes | null
}

const AddEditModal = ({ hideModal, editData }: ModalProps) => {
  const { setToast } = useFilter()
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [risDepartments, setRisDepartments] = useState<RisDepartmentTypes[]>([])

  const { supabase } = useSupabase()

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const resultsCounter = useSelector((state: any) => state.results.value)
  const dispatch = useDispatch()

  const {
    register,
    formState: { errors },
    reset,
    handleSubmit,
  } = useForm<AccountTypes>({
    mode: 'onSubmit',
  })

  const onSubmit = async (formdata: AccountTypes) => {
    if (saving) return

    setSaving(true)

    if (editData) {
      void handleUpdate(formdata)
    } else {
      void handleCreate(formdata)
    }
  }

  const handleCreate = async (formdata: AccountTypes) => {
    try {
      const newData = {
        firstname: formdata.firstname,
        middlename: formdata.middlename,
        lastname: formdata.lastname,
        department: formdata.department,
        department_id: formdata.department_id || null,
        status: 'Active',
        email: formdata.email,
        temp_password: tempPassword.toString(),
        org_id: process.env.NEXT_PUBLIC_ORG_ID,
      }

      // The auth user and the ddm_users row are both created on the server:
      // that needs the service role, which must not reach the browser.
      const { data } = await axios.post('/api/accounts', { item: newData })

      if (data.error_message !== '') {
        setErrorMessage(data.error_message)
        setSaving(false)
        return
      }

      // Append new data in redux
      const updatedData = {
        ...newData,
        id: data.insert_id,
      }
      dispatch(updateList([updatedData, ...globallist]))

      // pop up the success message
      setToast('success', 'Successfully saved.')

      // Updating showing text in redux
      dispatch(
        updateResultCounter({
          showing: Number(resultsCounter.showing) + 1,
          results: Number(resultsCounter.results) + 1,
        }),
      )

      setSaving(false)

      // hide the modal
      hideModal()
      setErrorMessage('')

      // reset all form fields
      reset()
    } catch (e) {
      console.error(e)
      setErrorMessage('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  const handleUpdate = async (formdata: AccountTypes) => {
    if (!editData) return

    const newData = {
      firstname: formdata.firstname,
      middlename: formdata.middlename,
      lastname: formdata.lastname,
      department: formdata.department,
      department_id: formdata.department_id || null,
      temp_password:
        formdata.password !== '' ? formdata.password : editData.temp_password,
    }

    try {
      // Changing another user's password is an admin call, so the update runs
      // on the server too.
      const { data } = await axios.patch('/api/accounts', {
        id: editData.id,
        item: newData,
        password: formdata.password,
      })

      if (data.error_message !== '') {
        setToast('error', data.error_message)
        setSaving(false)
        return
      }

      // Update data in redux
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

      setSaving(false)

      // hide the modal
      hideModal()

      // reset all form fields
      reset()
    } catch (e) {
      setToast('error', 'Error occured.')
      console.error(e)
      setSaving(false)
    }
  }

  // Fetch RIS departments
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('ddm_ris_departments')
        .select()
        .order('name', { ascending: true })
      if (data) setRisDepartments(data)
    })()
  }, [])

  // manually set the defaultValues of use-form-hook whenever the component receives new props.
  useEffect(() => {
    reset({
      firstname: editData ? editData.firstname : '',
      middlename: editData ? editData.middlename : '',
      lastname: editData ? editData.lastname : '',
      department: editData ? editData.department : '',
      department_id: editData?.department_id ?? '',
    })
  }, [editData, reset])

  const tempPassword = Math.floor(Math.random() * 8999) + 1000

  return (
    <>
      <div className="app__modal_wrapper">
        <div className="app__modal_wrapper2">
          <div className="app__modal_wrapper3">
            <div className="app__modal_header">
              <h5 className="app__modal_header_text">Account Details</h5>
              <button
                disabled={saving}
                onClick={hideModal}
                type="button"
                className="app__modal_header_btn">
                &times;
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="app__modal_body">
              {!saving ? (
                <>
                  {errorMessage !== '' && (
                    <div className="mb-3 mt-1 text-xs text-red-600 font-bold">
                      {errorMessage}
                    </div>
                  )}
                  <div className="app__form_field_container">
                    <div className="w-full">
                      <div className="app__label_standard">First Name</div>
                      <div>
                        <input
                          {...register('firstname', { required: true })}
                          type="text"
                          className="app__input_standard"
                        />
                        {errors.firstname && (
                          <div className="app__error_message">
                            First Name is required
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="app__form_field_container">
                    <div className="w-full">
                      <div className="app__label_standard">Middlename</div>
                      <div>
                        <input
                          {...register('middlename')}
                          type="text"
                          className="app__input_standard"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="app__form_field_container">
                    <div className="w-full">
                      <div className="app__label_standard">Lastname</div>
                      <div>
                        <input
                          {...register('lastname')}
                          type="text"
                          className="app__input_standard"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="app__form_field_container">
                    <div className="w-full">
                      <div className="app__label_standard">Department</div>
                      <div>
                        <select
                          {...register('department')}
                          className="app__select_standard">
                          <option value="">Choose department</option>
                          {departments.map((d, i) => (
                            <option
                              key={i}
                              value={d.office}>
                              {d.office}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="app__form_field_container">
                    <div className="w-full">
                      <div className="app__label_standard">RIS Department</div>
                      <div>
                        <select
                          {...register('department_id', { required: false })}
                          className="app__select_standard">
                          <option value="">Choose RIS department</option>
                          {risDepartments.map((d, i) => (
                            <option
                              key={i}
                              value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  {!editData ? (
                    <>
                      <div className="app__form_field_container">
                        <div className="w-full">
                          <div className="app__label_standard">Email</div>
                          <div>
                            <input
                              {...register('email', { required: true })}
                              type="email"
                              className="app__select_standard"
                            />
                            {errors.email && (
                              <div className="app__error_message">
                                Email is required
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="app__form_field_container">
                        <div className="w-full">
                          <div className="app__label_standard">
                            Temporary Password:{' '}
                            <span className="font-bold">{tempPassword}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="app__form_field_container">
                      <div className="w-full">
                        <div className="app__label_standard">
                          New Password (Leave Blank if not neccesary)
                        </div>
                        <div>
                          <input
                            {...register('password')}
                            placeholder="Leave Blank if not neccesary"
                            type="text"
                            className="app__select_standard"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <OneColLayoutLoading />
              )}
              <div className="app__modal_footer">
                <CustomButton
                  btnType="submit"
                  isDisabled={saving}
                  title={saving ? 'Saving...' : 'Submit'}
                  containerStyles="app__btn_green"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

export default AddEditModal
