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

  // Only Approved R.I.S. can be printed
  const printableRis = selectedRis.filter((r) => r.status === 'Approved')
  const excludedCount = selectedRis.length - printableRis.length

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

  if (printableRis.length === 0) {
    return (
      <button
        className="app__btn_blue"
        disabled
        title="Pending R.I.S. cannot be printed"
        type="button">
        Print Selected (0)
      </button>
    )
  }

  return (
    <>
      {excludedCount > 0 && (
        <div className="self-center text-xs text-red-500 font-medium">
          {excludedCount} pending R.I.S. excluded from printing
        </div>
      )}
      <ReactToPrint
        trigger={() => (
          <button className="app__btn_blue">
            Print Selected ({printableRis.length})
          </button>
        )}
        content={() => document.getElementById('print-container')}
      />
      <div className="hidden">
        <div id="print-container">
          {printableRis.map((r, idx) => (
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
