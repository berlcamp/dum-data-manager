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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fetchPurchaseOrders } from '@/utils/fetchApi'
import { formatRisAmount, getRisAmount } from '@/utils/ris-helper'
import { format } from 'date-fns'
import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import React, { useEffect, useState } from 'react'

import Filters from './Filters'

// Types
import type { AccountTypes, RisPoTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import {
  AlertTriangle,
  FileSpreadsheet,
  Inbox,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'
import RisModal from './RisModal'

const quantityTypes = ['Diesel', 'Gasoline', 'Oil and Lubricants']

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRisModal, setShowRisModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<RisPoTypes | null>(null)
  const [selectedItem, setSelectedItem] = useState<RisPoTypes | null>(null)

  const [downloading, setDownloading] = useState(false)

  // Filters
  const [filterType, setFilterType] = useState('All')
  const [filterAppropriation, setFilterAppropriation] = useState('All')
  const [filterKeyword, setFilterKeyword] = useState('')

  // List
  const [list, setList] = useState<RisPoTypes[]>([])
  const [perPageCount, setPerPageCount] = useState<number>(10)
  const [showingCount, setShowingCount] = useState<number>(0)
  const [resultsCount, setResultsCount] = useState<number>(0)

  const { supabase, session, systemUsers } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  const user: AccountTypes = systemUsers.find(
    (user: AccountTypes) => user.id === session.user.id,
  )

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)

    try {
      const result = await fetchPurchaseOrders(
        {
          filterType,
          filterKeyword,
          filterAppropriation,
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
      const result = await fetchPurchaseOrders(
        {
          filterType,
          filterKeyword,
          filterAppropriation,
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

  const handleEdit = (item: RisPoTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }

  /** True when no active (non-deleted) RIS references this PO. */
  const isPoUnusedByRis = (item: RisPoTypes) =>
    !item.ddm_ris?.some((r) => !r.is_deleted)

  const handleDeleteClick = (item: RisPoTypes) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setItemToDelete(null)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('ddm_ris_purchase_orders')
        .delete()
        .eq('id', itemToDelete.id)

      if (error) throw new Error(error.message)

      const updatedList = list.filter(
        (row) => row.id.toString() !== itemToDelete.id.toString(),
      )
      dispatch(updateList(updatedList))
      setResultsCount(resultsCount - 1)
      setShowingCount(showingCount - 1)

      setToast('success', 'Successfully deleted')
      closeDeleteModal()
    } catch (e) {
      console.error(e)
      setToast('error', 'Could not delete Department Allocation')
    } finally {
      setDeleting(false)
    }
  }

  const formatAmount = formatRisAmount

  const countConsumedQuantityFigure = (item: RisPoTypes) => {
    let totalQuantityUsed = 0
    if (item.ddm_ris) {
      item.ddm_ris.forEach((ris) => {
        if (ris.status === 'Approved') {
          totalQuantityUsed += Number(ris.quantity)
        }
      })
    }
    return totalQuantityUsed
  }

  const countConsumedAmountFigure = (item: RisPoTypes) => {
    let totalAmount = 0
    if (item.ddm_ris) {
      item.ddm_ris.forEach((ris) => {
        if (ris.status === 'Approved') {
          totalAmount += getRisAmount(ris)
        }
      })
    }
    return totalAmount
  }

  const countRemainingQuantityFigure = (item: RisPoTypes) => {
    let totalQuantityUsed = 0
    if (item.ddm_ris) {
      item.ddm_ris.forEach((ris) => {
        if (ris.status === 'Approved') {
          totalQuantityUsed += Number(ris.quantity)
        }
      })
    }

    return Math.max(0, Number(item.quantity) - totalQuantityUsed)
  }

  const countRemainingAmountFigure = (item: RisPoTypes) => {
    let totalAmount = 0
    if (item.ddm_ris) {
      item.ddm_ris.forEach((ris) => {
        if (ris.status === 'Approved') {
          totalAmount += getRisAmount(ris)
        }
      })
    }
    return Math.max(0, Number(item.amount) - totalAmount)
  }

  // Overconsumed Amount function (for Fuel)
  const countOverconsumedAmount = (item: RisPoTypes) => {
    const consumedAmount = countConsumedAmountFigure(item)
    const allocatedAmount = Number(item.amount)
    const overconsumed = consumedAmount - allocatedAmount
    return overconsumed > 0 ? overconsumed : 0
  }

  const handleDownloadExcel = async () => {
    setDownloading(true)

    // Create a new workbook and add a worksheet
    const workbook = new Excel.Workbook()
    const worksheet = workbook.addWorksheet('Sheet 1')

    // Add data to the worksheet
    worksheet.columns = [
      { header: '#', key: 'no', width: 20 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Department Allocation', key: 'po', width: 20 },
      { header: 'Supplier', key: 'supplier', width: 24 },
      { header: 'Description', key: 'description', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Appropriation', key: 'appropriation', width: 20 },
      { header: 'Allocated Amount', key: 'allocated_amount', width: 20 },
      { header: 'Consumed Amount', key: 'consumed_amount', width: 20 },
      { header: 'Remaining Amount', key: 'remaining_amount', width: 20 },
      { header: 'Overconsumed Amount', key: 'overconsumed_amount', width: 20 },
      { header: 'Allocated Quantity', key: 'allocated_quantity', width: 20 },
      { header: 'Consumed Quantity', key: 'consumed_quantity', width: 20 },
      { header: 'Remaining Quantity', key: 'remaining_quantity', width: 20 },
      // Add more columns based on your data structure
    ]

    let approp = ''
    if (filterAppropriation !== 'All') {
      const { data: approriation } = await supabase
        .from('ddm_ris_appropriations')
        .select()
        .eq('id', filterAppropriation)
        .single()

      approp = approriation.name
    }

    const result = await fetchPurchaseOrders(
      {
        filterType,
        filterKeyword,
        filterAppropriation,
      },
      99999,
      0,
    )

    const risData: RisPoTypes[] = result.data

    // Data for the Excel file
    const data: any[] = []
    risData.forEach((item, index) => {
      const remQty = countRemainingQuantityFigure(item)
      const remAmt = countRemainingAmountFigure(item)
      const consumedQty = countConsumedQuantityFigure(item)
      const consumedAmt = countConsumedAmountFigure(item)
      const overconsumedAmt = countOverconsumedAmount(item)

      data.push({
        no: index + 1,
        date: format(new Date(item.po_date), 'MM/dd/yyyy'),
        po: `${item.po_number || ''}`,
        supplier: `${item.supplier?.trim() || ''}`,
        description: `${item.description}`,
        type: `${item.type}`,
        appropriation: `${approp}`,
        allocated_amount:
          item.type === 'Fuel' ? formatAmount(Number(item.amount ?? 0)) : '',
        consumed_amount: item.type === 'Fuel' ? formatAmount(consumedAmt) : '',
        remaining_amount: item.type === 'Fuel' ? formatAmount(remAmt) : '',
        overconsumed_amount:
          item.type === 'Fuel' ? formatAmount(overconsumedAmt) : '',
        allocated_quantity:
          item.type === 'Diesel' ||
          item.type === 'Gasoline' ||
          item.type === 'Oil and Lubricants'
            ? `${item.quantity}`
            : '',
        consumed_quantity:
          item.type === 'Diesel' ||
          item.type === 'Gasoline' ||
          item.type === 'Oil and Lubricants'
            ? `${consumedQty}`
            : '',
        remaining_quantity:
          item.type === 'Diesel' ||
          item.type === 'Gasoline' ||
          item.type === 'Oil and Lubricants'
            ? `${remQty}`
            : '',
      })
    })

    data.forEach((item) => {
      worksheet.addRow(item)
    })

    // Generate the Excel file
    await workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, `Summary.xlsx`)
    })
    setDownloading(false)
  }

  // Update list whenever list in redux updates
  useEffect(() => {
    setList(globallist)
  }, [globallist])

  // Featch data
  useEffect(() => {
    setList([])
    void fetchData()
  }, [filterKeyword, filterAppropriation, filterType, perPageCount])

  // Allocated / consumed / remaining figures for a row. Fuel allocations are
  // tracked by amount; Diesel, Gasoline and Oil by liters.
  const renderUsage = (item: RisPoTypes) => {
    const isFuel = item.type === 'Fuel'
    if (!isFuel && !quantityTypes.includes(item.type)) return null

    const allocated = isFuel
      ? Number(item.amount ?? 0)
      : Number(item.quantity ?? 0)
    const consumed = isFuel
      ? countConsumedAmountFigure(item)
      : countConsumedQuantityFigure(item)
    const remaining = isFuel
      ? countRemainingAmountFigure(item)
      : countRemainingQuantityFigure(item)
    const overconsumed = isFuel ? countOverconsumedAmount(item) : 0
    const isLow = !isFuel && remaining < 100
    const usedPct =
      allocated > 0 ? Math.min(100, (consumed / allocated) * 100) : 0

    const fmt = (n: number) =>
      isFuel ? `₱${formatAmount(n)}` : `${n.toFixed(2)} L`

    const figures = [
      {
        label: 'Allocated',
        value: isFuel ? fmt(allocated) : `${item.quantity} L`,
        tone: 'text-gray-900 dark:text-gray-100',
      },
      {
        label: 'Consumed',
        value: fmt(consumed),
        tone: 'text-gray-900 dark:text-gray-100',
      },
      {
        label: 'Remaining',
        value: fmt(remaining),
        tone: isLow
          ? 'text-red-600 dark:text-red-400'
          : 'text-emerald-600 dark:text-emerald-400',
      },
    ]
    if (overconsumed > 0) {
      figures.push({
        label: 'Over-consumed',
        value: fmt(overconsumed),
        tone: 'text-red-600 dark:text-red-400',
      })
    }

    return (
      <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/40">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {figures.map((f) => (
            <div
              key={f.label}
              className="min-w-0">
              <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {f.label}
              </div>
              <div
                className={`truncate text-sm font-semibold tabular-nums ${f.tone}`}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
          role="progressbar"
          aria-label={`${item.po_number} consumed`}
          aria-valuenow={Math.round(usedPct)}
          aria-valuemin={0}
          aria-valuemax={100}>
          <div
            className={`h-full rounded-full ${
              overconsumed > 0 || isLow ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
      </div>
    )
  }

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
              <Title title="Department Allocations" />
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Fuel budgets per department, and how much of each is consumed
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
              New Department Allocation
            </Button>
          </div>

          {/* Filters */}
          <div className="app__filters">
            <Filters
              setFilterType={setFilterType}
              setFilterKeyword={setFilterKeyword}
              setFilterAppropriation={setFilterAppropriation}
            />
          </div>

          {/* Toolbar */}
          <div className="mx-4 mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Consumption counts Approved R.I.S. only.
            </span>
            <div className="ml-auto">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={downloading}
                onClick={() => void handleDownloadExcel()}>
                {downloading ? (
                  <Loader2
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4 animate-spin"
                  />
                ) : (
                  <FileSpreadsheet
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4"
                  />
                )}
                {downloading ? 'Preparing…' : 'Export to Excel'}
              </Button>
            </div>
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
                  <th className="hidden md:table-cell app__th">
                    Dept. Allocation #
                  </th>
                  <th className="app__th">Details</th>
                  <th className="app__th">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item: RisPoTypes) => (
                    <tr
                      key={item.id}
                      className="app__tr">
                      <td className="hidden md:table-cell app__td align-top pt-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.po_number}
                        </div>
                      </td>
                      <td className="app__td py-2.5">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900 md:hidden dark:text-gray-100">
                            {item.po_number}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                            {item.type}
                          </span>
                          {item.allow_overconsumed && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              Over-consumption allowed
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.po_date &&
                              format(new Date(item.po_date), 'MMMM dd, yyyy')}
                          </span>
                        </div>
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
                          {[
                            ['Appropriation', item.ddm_ris_appropriation?.name],
                            ['Department', item.department?.name],
                            ['Supplier', item.supplier?.trim()],
                            ['Description', item.description],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="flex min-w-0 gap-1.5">
                              <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                                {label}:
                              </dt>
                              <dd className="min-w-0 font-medium text-gray-800 dark:text-gray-200">
                                {value || '—'}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        {renderUsage(item)}
                      </td>
                      <td className="app__td align-top pt-2.5">
                        <div className="flex flex-col items-stretch gap-1.5 md:flex-row md:items-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Edit Department Allocation ${item.po_number}`}
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
                            aria-label={`View R.I.S. under ${item.po_number}`}
                            onClick={() => {
                              setSelectedItem(item)
                              setShowRisModal(true)
                            }}>
                            <ListChecks
                              aria-hidden="true"
                              className="h-3.5 w-3.5 md:mr-1.5"
                            />
                            <span className="hidden whitespace-nowrap md:inline">
                              View R.I.S.
                            </span>
                          </Button>
                          {isPoUnusedByRis(item) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              aria-label={`Delete Department Allocation ${item.po_number}`}
                              onClick={() => handleDeleteClick(item)}
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40">
                              <Trash2
                                aria-hidden="true"
                                className="h-3.5 w-3.5 md:mr-1.5"
                              />
                              <span className="hidden md:inline">Delete</span>
                            </Button>
                          )}
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
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
                <Inbox
                  aria-hidden="true"
                  className="h-8 w-8 text-gray-300"
                />
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  No Department Allocations found
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
              po={selectedItem}
              hideModal={() => setShowRisModal(false)}
            />
          )}

          {/* Confirm Delete */}
          <Dialog
            open={showDeleteModal && !!itemToDelete}
            onOpenChange={(open) => !open && !deleting && closeDeleteModal()}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle
                    aria-hidden="true"
                    className="h-5 w-5 text-red-600"
                  />
                  Delete Department Allocation?
                </DialogTitle>
                <DialogDescription>
                  Delete Department Allocation{' '}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {itemToDelete?.po_number}
                  </span>
                  ? This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleting}
                  onClick={closeDeleteModal}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => void handleConfirmDelete()}>
                  {deleting ? (
                    <Loader2
                      aria-hidden="true"
                      className="mr-1.5 h-4 w-4 animate-spin"
                    />
                  ) : (
                    <Trash2
                      aria-hidden="true"
                      className="mr-1.5 h-4 w-4"
                    />
                  )}
                  {deleting ? 'Deleting…' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  )
}
export default Page
