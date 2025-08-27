'use client'

import { CustomButton } from '@/components/index'
import { docRouting, statusList } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { updateList } from '@/GlobalRedux/Features/listSlice'
import type { AccountTypes, DocumentTypes } from '@/types'
import { Menu, Transition } from '@headlessui/react'
import { format } from 'date-fns'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Attachment from './Attachment'
import Remarks from './Remarks'
import RouteLogs from './RouteLogs'

interface ModalProps {
  hideModal: () => void
  handleEdit: (item: DocumentTypes) => void
  documentDataProp: DocumentTypes
}

export default function TrackerModal({
  hideModal,
  handleEdit,
  documentDataProp,
}: ModalProps) {
  //
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { setToast } = useFilter()
  const { supabase, session, systemUsers } = useSupabase()

  const user: AccountTypes = systemUsers.find(
    (user: AccountTypes) => user.id === session.user.id
  )

  // states
  const [documentData, setDocumentData] = useState(documentDataProp) // create state for document data so we can mutate the data when there is updates in redux

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const getStatusColor = (status: string): string => {
    const statusArr = statusList?.filter((item) => item.status === status)
    if (statusArr.length > 0) {
      return statusArr[0].color
    } else {
      return '#000000'
    }
  }

  const handleChangeLocation = async (
    item: DocumentTypes,
    location: string
  ) => {
    if (item.location === location) {
      return
    }

    try {
      const { error } = await supabase
        .from('ddm_trackers')
        .update({ location })
        .eq('id', item.id)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        id: item.id,
        location,
      }
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      items[foundIndex] = { ...items[foundIndex], ...updatedData }
      dispatch(updateList(items))

      // Add tracker route logs if route is changed
      const trackerRoutes = {
        tracker_id: item.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'h:mm a'),
        user_id: session.user.id,
        user: `${user.firstname} ${user.middlename || ''} ${
          user.lastname || ''
        }`,
        user_department: `${user.department || ''}`,
        title: location,
        message: '',
      }

      await supabase.from('ddm_tracker_routes').insert(trackerRoutes)

      // pop up the success message
      setToast('success', 'Successfully Saved.')
    } catch (error) {
      console.error(error)
    }
  }

  const handleChangeStatus = async (item: DocumentTypes, status: string) => {
    const { error } = await supabase
      .from('ddm_trackers')
      .update({ status })
      .eq('id', item.id)

    await supabase.from('ddm_tracker_routes').insert({
      tracker_id: item.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'h:mm a'),
      user_id: session.user.id,
      user: `${user.firstname} ${user.middlename || ''} ${user.lastname || ''}`,
      user_department: `${user.department || ''}`,
      title: 'Details updated',
      message: [
        {
          field: 'Status',
          before: item.status,
          after: status,
        },
      ],
    })

    // Append new data in redux
    const items = [...globallist]
    const updatedData = {
      status,
      id: item.id,
    }
    const foundIndex = items.findIndex((x) => x.id === updatedData.id)
    items[foundIndex] = { ...items[foundIndex], ...updatedData }
    dispatch(updateList(items))

    // pop up the success message
    setToast('success', 'Successfully Saved.')
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

  // Update data whenever list in redux updates
  useEffect(() => {
    const updatedData = globallist.find(
      (item: DocumentTypes) =>
        item.id.toString() === documentDataProp.id.toString()
    )
    setDocumentData(updatedData)
  }, [globallist])

  return (
    <>
      <div
        ref={wrapperRef}
        className="app__modal_wrapper">
        <div className="app__modal_wrapper2_large">
          <div className="app__modal_wrapper3">
            <div className="app__modal_header">
              <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
                Tracker
              </h5>
              <div className="flex space-x-2">
                <CustomButton
                  containerStyles="app__btn_blue"
                  title="Edit Details"
                  btnType="button"
                  handleClick={() => handleEdit(documentData)}
                />
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
                <div className="flex flex-col lg:flex-row w-full items-start justify-between space-x-2 text-xs dark:text-gray-400">
                  <div className="px-4 w-full">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="w-40"></th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-2 font-light text-right">
                            Routing No:
                          </td>
                          <td>
                            <span className="font-medium text-sm">
                              {documentData.routing_slip_no}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 font-light text-right">
                            Type:
                          </td>
                          <td className="text-sm font-medium">
                            {documentData.type}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 font-light text-right">
                            Date Received:
                          </td>
                          <td className="text-sm font-medium">
                            {documentData.date_received &&
                              format(
                                new Date(documentData.date_received),
                                'PPP'
                              )}
                          </td>
                        </tr>
                        {documentData.activity_date && (
                          <tr>
                            <td className="px-2 py-2 font-light text-right">
                              Activity Date:
                            </td>
                            <td className="text-sm font-medium">
                              {format(
                                new Date(documentData.activity_date),
                                'PPP'
                              )}
                            </td>
                          </tr>
                        )}
                        {documentData.agency && (
                          <tr>
                            <td className="px-2 py-2 font-light text-right">
                              Requesting Department/Agency:
                            </td>
                            <td className="text-sm font-medium">
                              {documentData.agency || ''}
                            </td>
                          </tr>
                        )}
                        {documentData.requester && (
                          <tr>
                            <td className="px-2 py-2 font-light text-right">
                              Requester Name/Payee:
                            </td>
                            <td className="text-sm font-medium">
                              {documentData.requester || ''}
                            </td>
                          </tr>
                        )}
                        {documentData.cheque_no && (
                          <tr>
                            <td className="px-2 py-2 font-light text-right">
                              Cheque No:
                            </td>
                            <td className="text-sm font-medium">
                              {documentData.cheque_no || ''}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-2 py-2 font-light text-right align-top">
                            Amount:
                          </td>
                          <td className="text-sm font-medium">
                            {documentData.amount &&
                              Number(documentData.amount).toLocaleString(
                                'en-US',
                                {
                                  minimumFractionDigits: 2, // Minimum number of decimal places
                                  maximumFractionDigits: 2, // Maximum number of decimal places
                                }
                              )}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 font-light text-right align-top">
                            Particulars:
                          </td>
                          <td className="text-sm font-medium">
                            {documentData.particulars}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="px-2 w-full">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="w-40"></th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-2 font-light text-right">
                            Status:
                          </td>
                          <td>
                            <div className="flex items-center">
                              <Menu
                                as="div"
                                className="app__menu_container font-normal text-gray-600">
                                <div>
                                  <Menu.Button className="app__dropdown_btn">
                                    <span
                                      className="font-bold"
                                      style={{
                                        color: getStatusColor(
                                          documentData.status
                                        ),
                                      }}>
                                      {documentData.status}
                                    </span>
                                    <ChevronDownIcon
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                    />
                                  </Menu.Button>
                                </div>

                                <Transition
                                  as={Fragment}
                                  enter="transition ease-out duration-100"
                                  enterFrom="transform opacity-0 scale-95"
                                  enterTo="transform opacity-100 scale-100"
                                  leave="transition ease-in duration-75"
                                  leaveFrom="transform opacity-100 scale-100"
                                  leaveTo="transform opacity-0 scale-95">
                                  <Menu.Items className="absolute right-0 z-30 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                    <div className="py-1">
                                      {statusList.map((i, idx) => (
                                        <Menu.Item key={idx}>
                                          <div
                                            onClick={() =>
                                              handleChangeStatus(
                                                documentData,
                                                i.status
                                              )
                                            }
                                            className="flex items-center justify-between space-x-2 cursor-pointer hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2 text-xs">
                                            <span>{i.status}</span>
                                            {i.status ===
                                              documentData.status && (
                                              <CheckIcon className="w-4 h-4" />
                                            )}
                                          </div>
                                        </Menu.Item>
                                      ))}
                                    </div>
                                  </Menu.Items>
                                </Transition>
                              </Menu>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 font-light text-right">
                            Current Location:
                          </td>
                          <td className="text-sm font-medium">
                            <Menu
                              as="div"
                              className="app__menu_container font-normal text-gray-600">
                              <div>
                                <Menu.Button className="app__dropdown_btn">
                                  <span className="font-bold">
                                    {documentData.location}
                                  </span>
                                  <ChevronDownIcon
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                </Menu.Button>
                              </div>

                              <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95">
                                <Menu.Items className="absolute right-0 z-30 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                  <div className="py-1">
                                    {docRouting.map((route, idx) => (
                                      <Menu.Item key={idx}>
                                        <div
                                          onClick={() =>
                                            handleChangeLocation(
                                              documentData,
                                              route.status
                                            )
                                          }
                                          className="flex items-center justify-between space-x-2 cursor-pointer hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2 text-xs">
                                          <span>{route.status}</span>
                                          {route.status ===
                                            documentData.location && (
                                            <CheckIcon className="w-4 h-4" />
                                          )}
                                        </div>
                                      </Menu.Item>
                                    ))}
                                  </div>
                                </Menu.Items>
                              </Transition>
                            </Menu>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 font-light text-right">
                            Created at:
                          </td>
                          <td className="text-sm font-medium">
                            {documentData.origin_department} Office
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 font-light text-right">
                            Attachments:
                          </td>
                          <td className="px-2 pt-2 font-light text-left align-top">
                            <div>
                              {documentData.attachments?.length === 0 && (
                                <span>No attachments</span>
                              )}
                              {documentData.attachments && (
                                <div>
                                  {documentData.attachments?.map(
                                    (file, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center space-x-2 justify-start">
                                        <Attachment
                                          file={file.name}
                                          id={documentData.id}
                                        />
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <hr />
              <div className="py-2 md:flex">
                <div className="md:w-1/2">
                  <div className="mx-2 px-4 py-4 text-gray-600 bg-gray-100">
                    <RouteLogs documentData={documentData} />
                  </div>
                </div>
                <div className="flex-1">
                  <Remarks documentData={documentData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
