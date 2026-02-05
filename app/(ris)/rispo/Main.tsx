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
import { fetchPurchaseOrders } from '@/utils/fetchApi'
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
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'
import RisModal from './RisModal'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddVarious, setShowAddVarious] = useState(false)
  const [showRisModal, setShowRisModal] = useState(false)
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
    (user: AccountTypes) => user.id === session.user.id
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
        0
      )

      // Update amount (delete this)
      // result.data.forEach(async (d: RisPoTypes) => {
      //   if (d.price) {
      //     const tempAmount = Number(d.quantity) * Number(d.price)
      //     const amount =
      //       tempAmount % 1 !== 0 ? tempAmount.toFixed(2) : tempAmount

      //     await supabase
      //       .from('ddm_ris_purchase_orders')
      //       .update({ amount: amount })
      //       .eq('id', d.id)
      //   }
      // })

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

  const handleEdit = (item: RisPoTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }

  const countRemainingQuantity = (item: RisPoTypes) => {
    // const totalQuantityUsed = item.ddm_ris
    //   ? item.ddm_ris.reduce(
    //       (accumulator, ris) => accumulator + Number(ris.quantity),
    //       0
    //     )
    //   : 0

    let totalQuantityUsed = 0
    if (item.ddm_ris) {
      item.ddm_ris.forEach((ris) => {
        if (ris.status === 'Approved') {
          totalQuantityUsed += Number(ris.quantity)
        }
      })
    }

    const remainingQuantity = Number(item.quantity) - totalQuantityUsed
    if (remainingQuantity < 100) {
      return (
        <span style={{ color: 'red', fontWeight: 'bold' }}>
          {remainingQuantity.toFixed(2)}
        </span>
      )
    } else {
      return <span>{remainingQuantity.toFixed(2)}</span>
    }
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

    return Number(item.quantity) - totalQuantityUsed
  }

  const countRemainingAmount = (item: RisPoTypes) => {
    let totalAmount = 0
    if (item.ddm_ris) {
      item.ddm_ris.forEach((ris) => {
        if (ris.status === 'Approved') {
          totalAmount += Number(ris.quantity) * Number(ris.price)
        }
      })
    }
    const remainingAmount = Number(item.amount) - totalAmount
    if (remainingAmount < 100) {
      return (
        <span style={{ color: 'red', fontWeight: 'bold' }}>
          {remainingAmount.toFixed(2)}
        </span>
      )
    } else {
      return <span>{remainingAmount.toFixed(2)}</span>
    }
  }

  const countRemainingAmountFigure = (item: RisPoTypes) => {
    let totalAmount = 0
    if (item.ddm_ris) {
      item.ddm_ris.forEach((ris) => {
        if (ris.status === 'Approved') {
          totalAmount += Number(ris.quantity) * Number(ris.price)
        }
      })
    }
    return Number(item.amount) - totalAmount
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
      { header: 'PO', key: 'po', width: 20 },
      { header: 'Description', key: 'description', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Appropriation', key: 'appropriation', width: 20 },
      { header: 'Amount', key: 'amount', width: 20 },
      { header: 'Remaining Amount', key: 'remaining_amount', width: 20 },
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
      0
    )

    const risData: RisPoTypes[] = result.data

    // Data for the Excel file
    const data: any[] = []
    risData.forEach((item, index) => {
      let remQty = 0
      if (item.type !== 'Fuel') {
        remQty = countRemainingQuantityFigure(item)
      }
      const remAmt = countRemainingAmountFigure(item)

      data.push({
        no: index + 1,
        date: format(new Date(item.po_date), 'MM/dd/yyyy'),
        po: `${item.po_number || ''}`,
        description: `${item.description}`,
        type: `${item.type}`,
        appropriation: `${approp}`,
        amount: `${item.amount}`,
        remaining_amount: `${remAmt}`,
        remaining_quantity: `${remQty !== 0 ? remQty : ''}`,
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
            <Title title="Purchase Orders" />
            <CustomButton
              containerStyles="app__btn_green"
              title="Add New PO"
              btnType="button"
              handleClick={handleAdd}
            />
          </div>

          {/* Filters */}
          <div className="app__filters">
            <Filters
              setFilterType={setFilterType}
              setFilterKeyword={setFilterKeyword}
              setFilterAppropriation={setFilterAppropriation}
            />
          </div>

          {/* Export Button */}
          <div className="mx-4 mb-4 flex justify-end space-x-2">
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
                  <th className="hidden md:table-cell app__th">PO #</th>
                  <th className="app__th">Details</th>
                  <th className="app__th"></th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item: RisPoTypes, index: number) => (
                    <tr
                      key={index}
                      className="app__tr">
                      <td className="hidden md:table-cell app__td">
                        <div className="font-medium">{item.po_number}</div>
                      </td>
                      <td className="app__td">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="md:hidden">
                            <span className="font-light">PO #:</span>{' '}
                            <span className="font-medium">
                              {item.po_number}
                            </span>
                          </div>
                          <div>
                            <span className="font-light">Type:</span>{' '}
                            <span className="font-medium">{item.type}</span>
                          </div>
                          {item.type !== 'Fuel' && (
                            <div>
                              <span className="font-light">Quantity (L):</span>{' '}
                              <span className="font-medium">
                                {item.quantity}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="font-light">Po Date:</span>{' '}
                            <span className="font-medium">
                              {item.po_date &&
                                format(new Date(item.po_date), 'MMMM dd, yyyy')}
                            </span>
                          </div>
                          <div>
                            <span className="font-light">Appropriation:</span>{' '}
                            <span className="font-medium">
                              {item.ddm_ris_appropriation?.name}
                            </span>
                          </div>
                          <div>
                            <span className="font-light">Department:</span>{' '}
                            <span className="font-medium">
                              {item.department?.name}
                            </span>
                          </div>
                          {item.type !== 'Fuel' && (
                            <div>
                              <span className="font-light">
                                Remaining Quantity (L):
                              </span>{' '}
                              <span className="font-medium">
                                {countRemainingQuantity(item)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="font-light">Amount:</span>{' '}
                            <span className="font-medium">{item.amount}</span>
                          </div>
                          <div>
                            <span className="font-light">
                              Remaining Amount:
                            </span>{' '}
                            <span className="font-medium">
                              {countRemainingAmount(item)}
                            </span>
                          </div>
                          <div>
                            <span className="font-light">Description:</span>{' '}
                            <span className="font-medium">
                              {item.description}
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
                          <button
                            onClick={() => {
                              setSelectedItem(item)
                              setShowRisModal(true)
                            }}
                            className="app__btn_blue_xs whitespace-nowrap">
                            View R.I.S.
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
          {/* RIS List Modal */}
          {showRisModal && selectedItem && (
            <RisModal
              po={selectedItem}
              hideModal={() => setShowRisModal(false)}
            />
          )}
        </div>
      </div>
    </>
  )
}
export default Page
