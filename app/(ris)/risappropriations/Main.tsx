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
import { fetchRisAppropriations } from '@/utils/fetchApi'
import { AlertTriangle, Inbox, Pencil, Plus } from 'lucide-react'
import { formatRisAmount, getRisAmount } from '@/utils/ris-helper'
import React, { useEffect, useState } from 'react'

import Filters from './Filters'

// Types
import type { RisAppropriationTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] =
    useState<RisAppropriationTypes | null>(null)

  // Filters
  const [filterKeyword, setFilterKeyword] = useState('')

  // List
  const [list, setList] = useState<RisAppropriationTypes[]>([])
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
      const result = await fetchRisAppropriations(
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
      const result = await fetchRisAppropriations(
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

  const handleEdit = (item: RisAppropriationTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }

  const formatAmount = formatRisAmount

  const countRemainingAmount = (item: RisAppropriationTypes) => {
    let totalAmount = 0
    if (item.ddm_ris_purchase_orders) {
      item.ddm_ris_purchase_orders.forEach((po) => {
        if (po.ddm_ris) {
          po.ddm_ris.forEach((ris) => {
            if (ris.status === 'Approved') {
              totalAmount += getRisAmount(ris)
            }
          })
        }
      })
    }
    return Number(item.amount) - totalAmount
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
              <Title title="Appropriations" />
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Budget sources that Department Allocations draw from
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
              New Appropriation
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
                  <th className="app__th">Appropriation</th>
                  <th className="app__th text-right">Allocated Amount</th>
                  <th className="app__th text-right">Remaining Amount</th>
                  <th className="app__th">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item, index: number) => {
                    const allocated = Number(item.amount)
                    const remaining = countRemainingAmount(item)
                    const isLow = remaining < 100
                    const usedPct =
                      allocated > 0
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              ((allocated - remaining) / allocated) * 100,
                            ),
                          )
                        : 0
                    return (
                      <tr
                        key={index}
                        className="app__tr">
                        <td className="app__td font-medium text-gray-900 dark:text-gray-100">
                          {item.name}
                        </td>
                        <td className="app__td text-right tabular-nums">
                          ₱{formatAmount(allocated)}
                        </td>
                        <td className="app__td text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isLow && (
                              <AlertTriangle
                                aria-hidden="true"
                                className="h-3.5 w-3.5 text-red-600 dark:text-red-400"
                              />
                            )}
                            <span
                              className={`tabular-nums ${
                                isLow
                                  ? 'font-bold text-red-600 dark:text-red-400'
                                  : 'text-gray-900 dark:text-gray-100'
                              }`}>
                              ₱{formatAmount(remaining)}
                            </span>
                            {isLow && <span className="sr-only">(low)</span>}
                          </div>
                          <div
                            className="ml-auto mt-1.5 h-1.5 w-full max-w-[10rem] overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                            role="progressbar"
                            aria-label={`${item.name} used`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(usedPct)}>
                            <div
                              className={`h-full rounded-full ${
                                isLow ? 'bg-red-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${usedPct}%` }}
                            />
                          </div>
                        </td>
                        <td className="app__td">
                          <div className="flex items-center justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              aria-label={`Edit appropriation ${item.name}`}
                              onClick={() => handleEdit(item)}>
                              <Pencil
                                aria-hidden="true"
                                className="h-3.5 w-3.5 md:mr-1.5"
                              />
                              <span className="hidden md:inline">Edit</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
                  No appropriations found
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
