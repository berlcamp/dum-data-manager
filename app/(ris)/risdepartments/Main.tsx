'use client'

import {
  ConfirmModal,
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
import { fetchRisDepartments } from '@/utils/fetchApi'
import React, { useEffect, useState } from 'react'

import Filters from './Filters'

// Types
import type { RisDepartmentTypes } from '@/types'

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
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RisDepartmentTypes | null>(
    null
  )
  const [itemToDelete, setItemToDelete] = useState<RisDepartmentTypes | null>(
    null
  )

  // Filters
  const [filterKeyword, setFilterKeyword] = useState('')

  // List
  const [list, setList] = useState<RisDepartmentTypes[]>([])
  const [perPageCount, setPerPageCount] = useState<number>(10)
  const [showingCount, setShowingCount] = useState<number>(0)
  const [resultsCount, setResultsCount] = useState<number>(0)

  const { session, supabase } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)

    try {
      const result = await fetchRisDepartments(
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
      const result = await fetchRisDepartments(
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

  const handleEdit = (item: RisDepartmentTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }

  const handleDelete = (item: RisDepartmentTypes) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    try {
      const { error } = await supabase
        .from('ddm_ris_departments')
        .delete()
        .eq('id', itemToDelete.id)

      if (error) throw new Error(error.message)

      // Update data in redux
      const items = [...list]
      const updatedList = items.filter(
        (item) => item.id.toString() !== itemToDelete.id.toString()
      )
      dispatch(updateList(updatedList))
      setList(updatedList)

      // Update counts
      setResultsCount(resultsCount - 1)
      setShowingCount(showingCount - 1)

      // Show success message
      setToast('success', 'Successfully Deleted!')

      // Hide modal and reset
      setShowDeleteModal(false)
      setItemToDelete(null)
    } catch (e) {
      console.error(e)
      setToast('error', 'Error deleting department')
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
            <Title title="Departments" />
            <CustomButton
              containerStyles="app__btn_green"
              title="Add New Department"
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
                  <th className="app__th">Requesting Department</th>
                  <th className="app__th">Issued By</th>
                  <th className="app__th">Issued By Designation</th>
                  <th className="app__th"></th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item, index: number) => (
                    <tr
                      key={index}
                      className="app__tr">
                      <td className="app__td">{item.name}</td>
                      <td className="app__td">{item.issued_by ?? '-'}</td>
                      <td className="app__td">{item.issued_by_dessignation ?? '-'}</td>
                      <td className="app__td">
                        <div className="flex space-x-2 items-center">
                          <button
                            onClick={() => handleEdit(item)}
                            className="app__btn_green_xs">
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="app__btn_red_xs">
                            Delete
                          </button>
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

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <ConfirmModal
              header="Confirm Delete"
              btnText="Delete"
              message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
              onConfirm={handleConfirmDelete}
              onCancel={() => {
                setShowDeleteModal(false)
                setItemToDelete(null)
              }}
            />
          )}
        </div>
      </div>
    </>
  )
}
export default Page
