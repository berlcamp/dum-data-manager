'use client'

import { Button } from '@/components/ui/button'
import type { ReservationTypes } from '@/types'
import { useEffect, useRef } from 'react'
import ListView from './ListView'

interface ModalProps {
  hideModal: () => void
  data: ReservationTypes[]
  onEdit: (item: ReservationTypes) => void
}

export default function ListModal({ hideModal, data, onEdit }: ModalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

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
  }, [wrapperRef])

  return (
    <div
      ref={wrapperRef}
      className="app__modal_wrapper">
      <div className="app__modal_wrapper2_large">
        <div className="app__modal_wrapper3">
          <div className="app__modal_header">
            <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
              Reservations
            </h5>
            <Button variant="outline" size="sm" onClick={hideModal}>
              Close
            </Button>
          </div>

          <div className="app__modal_body">
            <ListView data={data} onEdit={onEdit} />
          </div>
        </div>
      </div>
    </div>
  )
}
