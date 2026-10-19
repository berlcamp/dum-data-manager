'use client'

import {
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
import { fetchRisVehicles } from '@/utils/fetchApi'
import { Inbox, Pencil, Plus } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import Filters from './Filters'

// Types
import type { RisVehicleTypes } from '@/types'

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
  const [selectedItem, setSelectedItem] = useState<RisVehicleTypes | null>(null)

  // Filters
  const [filterKeyword, setFilterKeyword] = useState('')

  // List
  const [list, setList] = useState<RisVehicleTypes[]>([])
  const [perPageCount, setPerPageCount] = useState<number>(10)
  const [showingCount, setShowingCount] = useState<number>(0)
  const [resultsCount, setResultsCount] = useState<number>(0)

  const { session } = useSupabase()
  const { hasAccess } = useFilter()

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)

    try {
      const result = await fetchRisVehicles(
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
      const result = await fetchRisVehicles(
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

  const handleEdit = (item: RisVehicleTypes) => {
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 mt-4 dark:border-gray-700">
            <div>
              <Title title="Vehicles" />
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Vehicles that can be selected on R.I.S. fuel requests
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
              New Vehicle
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
                  <th className="app__th">Vehicle</th>
                  <th className="hidden md:table-cell app__th">Plate Number</th>
                  <th className="hidden md:table-cell app__th">Category</th>
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
                              Plate No.:
                            </dt>
                            <dd className="min-w-0 font-medium text-gray-800 dark:text-gray-200">
                              {item.plate_number || '—'}
                            </dd>
                          </div>
                          <div className="flex min-w-0 gap-1.5">
                            <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                              Category:
                            </dt>
                            <dd className="min-w-0 font-medium text-gray-800 dark:text-gray-200">
                              {item.category || '—'}
                            </dd>
                          </div>
                        </dl>
                      </td>
                      <td className="hidden md:table-cell app__td">
                        {item.plate_number ? (
                          <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                            {item.plate_number}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="hidden md:table-cell app__td">
                        {item.category ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                            {item.category}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="app__td align-top pt-2.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={`Edit vehicle ${item.name}`}
                          onClick={() => handleEdit(item)}>
                          <Pencil
                            aria-hidden="true"
                            className="h-3.5 w-3.5 md:mr-1.5"
                          />
                          <span className="hidden md:inline">Edit</span>
                        </Button>
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
                  No vehicles found
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
        </div>
      </div>
    </>
  )
}
export default Page
