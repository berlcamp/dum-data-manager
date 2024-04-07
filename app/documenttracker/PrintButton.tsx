/* eslint-disable react/display-name */
'use client'

import { CustomButton } from '@/components/index'
import { DocumentTypes } from '@/types'
import React, { forwardRef, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import PrintSlip from './PrintSlip'

interface ModalProps {
  hideModal: () => void
  document: DocumentTypes
}

interface ChildProps {
  forwardedRef: React.ForwardedRef<HTMLDivElement>
  document: DocumentTypes
}

export default function PrintButton({ document, hideModal }: ModalProps) {
  const componentRef = useRef<HTMLDivElement>(null)

  // Using forwardRef to pass the ref down to the ChildComponent
  const ChildWithRef = forwardRef<HTMLDivElement, ChildProps>((props, ref) => {
    return (
      <div className="flex justify-center">
        <PrintSlip
          {...props}
          forwardedRef={ref}
          document={document}
        />
      </div>
    )
  })

  const print = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'Print Slip',
  })

  const handlePrint = () => {
    print()
  }

  return (
    <>
      <div className="app__modal_wrapper">
        <div className="app__modal_wrapper2">
          <div className="app__modal_wrapper3">
            <div className="app__modal_header">
              <h5 className="app__modal_header_text">Print Slip</h5>
              <div className="flex items-center space-x-2">
                <CustomButton
                  btnType="button"
                  title="Print&nbsp;Slip"
                  handleClick={handlePrint}
                  containerStyles="app__btn_blue"
                />

                <CustomButton
                  btnType="button"
                  title="Close"
                  handleClick={hideModal}
                  containerStyles="app__btn_gray"
                />
              </div>
            </div>

            <div className="app__modal_body">
              <div className="flex justify-center">
                <ChildWithRef
                  document={document}
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
