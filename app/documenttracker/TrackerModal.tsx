'use client'

import { CustomButton } from '@/components/index'
import { statusList } from '@/constants/TrackerConstants'
import type { DocumentTypes } from '@/types'
import { format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
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
                        {documentData.type === 'Letters' &&
                          documentData.activity_date && (
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
                            {documentData.amount}
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
                            <span
                              className="font-medium text-sm"
                              style={{
                                color: `${getStatusColor(documentData.status)}`,
                              }}>
                              {documentData.status}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 font-light text-right">
                            Current Location:
                          </td>
                          <td className="text-sm font-medium">
                            {documentData.location}
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
