/* eslint-disable react/display-name */
'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RisTypes } from '@/types'
import { Printer } from 'lucide-react'
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
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        title="Pending R.I.S. cannot be printed">
        <Printer
          aria-hidden="true"
          className="mr-1.5 h-4 w-4"
        />
        Print (0)
      </Button>
    )
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        title={
          excludedCount > 0
            ? `${excludedCount} pending R.I.S. will be skipped`
            : undefined
        }
        onClick={() => {
          setAlignment('center')
          setShowAlignment(true)
        }}>
        <Printer
          aria-hidden="true"
          className="mr-1.5 h-4 w-4"
        />
        Print ({printableRis.length})
      </Button>
      {excludedCount > 0 && (
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
          {excludedCount} pending skipped
        </span>
      )}
      <Dialog
        open={showAlignment}
        onOpenChange={setShowAlignment}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Print Gas Slips</DialogTitle>
            <DialogDescription>
              Choose where the slip is placed on the page.
            </DialogDescription>
          </DialogHeader>
          <div
            role="radiogroup"
            aria-label="Slip alignment"
            className="grid grid-cols-3 gap-2">
            {alignmentOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={alignment === option.value}
                variant={alignment === option.value ? 'default' : 'outline'}
                onClick={() => setAlignment(option.value)}>
                {option.label}
              </Button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAlignment(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePrint}>
              <Printer
                aria-hidden="true"
                className="mr-1.5 h-4 w-4"
              />
              Print ({printableRis.length})
            </Button>
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
