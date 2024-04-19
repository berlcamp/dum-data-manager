import { ListTypes, ReservationTypes } from '@/types'
import { format } from 'date-fns'
import { useState } from 'react'
import AddEditModal from './AddEditModal'

interface PageProps {
  data: ReservationTypes[]
}

export default function ListView({ data }: PageProps) {
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

  return (
    <div className="mx-4">
      <table className="app__table">
        <thead className="app__thead">
          <tr>
            <th className="app__th">Date</th>
            <th className="app__th">Vehicle</th>
            <th className="app__th">Requester</th>
            <th className="app__th">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index: number) => (
            <tr
              key={index}
              onClick={() => handleEdit(item)}
              className="app__tr cursor-pointer">
              <td className="app__td">
                <div className="flex items-center space-x-2 whitespace-nowrap uppercase">
                  <span className="text-lg">
                    {format(new Date(item.date), 'dd')}
                  </span>
                  <span>{format(new Date(item.date), 'MMM yyyy, EEE')}</span>
                  <span>{item.time}</span>
                </div>
              </td>
              <td className="app__td">
                {item.vehicle.name}-{item.vehicle.plate_number}
              </td>
              <td className="app__td">
                {item.requester} / {item.department}
              </td>
              <td className="app__td">{item.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
