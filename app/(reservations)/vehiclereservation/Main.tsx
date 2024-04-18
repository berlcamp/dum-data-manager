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
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'
import Filters from './Filters'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'

// Types
import type { HoursTypes, ListTypes, ReservationTypes } from '@/types'
import { generateTimeArray } from '@/utils/text-helper'
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

  // List
  const [list, setList] = useState<ListTypes[] | []>([])

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
    // Create 7 days list
    const d = new Date()
    let currentDate = subDays(d, 2)
    const newDate = addDays(d, 5)
    const listArray: ListTypes[] = []
    const hours = generateTimeArray(true)

    while (currentDate < newDate) {
      if (globallist && globallist.length > 0) {
        const hoursArray: HoursTypes[] = []
        hours.forEach((h) => {
          const filtered = globallist.filter((i: ReservationTypes) => {
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

    console.log('data', listArray)
  }, [globallist])

  // Featch data
  useEffect(() => {
    setList([])
    void fetchData()
  }, [filterKeyword, filterDate])

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
            />
          </div>

          {/* Main Content */}
          <div>
            {loading && <TwoColTableLoading />}
            {!isDataEmpty && <Week list={list} />}

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
