/* eslint-disable react/display-name */
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RisTypes } from '@/types'
import React, { forwardRef, useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import RisToPrint, { SlipAlignment } from './RisToPrint'

interface ModalProps {
  selectedRis: RisTypes[]
}

interface ChildProps {
  forwardedRef: React.ForwardedRef<HTMLDivElement>
  ris: RisTypes
  alignment: SlipAlignment
}

const alignmentOptions: { value: SlipAlignment; label: string }[] = [
  { value: 'center', label: 'Center' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
]

export default function PrintAllChecked({ selectedRis }: ModalProps) {
  const componentRef = useRef<HTMLDivElement>(null)
  const printContainerRef = useRef<HTMLDivElement>(null)
  const [showAlignment, setShowAlignment] = useState(false)
  const [alignment, setAlignment] = useState<SlipAlignment>('center')

  // Only Approved R.I.S. can be printed
  const printableRis = selectedRis.filter((r) => r.status === 'Approved')
  const excludedCount = selectedRis.length - printableRis.length

  const print = useReactToPrint({
    content: () => printContainerRef.current,
  })

  const handlePrint = () => {
    setShowAlignment(false)
    print()
  }

  // Using forwardRef to pass the ref down to the ChildComponent
  const ChildWithRef = forwardRef<HTMLDivElement, ChildProps>((props, ref) => {
    return (
      <div style={{ pageBreakBefore: 'always' }}>
        <RisToPrint
          {...props}
          forwardedRef={ref}
          ris={props.ris}
          alignment={props.alignment}
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
      <button
        className="app__btn_blue"
        type="button"
        onClick={() => {
          setAlignment('center')
          setShowAlignment(true)
        }}>
        Print Selected ({printableRis.length})
      </button>
      <Dialog
        open={showAlignment}
        onOpenChange={setShowAlignment}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Print Slip</DialogTitle>
            <DialogDescription>
              Choose where the slip is placed on the page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex space-x-2">
            {alignmentOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAlignment(option.value)}
                className={`flex-1 ${
                  alignment === option.value
                    ? 'app__btn_blue'
                    : 'app__btn_gray'
                }`}>
                {option.label}
              </button>
            ))}
          </div>
          <DialogFooter>
            <button
              type="button"
              className="app__btn_gray"
              onClick={() => setShowAlignment(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="app__btn_blue"
              onClick={handlePrint}>
              Print ({printableRis.length})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="hidden">
        <div
          id="print-container"
          ref={printContainerRef}>
          {printableRis.map((r, idx) => (
            <ChildWithRef
              key={idx}
              ris={r}
              alignment={alignment}
              ref={componentRef}
              forwardedRef={null}
            />
          ))}
        </div>
      </div>
    </>
  )
}
