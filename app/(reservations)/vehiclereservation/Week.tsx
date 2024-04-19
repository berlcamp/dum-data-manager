import { HoursTypes, ListTypes, ReservationTypes } from '@/types'
import { generateTimeArray } from '@/utils/text-helper'
import {
  addDays,
  addHours,
  format,
  isAfter,
  isBefore,
  isEqual,
  parse,
  subDays,
} from 'date-fns'
import { useEffect, useState } from 'react'
import AddEditModal from './AddEditModal'

interface PageProps {
  data: ReservationTypes[]
}

export default function Week({ data }: PageProps) {
  // List
  const [list, setList] = useState<ListTypes[] | []>([])

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ReservationTypes | null>(
    null
  )

  const handleEdit = (item: ReservationTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }

  // Update list whenever list in redux updates
  useEffect(() => {
    // Create 7 days list
    const d = new Date()
    let currentDate = subDays(d, 2)
    const newDate = addDays(d, 5)
    const listArray: ListTypes[] = []
    const hours = generateTimeArray(true)

    while (currentDate < newDate) {
      if (data && data.length > 0) {
        const hoursArray: HoursTypes[] = []
        hours.forEach((h) => {
          const filtered = data.filter((i: ReservationTypes) => {
            const time1 = parse(i.time, 'h:mm a', new Date('1970-01-01'))
            const time2 = parse(h, 'h a', new Date('1970-01-01'))
            const time3 = addHours(parse(h, 'h a', new Date('1970-01-01')), 1)

            const areTimesEqual = isEqual(time1, time2) // Check if the times are equal
            const isTime1AfterTime2 = isAfter(time1, time2) // Check if time1 is after time2
            const isTime1BeforeTime3 = isBefore(time1, time3) // Check if time1 is before time3
            if (
              format(new Date(i.date), 'yyyy-MM-dd') ===
                format(new Date(currentDate), 'yyyy-MM-dd') &&
              (areTimesEqual || (isTime1AfterTime2 && isTime1BeforeTime3))
            ) {
              return true
            } else {
              return false
            }
          })
          hoursArray.push({
            hour: h,
            reservations: filtered,
          })
        })

        listArray.push({
          date: format(new Date(currentDate), 'yyyy-MM-dd'),
          hours: hoursArray,
        })
      }
      currentDate = addDays(currentDate, 1)
    }
    setList(listArray)
  }, [data])

  return (
    <div className="mx-4 grid grid-cols-8">
      <div className="text-right">
        <div className="h-20 border-r"></div>
        {generateTimeArray(true).map((h) => (
          <div
            key={h}
            className="h-20 border-r border-t">
            {h}
          </div>
        ))}
      </div>
      {list.map((item, idx) => (
        <div
          key={idx}
          className="border-r border-t">
          <div className="h-20 border-b text-center space-y-2">
            <div>{format(new Date(item.date), 'EEE')}</div>
            <div>
              <span
                className={`${
                  format(new Date(item.date), 'dd') === format(new Date(), 'dd')
                    ? 'bg-blue-500 rounded-full p-2 text-lg font-bold text-white'
                    : 'p-2 text-lg'
                }`}>
                {format(new Date(item.date), 'dd')}
              </span>
            </div>
          </div>
          {item.hours.map((h, idx) => (
            <div
              key={idx}
              className="relative h-20 border-b">
              {h.reservations.map((r, idx2) => (
                <div
                  key={idx2}
                  onClick={() => handleEdit(r)}
                  className={`${
                    idx2 > 1 ? 'hidden' : ''
                  } bg-green-100 leading-none px-1 py-px mb-1 cursor-pointer`}>
                  <div className="text-[11px] ">
                    {r.vehicle?.name} {r.vehicle?.plate_number}
                  </div>
                  <div className="text-[10px]">{r.time}</div>
                  {h.reservations.length > 2 && idx2 === 1 && (
                    <div className="absolute top-0 right-0">
                      <span className="bg-blue-600 text-white rounded-sm px-1 font-semibold text-[9px]">
                        See All ({h.reservations.length})
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddEditModal
          editData={selectedItem}
          hideModal={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
