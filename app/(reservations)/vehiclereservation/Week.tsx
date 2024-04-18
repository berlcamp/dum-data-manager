import { ListTypes } from '@/types'
import { generateTimeArray } from '@/utils/text-helper'
import { format } from 'date-fns'

interface PageProps {
  list: ListTypes[]
}

export default function Week({ list }: PageProps) {
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
              className="h-20 border-b">
              <div className="bg-green-100 text-xs">
                {h.reservations.map((r, idx2) => (
                  <div key={idx2}>{r.requester}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
