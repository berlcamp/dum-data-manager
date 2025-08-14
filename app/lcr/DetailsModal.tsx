'use client'

import { CustomButton } from '@/components/index'
import type { LcrTypes } from '@/types'
import { format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

interface ModalProps {
  hideModal: () => void
  handleEdit: (item: LcrTypes) => void
  documentDataProp: LcrTypes
}

export default function DetailsModal({
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
      (item: LcrTypes) => item.id.toString() === documentDataProp.id.toString()
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
                            Type
                          </td>
                          <td>
                            <span className="font-medium text-sm">
                              {documentData.type}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-2 py-2 font-light text-right">
                            Date Registered:
                          </td>
                          <td className="text-sm font-medium">
                            {documentData.date &&
                              format(new Date(documentData.date), 'PPP')}
                          </td>
                        </tr>
                        {documentData.firstname && (
                          <tr>
                            <td className="px-2 py-2 font-light text-right">
                              Name
                            </td>
                            <td className="text-sm font-medium">
                              {documentData.firstname} {documentData.middlename}{' '}
                              {documentData.lastname}
                            </td>
                          </tr>
                        )}
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
                        {documentData.father_name && (
                          <tr>
                            <td className="px-2 py-2 font-light text-right">
                              Parents
                            </td>
                            <td className="text-sm font-medium">
                              <div>Father: {documentData.father_name} </div>
                              <div>Mother: {documentData.mother_name}</div>
                            </td>
                          </tr>
                        )}
                        {documentData.husband_firstname && (
                          <tr>
                            <td className="px-2 py-2 font-light text-right">
                              Couple
                            </td>
                            <td className="text-sm font-medium">
                              <div>
                                Husband: {documentData.husband_lastname},{' '}
                                {documentData.husband_firstname}{' '}
                                {documentData.husband_middlename}
                              </div>
                              <div>
                                Wife: {documentData.wife_lastname},{' '}
                                {documentData.wife_firstname}{' '}
                                {documentData.wife_middlename}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <hr />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
