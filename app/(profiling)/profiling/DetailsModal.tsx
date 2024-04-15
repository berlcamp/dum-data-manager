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
import type { AccountTypes, ProfileRemarksTypes, ProfileTypes } from '@/types'
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

const Category = ({
  category,
  id,
  refetch,
}: {
  category: string
  id: string
  refetch: () => void
}) => {
  const { setToast } = useFilter()

  const [editMode, setEditMode] = useState(false)
  const [origCategory, setOrigCategory] = useState(category)
  const [newCategory, setNewCategory] = useState(category)
  const [saving, setSaving] = useState(false)

  const { supabase, session, systemUsers } = useSupabase()
  const user: AccountTypes = systemUsers.find(
    (user: AccountTypes) => user.id === session.user.id
  )

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const handleUpdateCategory = async (newCat: string) => {
    setNewCategory(newCat)

    if (origCategory === newCat) {
      return
    }

    setSaving(true)

    try {
      const newData = {
        category: newCat,
      }

      const { error } = await supabase
        .from('ddm_profiles')
        .update(newData)
        .eq('id', id)

      if (error) throw new Error(error.message)

      const newRemarks = {
        profile_id: id,
        user_id: session.user.id,
        timestamp: format(new Date(), 'yyyy-MM-dd h:mm a'),
        user: `${user.firstname} ${user.middlename || ''} ${
          user.lastname || ''
        }`,
        remarks: `Category updated from ${origCategory} to ${newCat}`,
        type: 'system',
      }

      const { error: error2 } = await supabase
        .from('ddm_profile_remarks')
        .insert(newRemarks)
        .select()

      if (error2) throw new Error(error2.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        ...newData,
        id,
      }
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      items[foundIndex] = { ...items[foundIndex], ...updatedData }
      dispatch(updateList(items))

      setOrigCategory(newCat)
      setToast('success', 'Category saved successfully')
      refetch()
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
          <span>{origCategory}</span>
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
          value={newCategory}
          onChange={(e) => handleUpdateCategory(e.target.value)}>
          {profileCategories.map((c) => (
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

  const [refetch, setRefetch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const { supabase, session, systemUsers } = useSupabase()
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
  }, [refetch])

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
              <div className="py-2">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="w-40"></th>
                      <th></th>
                    </tr>
                  </thead>
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
                        Category:
                      </td>
                      <td>
                        <Category
                          category={details.category}
                          id={details.id}
                          refetch={() => setRefetch(!refetch)}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 font-light text-right text-xs">
                        Position:
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
                  </tbody>
                </table>
              </div>
              <hr />
              <div className="w-full relative">
                <div className="mx-2 mb-10 outline-none overflow-x-hidden overflow-y-auto text-xs text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400">
                  <div className="flex space-x-2 px-4 py-4">
                    <span className="font-bold">Remarks:</span>
                  </div>
                  {loading && <TwoColTableLoading />}
                  {!loading && (
                    <>
                      {/* Remarks Box */}
                      <div className="w-full flex-col space-y-2 px-4 mb-5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        <textarea
                          onChange={(e) => setRemarks(e.target.value)}
                          value={remarks}
                          placeholder="Write your remarks here.."
                          className="w-full h-20 border resize-none focus:ring-0 focus:outline-none p-2 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        />
                        <div className="flex items-start">
                          <span className="flex-1">&nbsp;</span>

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
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
