'use client'

import {
  CustomButton,
  DeleteModal,
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
import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import React, { useEffect, useState } from 'react'

import Filters from './Filters'

// Types
import type { RisTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { format } from 'date-fns'
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'
import PrintAllChecked from './PrintAllChecked'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RisTypes | null>(null)
  const [selectedItems, setSelectedItems] = useState<RisTypes[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Filters
  const [filterPo, setFilterPo] = useState('All')
  const [filterCa, setFilterCa] = useState('All')
  const [filterAppropriation, setFilterAppropriation] = useState('All')
  const [filterVehicle, setFilterVehicle] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterDepartment, setFilterDepartment] = useState('All')
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(
    undefined
  )
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined)
  const [filterKeyword, setFilterKeyword] = useState('')

  // List
  const [list, setList] = useState<RisTypes[]>([])
  const [perPageCount, setPerPageCount] = useState<number>(10)
  const [showingCount, setShowingCount] = useState<number>(0)
  const [resultsCount, setResultsCount] = useState<number>(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [checkAll, setCheckAll] = useState(false)

  const [zeroPrices, setZeroPrices] = useState<RisTypes[] | []>([])

  const { supabase, session } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)

    try {
      const result = await fetchRis(
        {
          filterKeyword,
          filterAppropriation,
          filterVehicle,
          filterStatus,
          filterDepartment,
          filterPo,
          filterCa,
          filterDateFrom,
          filterDateTo,
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
          filterAppropriation,
          filterVehicle,
          filterStatus,
          filterDepartment,
          filterPo,
          filterCa,
          filterDateFrom,
          filterDateTo,
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

  const handleDownloadExcel = async () => {
    setDownloading(true)

    // Create a new workbook and add a worksheet
    const workbook = new Excel.Workbook()
    const worksheet = workbook.addWorksheet('Sheet 1')

    // Add data to the worksheet
    worksheet.columns = [
      { header: '#', key: 'no', width: 20 },
      { header: 'Date Requested', key: 'date', width: 20 },
      { header: 'Vehicle', key: 'vehicle', width: 20 },
      { header: 'Purpose', key: 'purpose', width: 20 },
      { header: 'Destination', key: 'destination', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 20 },
      { header: 'Price', key: 'price', width: 20 },
      { header: 'PO', key: 'po', width: 20 },
      { header: 'Requester', key: 'requester', width: 20 },
      { header: 'Department', key: 'department', width: 20 },
      // Add more columns based on your data structure
    ]

    const result = await fetchRis(
      {
        filterKeyword,
        filterAppropriation,
        filterVehicle,
        filterStatus,
        filterPo,
        filterCa,
        filterDateFrom,
        filterDateTo,
      },
      99999,
      0
    )

    const risData: RisTypes[] = result.data

    // Data for the Excel file
    const data: any[] = []
    risData.forEach((item, index) => {
      data.push({
        no: index + 1,
        date: format(new Date(item.date_requested), 'MM/dd/yyyy'),
        vehicle: `${item.vehicle.name}-${item.vehicle.plate_number}`,
        purpose: `${item.purpose}`,
        destination: `${item.destination || ''}`,
        type: `${item.type}`,
        quantity: `${item.quantity}`,
        price: `${item.price}`,
        po: `${item.purchase_order?.po_number || ''}`,
        requester: `${item.requester}`,
        department: `${item.department.name}`,
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

  const handleApproveSelected = async () => {
    const ids = selectedItems.map((obj) => obj.id)
    try {
      const { error } = await supabase
        .from('ddm_ris')
        .update({ status: 'Approved' })
        .in('id', ids)

      if (error) throw new Error(error.message)

      // pop up the success message
      setToast('success', 'Successfully saved')

      // Append new data in redux
      const items = [...globallist]
      const updatedArray = items.map((obj: RisTypes) => {
        if (selectedItems.find((o) => o.id.toString() === obj.id.toString()))
          return { ...obj, status: 'Approved' }
        else return obj
      })
      dispatch(updateList(updatedArray))
    } catch (error) {
      // pop up the error  message
      setToast('error', 'Something went wrong')
    }
  }
  const handlePendingSelected = async () => {
    const ids = selectedItems.map((obj) => obj.id)
    try {
      const { error } = await supabase
        .from('ddm_ris')
        .update({ status: 'Pending' })
        .in('id', ids)

      if (error) throw new Error(error.message)

      // pop up the success message
      setToast('success', 'Successfully saved')

      // Append new data in redux
      const items = [...globallist]
      const updatedArray = items.map((obj: RisTypes) => {
        if (selectedItems.find((o) => o.id.toString() === obj.id.toString()))
          return { ...obj, status: 'Pending' }
        else return obj
      })
      dispatch(updateList(updatedArray))
    } catch (error) {
      // pop up the error  message
      setToast('error', 'Something went wrong')
    }
  }

  // Function to handle checkbox change event
  const handleCheckboxChange = (id: string) => {
    if (selectedIds.length > 0 && selectedIds.includes(id)) {
      // If item is already selected, remove it
      const ids = selectedIds.filter((selectedId) => selectedId !== id)
      setSelectedIds(ids)
      const items = list.filter((item) => ids.includes(item.id.toString()))
      setSelectedItems(items)
    } else {
      // If item is not selected, add it
      const ids = [...selectedIds, id]
      setSelectedIds(ids)
      const items = list.filter((item) => ids.includes(item.id.toString()))
      setSelectedItems(items)
    }
  }

  const handleCheckAllChange = () => {
    setCheckAll(!checkAll)
    if (!checkAll) {
      const ids = list.map((obj) => obj.id.toString())
      setSelectedIds([...ids])
      const items = list.filter((item) => ids.includes(item.id.toString()))
      setSelectedItems(items)
    } else {
      setSelectedIds([])
      setSelectedItems([])
    }
  }

  // Get all RIS without price
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('ddm_ris').select().eq('price', 0)
      setZeroPrices(data)
    })()
  }, [])

  // Update list whenever list in redux updates
  useEffect(() => {
    setList(globallist)
  }, [globallist])

  // Featch data
  useEffect(() => {
    setList([])
    void fetchData()
  }, [
    filterKeyword,
    filterAppropriation,
    filterVehicle,
    filterStatus,
    filterDepartment,
    filterPo,
    filterCa,
    filterDateFrom,
    filterDateTo,
    perPageCount,
  ])

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
            <Filters
              setFilterKeyword={setFilterKeyword}
              setFilterAppropriation={setFilterAppropriation}
              setFilterVehicle={setFilterVehicle}
              setFilterStatus={setFilterStatus}
              setFilterDepartment={setFilterDepartment}
              setFilterPo={setFilterPo}
              setFilterCa={setFilterCa}
              setFilterDateFrom={setFilterDateFrom}
              setFilterDateTo={setFilterDateTo}
            />
          </div>

          {/* Warning Message */}
          {zeroPrices.length > 0 && (
            <div className="mx-4 mb-4">
              <div className="text-xs">
                <span className="text-red-500 font-bold">
                  Warning! The following R.I.S. currently have 0 Price:{' '}
                </span>
                {zeroPrices.map((ris, idx) => (
                  <span
                    key={idx}
                    className="text-gray-600">
                    {ris.id},{' '}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="mx-4 mb-4 flex justify-end space-x-2">
            {selectedItems.length > 0 && (
              <>
                <CustomButton
                  containerStyles="app__btn_green"
                  isDisabled={downloading}
                  title={`Approve Selected (${selectedItems.length})`}
                  btnType="button"
                  handleClick={handleApproveSelected}
                />
                <CustomButton
                  containerStyles="app__btn_orange"
                  isDisabled={downloading}
                  title={`Mark Selected as Pending (${selectedItems.length})`}
                  btnType="button"
                  handleClick={handlePendingSelected}
                />
                <PrintAllChecked selectedRis={selectedItems} />
              </>
            )}
            <CustomButton
              containerStyles="app__btn_blue"
              isDisabled={downloading}
              title={downloading ? 'Downloading...' : 'Export To Excel'}
              btnType="button"
              handleClick={handleDownloadExcel}
            />
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
                    <input
                      type="checkbox"
                      checked={checkAll}
                      onChange={handleCheckAllChange}
                    />
                  </th>
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
                      onClick={() => handleCheckboxChange(item.id.toString())}
                      className="app__tr cursor-pointer">
                      <td className="hidden md:table-cell app__td">
                        <input
                          type="checkbox"
                          value={item.id.toString()}
                          checked={selectedIds.includes(item.id.toString())}
                          readOnly
                        />
                      </td>
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
                            <span className="font-light">Type:</span>{' '}
                            <span className="font-medium">{item.type}</span>
                          </div>
                          <div>
                            <span className="font-light">Status:</span>{' '}
                            <span
                              className={`font-medium uppercase ${
                                item.status === 'Pending'
                                  ? ' text-red-500'
                                  : 'text-green-500'
                              }`}>
                              {item.status}
                            </span>
                          </div>
                          <div>
                            <span className="font-light">
                              Transaction Type:
                            </span>{' '}
                            <span className="font-medium">
                              {item.transaction_type}
                            </span>
                            {' - '}
                            {item.transaction_type === 'Cash Advance' && (
                              <span className="font-medium">
                                {item.cash_advance?.ca_number}
                              </span>
                            )}
                            {item.transaction_type === 'Purchase Order' && (
                              <span className="font-medium">
                                {item.purchase_order?.po_number}
                              </span>
                            )}
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
                            <span className="font-light">Price /L:</span>{' '}
                            <span className="font-medium">{item.price}</span>
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
                              {item.department?.name}
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
                          <div className="flex items-start space-x-1">
                            <span className="font-light">Destination:</span>{' '}
                            <span className="font-medium">
                              {item.destination}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="app__td">
                        <div className="flex space-x-2 items-center">
                          <button
                            onClick={() => handleEdit(item)}
                            className="app__btn_green_xs">
                            Edit
                          </button>
                          {/* <button
                            onClick={() => {
                              setSelectedId(item.id.toString())
                              setShowDeleteModal(true)
                            }}
                            className="app__btn_red_xs">
                            Delete
                          </button> */}
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
          {/* Confirm Delete Modal */}
          {showDeleteModal && (
            <DeleteModal
              table="ddm_ris"
              selectedId={selectedId}
              showingCount={showingCount}
              setShowingCount={setShowingCount}
              resultsCount={resultsCount}
              setResultsCount={setResultsCount}
              hideModal={() => setShowDeleteModal(false)}
            />
          )}
        </div>
      </div>
    </>
  )
}
export default Page
