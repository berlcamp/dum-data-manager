/* eslint-disable react/display-name */
'use client'

import { RisTypes } from '@/types'
import React, { forwardRef, useRef } from 'react'
import ReactToPrint from 'react-to-print'
import RisToPrint from './RisToPrint'

interface ModalProps {
  selectedRis: RisTypes[]
}

interface ChildProps {
  forwardedRef: React.ForwardedRef<HTMLDivElement>
  ris: RisTypes
}

export default function PrintAllChecked({ selectedRis }: ModalProps) {
  const componentRef = useRef<HTMLDivElement>(null)

  // Using forwardRef to pass the ref down to the ChildComponent
  const ChildWithRef = forwardRef<HTMLDivElement, ChildProps>((props, ref) => {
    return (
      <div style={{ pageBreakBefore: 'always' }}>
        <RisToPrint
          {...props}
          forwardedRef={ref}
          ris={props.ris}
        />
      </div>
    )
  })

  return (
    <>
      <ReactToPrint
        trigger={() => (
          <button className="app__btn_blue">
            Print Selected ({selectedRis.length})
          </button>
        )}
        content={() => document.getElementById('print-container')}
      />
      <div className="hidden">
        <div id="print-container">
          {selectedRis.map((r, idx) => (
            <ChildWithRef
              key={idx}
              ris={r}
              ref={componentRef}
              forwardedRef={null}
            />
          ))}
        </div>
      </div>
    </>
  )
}
