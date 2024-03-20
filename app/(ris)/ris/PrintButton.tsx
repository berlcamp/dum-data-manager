/* eslint-disable react/display-name */
'use client'

import { CustomButton } from '@/components/index'
import { RisTypes } from '@/types'
import React, { forwardRef, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import RisToPrint from './RisToPrint'

interface ModalProps {
  ris: RisTypes
}

interface ChildProps {
  forwardedRef: React.ForwardedRef<HTMLDivElement>
  ris: RisTypes
}

export default function PrintButton({ ris }: ModalProps) {
  const componentRef = useRef<HTMLDivElement>(null)

  // Using forwardRef to pass the ref down to the ChildComponent
  const ChildWithRef = forwardRef<HTMLDivElement, ChildProps>((props, ref) => {
    return (
      <div style={{ display: 'none' }}>
        <RisToPrint
          {...props}
          forwardedRef={ref}
          ris={ris}
        />
      </div>
    )
  })

  const print = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'Print RIS',
  })

  const handlePrint = () => {
    print()
  }

  return (
    <>
      <CustomButton
        btnType="button"
        title="Print"
        handleClick={handlePrint}
        containerStyles="app__btn_blue_xs"
      />

      <ChildWithRef
        ris={ris}
        ref={componentRef}
        forwardedRef={null}
      />
    </>
  )
}
