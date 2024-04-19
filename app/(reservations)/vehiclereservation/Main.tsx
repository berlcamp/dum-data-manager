'use client'

import VehicleReservationSidebar from '@/components/Sidebars/VehicleReservationSidebar'
import {
  CustomButton,
  Sidebar,
  Title,
  TopBar,
  TwoColTableLoading,
  Unauthorized,
} from '@/components/index'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { fetchVehicleReservations } from '@/utils/fetchApi'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'
import Filters from './Filters'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'

// Types
import type { ReservationTypes } from '@/types'
import ListView from './ListView'
import Week from './Week'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ReservationTypes | null>(
    null
  )

  // Filters
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined)
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterApplied, setFilterApplied] = useState(false)

  // List
  const [list, setList] = useState<ReservationTypes[] | []>([])

  const { session } = useSupabase()
  const { hasAccess } = useFilter()

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)

    try {
      const result = await fetchVehicleReservations({
        filterKeyword,
        filterDate,
        filterVehicle,
      })

      // update the list in redux
      dispatch(updateList(result.data))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setShowAddModal(true)
    setSelectedItem(null)
  }

  const handleEdit = (item: ReservationTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }

  // Update list whenever list in redux updates
  useEffect(() => {
    setList(globallist)
  }, [globallist])

  // Featch data
  useEffect(() => {
    setList([])
    void fetchData()

    if (filterKeyword !== '' || filterDate || filterVehicle !== '') {
      setFilterApplied(true)
    } else {
      setFilterApplied(false)
    }
  }, [filterKeyword, filterDate, filterVehicle])

  const isDataEmpty = list.length < 1 || !list
  const email: string = session.user.email

  // Check access from permission settings or Super Admins
  if (!hasAccess('vehiclereservation') && !superAdmins.includes(email))
    return <Unauthorized />

  return (
    <>
      <Sidebar>
        <VehicleReservationSidebar />
      </Sidebar>
      <div className="app__main">
        <div>
          {/* Header */}
          <TopBar />
          <div className="app__title">
            <Title title="Vehicle Reservations" />
            <CustomButton
              containerStyles="app__btn_green"
              title="Add New Reservation"
              btnType="button"
              handleClick={handleAdd}
            />
          </div>

          {/* Filters */}
          <div className="app__filters">
            <Filters
              setFilterKeyword={setFilterKeyword}
              setFilterDate={setFilterDate}
              setFilterVehicle={setFilterVehicle}
            />
          </div>

          {/* Main Content */}
          <div>
            {loading && <TwoColTableLoading />}
            {!isDataEmpty && !filterApplied && <Week data={list} />}
            {!isDataEmpty && filterApplied && <ListView data={list} />}

            {!loading && isDataEmpty && (
              <div className="app__norecordsfound">No records found.</div>
            )}
          </div>
        </div>
      </div>
      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddEditModal
          editData={selectedItem}
          hideModal={() => setShowAddModal(false)}
        />
      )}
    </>
  )
}
export default Page
