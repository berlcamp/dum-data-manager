/* eslint-disable react/display-name */
'use client'

import { RisTypes } from '@/types'
import { format } from 'date-fns'
import React from 'react'

interface ChildProps {
  forwardedRef: React.ForwardedRef<HTMLDivElement>
  ris: RisTypes
}

const RisToPrint: React.FC<ChildProps> = ({ forwardedRef, ris }) => {
  return (
    <div
      ref={forwardedRef}
      className="w-[350px] mx-auto mt-8 text-xs">
      <table className="w-full">
        <thead>
          <tr>
            <td
              colSpan={5}
              className="text-center border border-gray-700">
              <div className="py-2 text-sm font-bold">GAS SLIP</div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              colSpan={5}
              className="text-center border border-gray-700">
              MUNICIPALITY OF DUMINGAG
            </td>
          </tr>
          <tr>
            <td
              colSpan={3}
              className="border px-1 border-gray-700">
              <span className="font-bold">OFFICE: </span>{' '}
              <span>{ris.department?.name}</span>
            </td>
            <td
              colSpan={2}
              className="border px-1 border-gray-700">
              <span className="font-bold">DATE: </span>{' '}
              <span>
                {ris.date_requested &&
                  format(new Date(ris.date_requested), 'MM/dd/yyyy')}
              </span>
            </td>
          </tr>
          <tr>
            <td
              colSpan={5}
              className="border px-1 border-gray-700">
              <span className="font-bold">TYPE OF VEHICLE:</span>{' '}
              <span>{ris.vehicle?.name}</span>
            </td>
          </tr>
          <tr>
            <td
              colSpan={5}
              className="border px-1 border-gray-700">
              <span className="font-bold">PLATE NUMBER:</span>{' '}
              <span>{ris.vehicle?.plate_number}</span>
            </td>
          </tr>
          <tr>
            <td
              colSpan={5}
              className="text-center border border-gray-700">
              <div className="py-2 text-sm font-bold">REQUISITION</div>
            </td>
          </tr>
          <tr>
            <td className="text-center border border-gray-700">Description</td>
            <td className="text-center border border-gray-700">Quantity</td>
            <td className="text-center border border-gray-700">Unit</td>
            <td className="text-center border border-gray-700">Price/Liter</td>
            <td className="text-center border border-gray-700">Amount</td>
          </tr>
          <tr>
            <td className="text-center border border-gray-700">{ris.type}</td>
            <td className="text-center border border-gray-700">
              {ris.quantity}
            </td>
            <td className="text-center border border-gray-700">Liters</td>
            <td className="text-center border border-gray-700">{ris.price}</td>
            <td className="text-center border border-gray-700">
              {(ris.total_amount || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2, // Minimum number of decimal places
                maximumFractionDigits: 2, // Maximum number of decimal places
              })}
            </td>
          </tr>
          <tr>
            <td className="text-center border border-gray-700">&nbsp;</td>
            <td className="text-center border border-gray-700"></td>
            <td className="text-center border border-gray-700"></td>
            <td className="text-center border border-gray-700"></td>
            <td className="text-center border border-gray-700"></td>
          </tr>
          <tr>
            <td className="text-center border border-gray-700">&nbsp;</td>
            <td className="text-center border border-gray-700"></td>
            <td className="text-center border border-gray-700"></td>
            <td className="text-center border border-gray-700"></td>
            <td className="text-center border border-gray-700"></td>
          </tr>
          <tr>
            <td className="text-center border border-gray-700">&nbsp;</td>
            <td className="text-center border border-gray-700"></td>
            <td className="text-center border border-gray-700"></td>
            <td className="text-center border border-gray-700"></td>
            <td className="text-center border border-gray-700"></td>
          </tr>
          <tr>
            <td
              colSpan={5}
              className="border px-1 border-gray-700">
              <div className="font-bold">Purpose:</div>
              <div className="pl-14">{ris.purpose}</div>
            </td>
          </tr>
          <tr>
            <td
              colSpan={3}
              className="border px-1 border-gray-700">
              <span className="font-bold">Approved By:</span>
            </td>
            <td
              colSpan={2}
              className="border px-1 border-gray-700">
              <span className="font-bold">Issued By:</span>
            </td>
          </tr>
          <tr>
            <td
              colSpan={3}
              className="border text-center border-gray-700">
              <div className="mt-10 font-bold">MERCY FE DE GUZMAN</div>
              <div className="italic">GSO Designee</div>
            </td>
            <td
              colSpan={2}
              className="border text-center border-gray-700">
              <div className="mt-10 font-bold">ARFEL HOPE L. BOMES</div>
              <div className="italic">MMO - STAFF</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
export default RisToPrint
