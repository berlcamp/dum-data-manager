'use client'

import {
  ConfirmModal,
  PerPage,
  RisSidebar,
  ShowMore,
  Sidebar,
  TableRowLoading,
  Title,
  TopBar,
  Unauthorized,
} from '@/components/index'
import { Button } from '@/components/ui/button'
import { fetchRisDepartments } from '@/utils/fetchApi'
import { Inbox, Pencil, Plus, Trash2 } from 'lucide-react'
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
    null,
  )
  const [itemToDelete, setItemToDelete] = useState<RisDepartmentTypes | null>(
    null,
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
      const result = await fetchRisDepartments(
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
        (item) => item.id.toString() !== itemToDelete.id.toString(),
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 mt-4 dark:border-gray-700">
            <div>
              <Title title="Departments" />
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Requesting departments and the signatory printed on their R.I.S.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Plus
                aria-hidden="true"
                className="mr-1.5 h-4 w-4"
              />
              New Department
            </Button>
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
                  <th className="hidden md:table-cell app__th">Issued By</th>
                  <th className="hidden md:table-cell app__th">
                    Issued By Designation
                  </th>
                  <th className="app__th">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item, index: number) => (
                    <tr
                      key={index}
                      className="app__tr">
                      <td className="app__td py-2.5">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.name || '—'}
                        </div>
                        <dl className="mt-1 grid grid-cols-1 gap-y-1 md:hidden">
                          <div className="flex min-w-0 gap-1.5">
                            <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                              Issued By:
                            </dt>
                            <dd className="min-w-0 font-medium text-gray-800 dark:text-gray-200">
                              {item.issued_by || '—'}
                            </dd>
                          </div>
                          <div className="flex min-w-0 gap-1.5">
                            <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                              Designation:
                            </dt>
                            <dd className="min-w-0 font-medium text-gray-800 dark:text-gray-200">
                              {item.issued_by_dessignation || '—'}
                            </dd>
                          </div>
                        </dl>
                      </td>
                      <td className="hidden md:table-cell app__td">
                        {item.issued_by ? (
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {item.issued_by}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell app__td">
                        {item.issued_by_dessignation ? (
                          <span className="text-gray-700 dark:text-gray-300">
                            {item.issued_by_dessignation}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="app__td align-top pt-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Edit department ${item.name}`}
                            onClick={() => handleEdit(item)}>
                            <Pencil
                              aria-hidden="true"
                              className="h-3.5 w-3.5 md:mr-1.5"
                            />
                            <span className="hidden md:inline">Edit</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Delete department ${item.name}`}
                            onClick={() => handleDelete(item)}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300">
                            <Trash2
                              aria-hidden="true"
                              className="h-3.5 w-3.5 md:mr-1.5"
                            />
                            <span className="hidden md:inline">Delete</span>
                          </Button>
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
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
                <Inbox
                  aria-hidden="true"
                  className="h-8 w-8 text-gray-300"
                />
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  No departments found
                </div>
                <div className="text-xs text-gray-500">
                  Try adjusting or clearing the filters.
                </div>
              </div>
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
