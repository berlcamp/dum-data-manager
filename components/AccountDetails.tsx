'use client'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import OneColLayoutLoading from './Loading/OneColLayoutLoading'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { useDispatch, useSelector } from 'react-redux'

interface ModalProps {
  hideModal: () => void
  id: string
  shouldUpdateRedux: boolean
}

interface FormTypes {
  firstname: string
  middlename: string
  lastname: string
  password: string
  password2: string
}

const AccountDetails = ({ hideModal, shouldUpdateRedux, id }: ModalProps) => {
  const { setToast } = useFilter()
  const { supabase } = useSupabase()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const {
    register,
    formState: { errors },
    reset,
    handleSubmit,
  } = useForm<FormTypes>({
    mode: 'onSubmit',
  })

  const onSubmit = async (formdata: FormTypes) => {
    if (loading || saving) return

    void handleUpdate(formdata)
  }

  const handleUpdate = async (formdata: FormTypes) => {
    setSaving(true)

    const newData = {
      firstname: formdata.firstname,
      middlename: formdata.middlename,
      lastname: formdata.lastname,
    }
    try {
      const { error } = await supabase
        .from('ddm_users')
        .update(newData)
        .eq('id', id)

      if (error) throw new Error(error.message)
    } catch (e) {
      console.error(e)
    } finally {
      // Update data in redux
      if (shouldUpdateRedux) {
        console.log('redux updated')
        const items = [...globallist]
        const updatedData = { ...newData, id }
        const foundIndex = items.findIndex((x) => x.id === updatedData.id)
        items[foundIndex] = { ...items[foundIndex], ...updatedData }
        dispatch(updateList(items))
      }

      // pop up the success message
      setToast('success', 'Successfully saved.')

      setSaving(false)

      // hide the modal
      hideModal()
    }
  }

  // manually set the defaultValues of use-form-hook whenever the component receives new props.
  useEffect(() => {
    const fetchAccountDetails = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('ddm_users')
          .select()
          .eq('id', id)
          .limit(1)
          .maybeSingle()

        if (error) throw new Error(error.message)

        reset({
          firstname: data ? data.firstname : '',
          middlename: data ? data.middlename : '',
          lastname: data ? data.lastname : '',
        })
      } catch (e) {
        console.error('fetch error: ', e)
      } finally {
        setLoading(false)
      }
    }

    void fetchAccountDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reset])

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

            {/* Modal Content */}
            <div className="app__modal_body">
              {loading && <OneColLayoutLoading />}
              {!loading && (
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="">
                  <div className="app__form_field_container">
                    <div className="w-full">
                      <div className="app__label_standard">Firstname:</div>
                      <div>
                        <input
                          {...register('firstname', { required: true })}
                          type="text"
                          className="app__input_standard"
                        />
                        {errors.firstname && (
                          <div className="app__error_message">
                            Firstname is required
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="app__form_field_container">
                    <div className="w-full">
                      <div className="app__label_standard">Middlename:</div>
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
                      <div className="app__label_standard">Lastname:</div>
                      <div>
                        <input
                          {...register('lastname')}
                          type="text"
                          className="app__input_standard"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="app__modal_footer">
                    <button
                      type="submit"
                      className="app__btn_green_sm">
                      {saving ? 'Saving..' : 'Save'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AccountDetails
