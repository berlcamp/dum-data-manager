'use client'

import { updateList } from '@/GlobalRedux/Features/listSlice'
import {
  ConfirmModal,
  CustomButton,
  TwoColTableLoading,
} from '@/components/index'
import {
  profileCategories,
  profilePositions,
} from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import type {
  AccountTypes,
  ProfileRemarksTypes,
  ProfileSurveyTypes,
  ProfileTypes,
  ServicesListTypes,
  ServicesTypes,
  SurveyCategoryTypes,
} from '@/types'
import { nanoid } from '@reduxjs/toolkit'
import { format } from 'date-fns'
import { PencilLineIcon, TrashIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Avatar from 'react-avatar'
import { useDispatch, useSelector } from 'react-redux'

interface ModalProps {
  hideModal: () => void
  details: ProfileTypes
}

const RemarksList = ({
  remarks,
  refetch,
}: {
  remarks: ProfileRemarksTypes
  refetch: () => void
}) => {
  const { supabase, session } = useSupabase()
  const { setToast } = useFilter()

  const [editMode, setEditMode] = useState(false)
  const [origRemarks, setOrigRemarks] = useState(remarks.remarks)
  const [remarksContent, setRemarksContent] = useState(remarks.remarks)
  const [saving, setSaving] = useState(false)

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  // Delete confirmation
  const deleteReply = (id: string) => {
    setShowConfirmation(true)
    setSelectedId(id)
  }
  const handleCancel = () => {
    setShowConfirmation(false)
    setSelectedId('')
  }
  const handleConfirm = async () => {
    await handleDeleteReply()
    setShowConfirmation(false)
  }
  const handleDeleteReply = async () => {
    try {
      const { error } = await supabase
        .from('ddm_profile_remarks')
        .delete()
        .eq('id', selectedId)

      if (error) throw new Error(error.message)

      setSelectedId('')
      setToast('success', 'Successfully Deleted!')
      refetch()
    } catch (e) {
      setToast('error', 'Something went wrong')
    }
  }

  const handleUpdateRemarks = async () => {
    if (remarksContent.trim().length === 0) {
      return
    }

    setSaving(true)

    try {
      const newData = {
        remarks: remarksContent,
      }

      const { error } = await supabase
        .from('ddm_profile_remarks')
        .update(newData)
        .eq('id', remarks.id)

      if (error) throw new Error(error.message)

      setOrigRemarks(remarksContent)
      setEditMode(false)
    } catch (error) {
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  if (remarks.type === 'system') {
    return (
      <div className="w-full flex-col space-y-1 px-4 py-2 border-t">
        <div className="text-xs text-gray-500 italic">
          <span className="text-[10px]">
            {format(new Date(remarks.timestamp), 'MMM dd, yyyy h:mm a')}
            {' | '}
          </span>
          <span>{remarks.remarks}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex-col space-y-1 px-4 py-4 border-t text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      <div className="w-full group">
        <div className="flex items-center space-x-2">
          <div className="flex flex-1 items-center space-x-2">
            <Avatar
              round={true}
              size="30"
              name={remarks.user}
            />
            <div>
              <div className="font-bold">
                <span>{remarks.user} </span>
              </div>
              <div className="text-gray-500  focus:ring-0 focus:outline-none text-xs text-left inline-flex items-center">
                {format(new Date(remarks.timestamp), 'dd MMM yyyy h:mm a')}
              </div>
            </div>
          </div>
          {remarks.user_id === session.user.id && !editMode && (
            <div className="flex items-center space-x-2 justify-end">
              <PencilLineIcon
                onClick={() => setEditMode(true)}
                className="w-4 h-4 cursor-pointer text-blue-500"
              />
              <TrashIcon
                onClick={() => deleteReply(remarks.id!)}
                className="w-4 h-4 cursor-pointer text-red-500"
              />
            </div>
          )}
        </div>

        {/* Message */}
        <div className="pl-10 mt-2">
          {!editMode && <div>{origRemarks}</div>}
          {/* Edit Box */}
          {editMode && (
            <div className="w-full space-y-2 mb-5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <textarea
                onChange={(e) => setRemarksContent(e.target.value)}
                value={remarksContent}
                placeholder="Write your remarks here.."
                className="w-full h-20 border resize-none focus:ring-0 focus:outline-none p-2 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300"
              />
              <div className="flex space-x-2 items-start">
                <span className="flex-1">&nbsp;</span>

                <CustomButton
                  containerStyles="app__btn_green"
                  title="Save"
                  isDisabled={saving}
                  handleClick={handleUpdateRemarks}
                  btnType="button"
                />
                <CustomButton
                  containerStyles="app__btn_gray"
                  title="Cancel"
                  isDisabled={saving}
                  handleClick={() => setEditMode(false)}
                  btnType="button"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {showConfirmation && (
        <ConfirmModal
          message="Are you sure you want to perform this action?"
          header="Confirm delete"
          btnText="Confirm"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

const ServicesList = ({
  service,
  profile,
  refetch,
}: {
  service: ServicesTypes
  profile: ProfileTypes
  refetch: () => void
}) => {
  const { supabase } = useSupabase()
  const { setToast } = useFilter()

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  const handleCancel = () => {
    setShowConfirmation(false)
    setSelectedId('')
  }
  const handleConfirm = async () => {
    await handleDeleteReply()
    setShowConfirmation(false)
  }

  const handleDeleteReply = async () => {
    try {
      const { error } = await supabase
        .from('ddm_profile_services_availed')
        .delete()
        .eq('id', selectedId)

      if (error) throw new Error(error.message)

      setSelectedId('')
      setToast('success', 'Successfully Deleted!')
      refetch()
    } catch (e) {
      setToast('error', 'Something went wrong')
    }
  }

  return (
    <div className="w-full flex-col space-y-1 px-4 py-4 border-t text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      <div className="w-full group">
        <div className="flex items-center space-x-2">
          <div className="flex flex-1 items-center space-x-2">
            <Avatar
              round={true}
              size="30"
              name={profile.fullname}
            />
            <div>
              {/* <div className="font-bold">
                <span>{profile.fullname} </span>
              </div> */}
              <div className="text-gray-500  focus:ring-0 focus:outline-none text-xs text-left inline-flex items-center">
                {format(new Date(service.date), 'dd MMM yyyy')}
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="pl-10 mt-2">
          <div>Availed {service.service.name}</div>
          {service.amount && service.amount !== '' && (
            <div>Amount: {service.amount}</div>
          )}
        </div>
      </div>
      {showConfirmation && (
        <ConfirmModal
          message="Are you sure you want to perform this action?"
          header="Confirm delete"
          btnText="Confirm"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

const Position = ({ position, id }: { position: string; id: string }) => {
  const { setToast } = useFilter()

  const [editMode, setEditMode] = useState(false)
  const [origPosition, setOrigPosition] = useState(position)
  const [newPosition, setNewPosition] = useState(position)
  const [saving, setSaving] = useState(false)

  const { supabase } = useSupabase()

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const handleUpdatePosition = async (newPos: string) => {
    setNewPosition(newPos)

    if (origPosition === newPos) {
      return
    }

    setSaving(true)

    try {
      const newData = {
        position: newPos,
      }

      const { error } = await supabase
        .from('ddm_profiles')
        .update(newData)
        .eq('id', id)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        ...newData,
        id,
      }
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      items[foundIndex] = { ...items[foundIndex], ...updatedData }
      dispatch(updateList(items))

      setOrigPosition(newPos)
      setToast('success', 'Position saved successfully')
    } catch (error) {
      console.error(error)
    } finally {
      setEditMode(false)
      setSaving(false)
    }
  }

  return (
    <div className="w-full">
      {!editMode && (
        <div className="flex items-center space-x-2">
          <span>{origPosition}</span>
          <PencilLineIcon
            onClick={() => setEditMode(true)}
            className="w-4 h-4 cursor-pointer text-blue-500"
          />
        </div>
      )}
      {/* Edit Box */}
      {editMode && (
        <select
          disabled={saving}
          value={newPosition}
          onChange={(e) => handleUpdatePosition(e.target.value)}>
          {profilePositions.map((c) => (
            <option
              key={nanoid()}
              value={c}>
              {c}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

export default function DetailsModal({ hideModal, details }: ModalProps) {
  //
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [remarks, setRemarks] = useState('')
  const [remarksLists, setRemarksLists] = useState<ProfileRemarksTypes[] | []>(
    []
  )

  const [servicesLists, setServicesLists] = useState<ServicesTypes[] | []>([])
  const [services, setServices] = useState<ServicesListTypes[] | []>([])

  const [refetch, setRefetch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const [addService, setAddService] = useState(false)
  const [service, setService] = useState('')
  const [serviceDate, setServiceDate] = useState('')
  const [serviceAmount, setServiceAmount] = useState('')

  const [coreCategory, setCoreCategory] = useState('')
  const [blcCategory, setBlcCategory] = useState('')
  const [provinceCategory, setProvinceCategory] = useState('')

  const [filterSurvey, setFilterSurvey] = useState('')
  const [surveys, setSurveys] = useState<ProfileSurveyTypes[] | []>([])
  const [surveyData, setSurveyData] = useState<SurveyCategoryTypes[] | null>(
    null
  )

  const { supabase, session, systemUsers } = useSupabase()
  const { setToast } = useFilter()

  const user: AccountTypes = systemUsers.find(
    (user: AccountTypes) => user.id === session.user.id
  )

  const handleSubmitRemarks = async () => {
    if (remarks.trim().length === 0) {
      return
    }

    setSaving(true)

    try {
      const newData = {
        profile_id: details.id,
        user_id: session.user.id,
        timestamp: format(new Date(), 'yyyy-MM-dd h:mm a'),
        user: `${user.firstname} ${user.middlename || ''} ${
          user.lastname || ''
        }`,
        remarks: remarks,
        type: '',
      }

      const { data, error } = await supabase
        .from('ddm_profile_remarks')
        .insert(newData)
        .select()

      if (error) throw new Error(error.message)

      // Append new remarks to list
      setRemarksLists([...remarksLists, { ...newData, id: data[0].id }])
    } catch (error) {
      console.error(error)
    } finally {
      setRemarks('')
      setSaving(false)
    }
  }

  const handleSubmitService = async () => {
    if (service.trim().length === 0 || serviceDate === '') {
      setToast('error', 'Service availed and Date are required')
      return
    }

    setSaving(true)

    try {
      const newData = {
        profile_id: details.id,
        service_id: service,
        date: serviceDate,
        amount: serviceAmount,
      }

      const { data, error } = await supabase
        .from('ddm_profile_services_availed')
        .insert(newData)
        .select('*, service:service_id(name)')

      if (error) throw new Error(error.message)

      console.log([...servicesLists, { ...data }])

      // Append new remarks to list
      setServicesLists([...servicesLists, { ...data[0] }])
    } catch (error) {
      console.error(error)
    } finally {
      setRemarks('')
      setSaving(false)
    }
  }

  const handleUpdateCategory = async (type: string, category: string) => {
    // update category
    try {
      const { error } = await supabase.from('ddm_profile_categories').upsert(
        {
          profile_id: details.id,
          category,
          type,
          survey_id: filterSurvey,
        },
        { onConflict: 'type,survey_id,profile_id', ignoreDuplicates: false }
      )

      if (error) throw new Error(error.message)

      let originalCategory = ''
      if (type === 'Core') {
        originalCategory = coreCategory
        setCoreCategory(category)
      }
      if (type === 'BLC') {
        originalCategory = blcCategory
        setBlcCategory(category)
      }
      if (type === 'Province') {
        originalCategory = provinceCategory
        setProvinceCategory(category)
      }

      // add to logs
      const newRemarks = {
        profile_id: details.id,
        user_id: session.user.id,
        timestamp: format(new Date(), 'yyyy-MM-dd h:mm a'),
        user: `${user.firstname} ${user.middlename || ''} ${
          user.lastname || ''
        }`,
        remarks: `Category updated ${type} from ${originalCategory} to ${category}`,
        type: 'system',
      }

      const { error: error2 } = await supabase
        .from('ddm_profile_remarks')
        .insert(newRemarks)

      if (error2) throw new Error(error2.message)

      setToast('success', 'Successfully saved!')
      setRefetch(!refetch)
    } catch (e) {
      setToast('error', 'Something went wrong')
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
    // Fetch remarks
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('ddm_profile_remarks')
        .select()
        .eq('profile_id', details.id)

      setRemarksLists(data)
      setLoading(false)
    })()

    // Fetch services
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('ddm_profile_services').select('*')

      setServices(data)
      setLoading(false)
    })()

    // Fetch services availed
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('ddm_profile_services_availed')
        .select('*, service:service_id(name)')
        .eq('profile_id', details.id)

      setServicesLists(data)
      setLoading(false)
    })()

    // Surveys data
    ;(async () => {
      const result = await supabase
        .from('ddm_profile_surveys')
        .select()
        .order('id', { ascending: false })

      setSurveys(result.data)
      setFilterSurvey(result.data[0].id) //default selected survey
    })()
  }, [refetch])

  useEffect(() => {
    // Survey category data
    ;(async () => {
      if (filterSurvey) {
        const cat = await supabase
          .from('ddm_profile_categories')
          .select()
          .eq('survey_id', filterSurvey)
          .eq('profile_id', details.id)

        setSurveyData(cat.data)

        const core = cat.data.find(
          (obj: SurveyCategoryTypes) => obj.type === 'Core'
        )?.category
        const blc = cat.data.find(
          (obj: SurveyCategoryTypes) => obj.type === 'BLC'
        )?.category
        const prov = cat.data.find(
          (obj: SurveyCategoryTypes) => obj.type === 'Province'
        )?.category

        // Set categories
        setCoreCategory(core)
        setBlcCategory(blc)
        setProvinceCategory(prov)
      }
    })()
  }, [filterSurvey])

  return (
    <>
      <div
        ref={wrapperRef}
        className="app__modal_wrapper">
        <div className="app__modal_wrapper2_large">
          <div className="app__modal_wrapper3">
            <div className="app__modal_header">
              <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
                Profile Details
              </h5>
              <div className="flex space-x-2">
                <CustomButton
                  containerStyles="app__btn_gray"
                  title="Close"
                  btnType="button"
                  handleClick={hideModal}
                />
              </div>
            </div>

            <div className="modal-body relative overflow-x-scroll">
              {/* Document Details */}
              <div className="px-2 pt-2 pb-8 grid md:grid-cols-2 gap-2">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="px-2 py-2 font-light text-right text-xs">
                        Fullname:
                      </td>
                      <td>
                        <span className="font-medium">{details.fullname}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 font-light text-right text-xs">
                        ID:
                      </td>
                      <td>{details.id}</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 font-light text-right text-xs">
                        Gov&apos;t Position:
                      </td>
                      <td>
                        <Position
                          position={details.position}
                          id={details.id}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 font-light text-right text-xs">
                        Address:
                      </td>
                      <td>
                        <span className="font-medium">
                          {details.purok}, {details.address}
                        </span>
                      </td>
                    </tr>
                    {/* <tr>
                      <td className="px-2 py-2 font-light text-right text-xs">
                        BL Coordinator
                      </td>
                      <td>
                        <Coordinator
                          profileId={details.id}
                          coordinator={details.coordinator}
                        />
                      </td>
                    </tr> */}
                  </tbody>
                </table>
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="px-2 py-2 font-light text-right text-xs align-top">
                        Survey&nbsp;Batch:
                      </td>
                      <td className="align-top">
                        <select
                          value={filterSurvey}
                          onChange={(e) => setFilterSurvey(e.target.value)}
                          className="app__input_standard !w-40">
                          {surveys.map((h: ProfileSurveyTypes, i: number) => (
                            <option
                              key={i}
                              value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 font-light text-right text-xs"></td>
                      <td>
                        <div className="w-80 pt-1 pb-3 space-y-1">
                          <div className="flex space-x-2 items-center">
                            <span className="font-light text-xs">Core:</span>
                            <select
                              value={coreCategory}
                              onChange={(e) =>
                                handleUpdateCategory('Core', e.target.value)
                              }>
                              {profileCategories.map((c) => (
                                <option
                                  key={nanoid()}
                                  value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex space-x-2 items-center">
                            <span className="font-light text-xs">BLC:</span>
                            <select
                              value={blcCategory}
                              onChange={(e) =>
                                handleUpdateCategory('BLC', e.target.value)
                              }>
                              {profileCategories.map((c) => (
                                <option
                                  key={nanoid()}
                                  value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex space-x-2 items-center">
                            <span className="font-light text-xs">
                              Province:
                            </span>
                            <select
                              value={provinceCategory}
                              onChange={(e) =>
                                handleUpdateCategory('Province', e.target.value)
                              }>
                              {profileCategories.map((c) => (
                                <option
                                  key={nanoid()}
                                  value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <hr />
              <div className="w-full relative">
                <div className="mx-2 mb-10 outline-none overflow-x-hidden overflow-y-auto text-xs text-gray-600 ">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-gray-100 w-full">
                      <div className="flex space-x-2 px-4 py-4">
                        <span className="font-bold">Remarks:</span>
                      </div>
                      {loading && <TwoColTableLoading />}
                      {!loading && (
                        <>
                          {/* Remarks Box */}
                          <div className="w-full flex-col space-y-2 px-4 mb-5 text-xs text-gray-600">
                            <textarea
                              onChange={(e) => setRemarks(e.target.value)}
                              value={remarks}
                              placeholder="Write your remarks here.."
                              className="w-full h-20 border resize-none focus:ring-0 focus:outline-none p-2 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                            />
                            <div className="flex items-start">
                              <CustomButton
                                containerStyles="app__btn_green"
                                title="Submit"
                                isDisabled={saving}
                                handleClick={handleSubmitRemarks}
                                btnType="button"
                              />
                            </div>
                          </div>
                          {remarksLists.length > 0 ? (
                            remarksLists.map((remarks, idx) => (
                              <RemarksList
                                key={idx}
                                refetch={() => setRefetch(!refetch)}
                                remarks={remarks}
                              />
                            ))
                          ) : (
                            <div className="px-4 pb-4 text-center">
                              No remarks added yet.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="bg-gray-100 w-full">
                      <div className="flex space-x-2 px-4 py-4">
                        <span className="font-bold">Services Availed:</span>
                      </div>
                      {loading && <TwoColTableLoading />}
                      {!loading && (
                        <>
                          <div className="w-full flex-col space-y-2 px-4 mb-5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            <div className="flex space-x-2">
                              <div>
                                <div>Service Availed:</div>
                                <select
                                  onChange={(e) => setService(e.target.value)}
                                  value={service}
                                  className="w-32 border outline-none p-2 text-sm text-gray-700">
                                  <option value="">Choose</option>
                                  {services.map((s, i) => (
                                    <option
                                      key={i}
                                      value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <div>Date Availed:</div>
                                <input
                                  type="date"
                                  onChange={(e) =>
                                    setServiceDate(e.target.value)
                                  }
                                  value={serviceDate}
                                  className="w-32 border outline-none p-2 text-sm text-gray-700"
                                />
                              </div>
                              <div>
                                <div>Amount:</div>
                                <input
                                  type="number"
                                  step="any"
                                  onChange={(e) =>
                                    setServiceAmount(e.target.value)
                                  }
                                  value={serviceAmount}
                                  className="w-20 border outline-none p-2 text-sm text-gray-700"
                                />
                              </div>
                            </div>
                            <div className="flex items-start">
                              <CustomButton
                                containerStyles="app__btn_green ml-2"
                                title="Submit"
                                isDisabled={saving}
                                handleClick={handleSubmitService}
                                btnType="button"
                              />
                            </div>
                          </div>
                          {servicesLists.length > 0 ? (
                            servicesLists.map((serv, idx) => (
                              <ServicesList
                                key={idx}
                                refetch={() => setRefetch(!refetch)}
                                service={serv}
                                profile={details}
                              />
                            ))
                          ) : (
                            <div className="px-4 pb-4 text-center">
                              No services availed yet.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
