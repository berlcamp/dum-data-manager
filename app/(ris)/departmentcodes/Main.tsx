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
import { fetchRisDepartmentCodes } from '@/utils/fetchApi'
import {
  Check,
  Copy,
  Inbox,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
} from 'lucide-react'
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
  const { hasAccess, setToast } = useFilter()

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

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

  const handleToggle = async (id: string, activate: boolean) => {
    setTogglingId(id)
    try {
      if (activate) {
        await handleActive(id)
      } else {
        await handleInactive(id)
      }
    } finally {
      setTogglingId(null)
    }
  }

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setToast('success', `Copied ${code} to clipboard.`)
      setTimeout(() => setCopiedCode(null), 1500)
    } catch (e) {
      setToast('error', 'Unable to copy the code.')
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
              <Title title="Request Codes" />
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Fuel request portal codes, each linked to a Department
                Allocation
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
              New Request Code
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
                  <th className="app__th">Code</th>
                  <th className="app__th">Department</th>
                  <th className="hidden md:table-cell app__th">
                    Department Allocation
                  </th>
                  <th className="hidden md:table-cell app__th">
                    Allocation Type
                  </th>
                  <th className="app__th">Status</th>
                  <th className="app__th">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item, index: number) => {
                    const isActive = item.status !== 'Inactive'
                    const isToggling = togglingId === item.id
                    return (
                      <tr
                        key={index}
                        className="app__tr">
                        <td className="app__td">
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-mono text-sm font-semibold tracking-wider text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                              {item.code}
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                              aria-label={`Copy code ${item.code}`}
                              title="Copy code"
                              onClick={() => handleCopy(item.code)}>
                              {copiedCode === item.code ? (
                                <Check
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5 text-emerald-600"
                                />
                              ) : (
                                <Copy
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                />
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="app__td">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {item.department?.name || '—'}
                          </div>
                          {/* Allocation columns are hidden on small screens */}
                          <div className="mt-0.5 text-xs text-gray-500 md:hidden dark:text-gray-400">
                            {item.purchase_order?.po_number}
                            {item.purchase_order?.type
                              ? ` · ${item.purchase_order.type}`
                              : ''}
                          </div>
                        </td>
                        <td className="hidden md:table-cell app__td">
                          {item.purchase_order?.po_number || '—'}
                        </td>
                        <td className="hidden md:table-cell app__td">
                          {item.purchase_order?.type || '—'}
                        </td>
                        <td className="app__td">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                            }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="app__td">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              aria-label={`Edit request code ${item.code}`}
                              onClick={() => handleEdit(item)}>
                              <Pencil
                                aria-hidden="true"
                                className="h-3.5 w-3.5 md:mr-1.5"
                              />
                              <span className="hidden md:inline">Edit</span>
                            </Button>
                            {item.status === 'Active' ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isToggling}
                                aria-label={`Deactivate request code ${item.code}`}
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                onClick={() => handleToggle(item.id, false)}>
                                {isToggling ? (
                                  <Loader2
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5 animate-spin md:mr-1.5"
                                  />
                                ) : (
                                  <PowerOff
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5 md:mr-1.5"
                                  />
                                )}
                                <span className="hidden md:inline">
                                  Deactivate
                                </span>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isToggling}
                                aria-label={`Activate request code ${item.code}`}
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                                onClick={() => handleToggle(item.id, true)}>
                                {isToggling ? (
                                  <Loader2
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5 animate-spin md:mr-1.5"
                                  />
                                ) : (
                                  <Power
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5 md:mr-1.5"
                                  />
                                )}
                                <span className="hidden md:inline">
                                  Activate
                                </span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                {loading && (
                  <TableRowLoading
                    cols={6}
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
                  No request codes found
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
