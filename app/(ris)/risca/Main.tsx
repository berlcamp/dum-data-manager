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
import { fetchCashAdvances } from '@/utils/fetchApi'
import { formatRisAmount } from '@/utils/ris-helper'
import { format } from 'date-fns'
import { Inbox, ListChecks, Pencil, Plus } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import Filters from './Filters'

// Types
import type { RisCaTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'
import RisModal from './RisModal'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRisModal, setShowRisModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RisCaTypes | null>(null)

  // Filters
  const [filterKeyword, setFilterKeyword] = useState('')

  // List
  const [list, setList] = useState<RisCaTypes[]>([])
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
      const result = await fetchCashAdvances(
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
      const result = await fetchCashAdvances(
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

  const handleEdit = (item: RisCaTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }

  const handleViewRis = (item: RisCaTypes) => {
    setSelectedItem(item)
    setShowRisModal(true)
  }

  const countRemainingAmount = (item: RisCaTypes) => {
    const totalAmountUsed = item.ddm_ris
      ? item.ddm_ris.reduce(
          (accumulator, ris) =>
            accumulator + Number(ris.quantity) * Number(ris.price),
          0,
        )
      : 0
    return Number(item.amount) - totalAmountUsed
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
              <Title title="Cash Advances" />
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Cash advances that fund R.I.S. fuel requests
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
              New C.A.
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
                  <th className="hidden md:table-cell app__th">C.A. #</th>
                  <th className="app__th">Details</th>
                  <th className="app__th">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item: RisCaTypes) => {
                    const amount = Number(item.amount ?? 0)
                    const remaining = countRemainingAmount(item)
                    const hasRemaining = !isNaN(remaining)
                    const isLow = hasRemaining && remaining < 1000
                    const usedPct =
                      hasRemaining && amount > 0
                        ? Math.max(
                            0,
                            Math.min(
                              100,
                              ((amount - remaining) / amount) * 100,
                            ),
                          )
                        : 0

                    return (
                      <tr
                        key={item.id}
                        className="app__tr">
                        <td className="hidden md:table-cell app__td align-top pt-3">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {item.ca_number}
                          </div>
                        </td>
                        <td className="app__td py-2.5">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900 md:hidden dark:text-gray-100">
                              C.A. {item.ca_number}
                            </span>
                            <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                              ₱{formatRisAmount(amount)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {item.ca_date &&
                                format(new Date(item.ca_date), 'MMMM dd, yyyy')}
                            </span>
                            {isLow && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-300">
                                Low balance
                              </span>
                            )}
                          </div>
                          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
                            <div className="flex min-w-0 gap-1.5">
                              <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                                Remaining:
                              </dt>
                              <dd
                                className={`min-w-0 font-medium tabular-nums ${
                                  isLow
                                    ? 'font-semibold text-red-600 dark:text-red-400'
                                    : 'text-gray-800 dark:text-gray-200'
                                }`}>
                                {hasRemaining
                                  ? `₱${formatRisAmount(remaining)}`
                                  : '—'}
                              </dd>
                            </div>
                            <div className="flex min-w-0 gap-1.5">
                              <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                                Description:
                              </dt>
                              <dd className="min-w-0 font-medium text-gray-800 dark:text-gray-200">
                                {item.description || '—'}
                              </dd>
                            </div>
                          </dl>
                          {hasRemaining && amount > 0 && (
                            <div
                              className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                              role="progressbar"
                              aria-label={`C.A. ${item.ca_number} used`}
                              aria-valuenow={Math.round(usedPct)}
                              aria-valuemin={0}
                              aria-valuemax={100}>
                              <div
                                className={`h-full rounded-full ${
                                  isLow ? 'bg-red-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${usedPct}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="app__td align-top pt-2.5">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              aria-label={`Edit C.A. ${item.ca_number}`}
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
                              aria-label={`View R.I.S. charged to C.A. ${item.ca_number}`}
                              onClick={() => handleViewRis(item)}>
                              <ListChecks
                                aria-hidden="true"
                                className="h-3.5 w-3.5 md:mr-1.5"
                              />
                              <span className="hidden whitespace-nowrap md:inline">
                                View R.I.S.
                              </span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                {loading && (
                  <TableRowLoading
                    cols={3}
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
                  No cash advances found
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
          {/* RIS List Modal */}
          {showRisModal && selectedItem && (
            <RisModal
              ca={selectedItem}
              hideModal={() => setShowRisModal(false)}
            />
          )}
        </div>
      </div>
    </>
  )
}
export default Page
