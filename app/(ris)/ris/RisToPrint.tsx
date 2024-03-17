/* eslint-disable react/display-name */
'use client'

import { RisTypes } from '@/types'
import { format } from 'date-fns'
import Image from 'next/image'
import React from 'react'

interface ChildProps {
  forwardedRef: React.ForwardedRef<HTMLDivElement>
  ris: RisTypes
}

const RisToPrint: React.FC<ChildProps> = ({ forwardedRef, ris }) => {
  return (
    <div
      ref={forwardedRef}
      className="w-[450px]">
      <div className="">
        <div className="text-base text-center font-bold">RIS</div>
        <div className="text-[10px] text-center">
          AGRICULTURE KEEPS ORGANIC{' '}
        </div>
        <div className="text-[10px] font-light mt-2">
          <table className="w-full">
            <thead>
              <tr className="border-t border-b border-gray-700">
                <td>Qty</td>
                <td>Description</td>
                <td>Amount</td>
              </tr>
            </thead>
            <tbody>
              <tr className="align-top">
                <td>asdfasdf</td>
                <td>
                  <div>asdfsdf</div>
                </td>
                <td>asdf</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-[8px] mt-1 px-4">
          <span>{format(new Date(), 'MM/dd/yyyy')}</span>
          <span>{format(new Date(), 'p')}</span>
        </div>
        <div className="flex items-center justify-center relative mt-2">
          <Image
            src="/qr.png"
            width={80}
            height={80}
            priority={true}
            alt="Logo QR"
          />
        </div>
      </div>
    </div>
  )
}
export default RisToPrint
