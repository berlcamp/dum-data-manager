'use client'

import {
  CustomButton,
  PerPage,
  RisSidebar,
  ShowMore,
  Sidebar,
  TableRowLoading,
  Title,
  TopBar,
  Unauthorized,
} from '@/components/index'
import { fetchRisDepartmentCodes } from '@/utils/fetchApi'
import React, { useEffect, useState } from 'react'

import Filters from './Filters'

// Types
import type { RisDepartmentCodeTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] =
    useState<RisDepartmentCodeTypes | null>(null)

  // Filters
  const [filterKeyword, setFilterKeyword] = useState('')

  // List
  const [list, setList] = useState<RisDepartmentCodeTypes[]>([])
  const [perPageCount, setPerPageCount] = useState<number>(10)
  const [showingCount, setShowingCount] = useState<number>(0)
  const [resultsCount, setResultsCount] = useState<number>(0)

  const { supabase, session } = useSupabase()
  const { hasAccess } = useFilter()

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)

    try {
      const result = await fetchRisDepartmentCodes(
        {
          filterKeyword,
        },
        perPageCount,
        0,
      )

      // update the list in redux
      dispatch(updateList(result.data))

      setResultsCount(result.count ? result.count : 0)
      setShowingCount(result.data.length)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Append data to existing list whenever 'show more' button is clicked
  const handleShowMore = async () => {
    setLoading(true)

    try {
      const result = await fetchRisDepartmentCodes(
        {
          filterKeyword,
        },
        perPageCount,
        list.length,
      )

      // update the list in redux
      const newList = [...list, ...result.data]
      dispatch(updateList(newList))

      setResultsCount(result.count ? result.count : 0)
      setShowingCount(newList.length)
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

  const handleEdit = (item: RisDepartmentCodeTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }
  const handleActive = async (id: string) => {
    const { error } = await supabase
      .from('ddm_ris_department_codes')
      .update({ status: 'Active' })
      .eq('id', id)

    if (!error) {
      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        status: 'Active',
        id,
      }
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      items[foundIndex] = { ...items[foundIndex], ...updatedData }
      dispatch(updateList(items))
    }
  }
  const handleInactive = async (id: string) => {
    const { error } = await supabase
      .from('ddm_ris_department_codes')
      .update({ status: 'Inactive' })
      .eq('id', id)

    if (!error) {
      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        status: 'Inactive',
        id,
      }
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      items[foundIndex] = { ...items[foundIndex], ...updatedData }
      dispatch(updateList(items))
    }
  }

  // Update list whenever list in redux updates
  useEffect(() => {
    setList(globallist)
  }, [globallist])

  // Featch data
  useEffect(() => {
    setList([])
    void fetchData()
  }, [filterKeyword, perPageCount])

  const isDataEmpty = !Array.isArray(list) || list.length < 1 || !list
  const email: string = session.user.email

  // Check access from permission settings or Super Admins
  if (!hasAccess('ris') && !superAdmins.includes(email)) return <Unauthorized />

  return (
    <>
      <Sidebar>
        <RisSidebar />
      </Sidebar>
      <div className="app__main">
        <div>
          {/* Header */}
          <TopBar />
          <div className="app__title">
            <Title title="Request Codes" />
            <CustomButton
              containerStyles="app__btn_green"
              title="Add New Request Code"
              btnType="button"
              handleClick={handleAdd}
            />
          </div>

          {/* Filters */}
          <div className="app__filters">
            <Filters setFilterKeyword={setFilterKeyword} />
          </div>

          {/* Per Page */}
          <PerPage
            showingCount={showingCount}
            resultsCount={resultsCount}
            perPageCount={perPageCount}
            setPerPageCount={setPerPageCount}
          />

          {/* Main Content */}
          <div>
            <table className="app__table">
              <thead className="app__thead">
                <tr>
                  <th className="app__th">Code</th>
                  <th className="app__th">Department</th>
                  <th className="app__th">P.O.</th>
                  <th className="app__th">P.O. Type</th>
                  <th className="app__th">Status</th>
                  <th className="app__th"></th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item, index: number) => (
                    <tr
                      key={index}
                      className="app__tr">
                      <td className="app__td">{item.code}</td>
                      <td className="app__td">{item.department?.name}</td>
                      <td className="app__td">
                        {item.purchase_order.po_number}
                      </td>
                      <td className="app__td">{item.purchase_order.type}</td>
                      <td
                        className={`app__td font-bold uppercase ${
                          item.status === 'Inactive'
                            ? ' text-red-500'
                            : 'text-green-500'
                        }`}>
                        {item.status}
                      </td>
                      <td className="app__td">
                        <div className="flex space-x-2 items-center">
                          <button
                            onClick={() => handleEdit(item)}
                            className="app__btn_green_xs">
                            Edit
                          </button>
                          {item.status === 'Active' ? (
                            <CustomButton
                              containerStyles="app__btn_red_xs"
                              title="Deactivate"
                              btnType="button"
                              handleClick={() => handleInactive(item.id)}
                            />
                          ) : (
                            <CustomButton
                              containerStyles="app__btn_green_xs"
                              title="Activate"
                              btnType="button"
                              handleClick={() => handleActive(item.id)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {loading && (
                  <TableRowLoading
                    cols={4}
                    rows={2}
                  />
                )}
              </tbody>
            </table>
            {!loading && isDataEmpty && (
              <div className="app__norecordsfound">No records found.</div>
            )}
          </div>

          {/* Show More */}
          {resultsCount > showingCount && !loading && (
            <ShowMore handleShowMore={handleShowMore} />
          )}

          {/* Add/Edit Modal */}
          {showAddModal && (
            <AddEditModal
              editData={selectedItem}
              hideModal={() => setShowAddModal(false)}
            />
          )}
        </div>
      </div>
    </>
  )
}
export default Page
