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
import { fetchRis } from '@/utils/fetchApi'
import React, { useEffect, useState } from 'react'

import Filters from './Filters'

// Types
import type { AccountTypes, RisTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { format } from 'date-fns'
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'
import PrintButton from './PrintButton'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RisTypes | null>(null)

  // Filters
  const [filterKeyword, setFilterKeyword] = useState('')

  // List
  const [list, setList] = useState<RisTypes[]>([])
  const [perPageCount, setPerPageCount] = useState<number>(10)
  const [showingCount, setShowingCount] = useState<number>(0)
  const [resultsCount, setResultsCount] = useState<number>(0)

  const { supabase, session, systemUsers } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  const user: AccountTypes = systemUsers.find(
    (user: AccountTypes) => user.id === session.user.id
  )

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)

    try {
      const result = await fetchRis(
        {
          filterKeyword,
        },
        perPageCount,
        0
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
      const result = await fetchRis(
        {
          filterKeyword,
        },
        perPageCount,
        list.length
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

  const handleEdit = (item: RisTypes) => {
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
            <Title title="Requisition & Issue Slip" />
            <CustomButton
              containerStyles="app__btn_green"
              title="Add New RIS"
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
                  <th className="hidden md:table-cell app__th">RIS #</th>
                  <th className="app__th">Details</th>
                  <th className="app__th"></th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item: RisTypes, index: number) => (
                    <tr
                      key={index}
                      className="app__tr">
                      <td className="hidden md:table-cell app__td">
                        <div className="font-medium">{item.id}</div>
                      </td>
                      <td className="app__td">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="md:hidden">
                            <span className="font-light">RIS No:</span>{' '}
                            <span className="font-medium">{item.id}</span>
                          </div>
                          <div>
                            <span className="font-light">PO No:</span>{' '}
                            <span className="font-medium">
                              PO-{item.purchase_order?.po_number}-
                              {item.purchase_order?.type}
                            </span>
                          </div>
                          <div>
                            <span className="font-light">Quantity (L):</span>{' '}
                            <span className="font-medium">{item.quantity}</span>
                          </div>
                          <div>
                            <span className="font-light">Requester:</span>{' '}
                            <span className="font-medium">
                              {item.requester}
                            </span>
                          </div>
                          <div>
                            <span className="font-light">Vehicle:</span>{' '}
                            <span className="font-medium">
                              {item.vehicle?.name} -{' '}
                              {item.vehicle?.plate_number}
                            </span>
                          </div>
                          <div>
                            <span className="font-light">Department:</span>{' '}
                            <span className="font-medium">
                              {item.department?.name} -{' '}
                              {item.department?.office}
                            </span>
                          </div>
                          <div>
                            <span className="font-light">Date Requested:</span>{' '}
                            <span className="font-medium">
                              {item.date_requested &&
                                format(
                                  new Date(item.date_requested),
                                  'MMMM dd, yyyy'
                                )}
                            </span>
                          </div>
                          <div className="flex items-start space-x-1">
                            <span className="font-light">Purpose:</span>{' '}
                            <span className="font-medium">{item.purpose}</span>
                          </div>
                        </div>
                      </td>
                      <td className="app__td">
                        <div className="flex space-x-2 items-center">
                          <PrintButton ris={item} />
                          <button
                            onClick={() => handleEdit(item)}
                            className="app__btn_green_xs">
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {loading && (
                  <TableRowLoading
                    cols={3}
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
