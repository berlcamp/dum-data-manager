/* eslint-disable react/display-name */
'use client'

import { CustomButton } from '@/components/index'
import { useSupabase } from '@/context/SupabaseProvider'
import { AccountTypes, RisTypes } from '@/types'
import React, { forwardRef, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import RisToPrint from './RisToPrint'

interface ModalProps {
  hideModal: () => void
  ris: RisTypes
}

interface ChildProps {
  forwardedRef: React.ForwardedRef<HTMLDivElement>
  ris: RisTypes
}

export default function PrintModal({ hideModal, ris }: ModalProps) {
  // Active user
  const { currentUser } = useSupabase()
  const activeUser: AccountTypes = currentUser

  const componentRef = useRef<HTMLDivElement>(null)

  // Using forwardRef to pass the ref down to the ChildComponent
  const ChildWithRef = forwardRef<HTMLDivElement, ChildProps>((props, ref) => {
    return (
      <RisToPrint
        {...props}
        forwardedRef={ref}
        ris={ris}
      />
    )
  })

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'Print Example',
  })

  return (
    <>
      <div className="app__modal_wrapper">
        <div className="app__modal_wrapper2">
          <div className="app__modal_wrapper3">
            <div className="app__modal_header">
              <h5 className="app__modal_header_text">Print RIS</h5>
              <CustomButton
                btnType="button"
                title="Close"
                handleClick={hideModal}
                containerStyles="app__btn_gray"
              />
            </div>

            <div className="app__modal_body">
              <div className="mt-4 mb-8 text-center text-xl space-x-4">
                <CustomButton
                  btnType="button"
                  title="Print RIS"
                  handleClick={handlePrint}
                  containerStyles="app__btn_green"
                />
                <CustomButton
                  btnType="button"
                  title="Close"
                  handleClick={hideModal}
                  containerStyles="app__btn_gray"
                />
              </div>
              <div className="flex items-center justify-center mx-auto relative border border-gray-700 w-[200px]">
                <ChildWithRef
                  ris={ris}
                  ref={componentRef}
                  forwardedRef={null}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
