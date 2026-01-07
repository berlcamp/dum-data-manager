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
import { fetchPurchaseOrders, fetchRisAppropriations } from '@/utils/fetchApi'
import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import React, { useEffect, useState } from 'react'

import Filters from './Filters'

// Types
import type { RisAppropriationTypes, RisTypes } from '@/types'

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

  const handleDownloadPOReport = async (item: RisAppropriationTypes) => {
    setDownloading(true)

    try {
      // Create a new workbook and add a worksheet
      const workbook = new Excel.Workbook()
      const worksheet = workbook.addWorksheet('Sheet 1')

      // Add data to the worksheet
      worksheet.columns = [
        { header: '#', key: 'no', width: 10 },
        { header: 'P.O. number', key: 'po_number', width: 30 },
        { header: 'PO Amount', key: 'amount', width: 20 },
        { header: 'Remaining amount', key: 'remaining_amount', width: 20 },
      ]

      // Fetch all purchase orders for this appropriation
      const result = await fetchPurchaseOrders(
        {
          filterAppropriation: item.id,
        },
        99999,
        0
      )

      const poData = result.data || []

      console.log(poData, item.id)

      // Sort by ID to maintain consistent order
      const sortedPOs = poData.sort((a, b) => Number(a.id) - Number(b.id))

      // Calculate remaining amount for each PO
      const appropriationAmount = Number(item.amount) || 0
      let cumulativeAmount = 0

      // Data for the Excel file
      const data: any[] = []
      sortedPOs.forEach((po, index) => {
        // Calculate PO amount from approved RIS items
        let poAmount = 0
        if (po.ddm_ris) {
          po.ddm_ris.forEach((ris: RisTypes) => {
            if (ris.status === 'Approved') {
              poAmount += Number(ris.quantity) * Number(ris.price)
            }
          })
        }
        cumulativeAmount += poAmount
        const remainingAmount = appropriationAmount - cumulativeAmount

        data.push({
          no: index + 1,
          po_number: po.po_number || '',
          amount: poAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          remaining_amount: remainingAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        })
      })

      // Add rows to worksheet
      data.forEach((row) => {
        worksheet.addRow(row)
      })

      // Generate the Excel file
      await workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        const fileName = `PO_Report_${item.name.replace(
          /[^a-z0-9]/gi,
          '_'
        )}.xlsx`
        saveAs(blob, fileName)
      })
    } catch (error) {
      console.error('Error downloading PO report:', error)
    } finally {
      setDownloading(false)
    }
  }

  const countRemainingAmount = (item: RisAppropriationTypes) => {
    let totalAmount = 0
    if (item.ddm_ris_purchase_orders) {
      item.ddm_ris_purchase_orders.forEach((po) => {
        if (po.ddm_ris) {
          po.ddm_ris.forEach((ris) => {
            if (ris.status === 'Approved') {
              totalAmount += Number(ris.quantity) * Number(ris.price)
            }
          })
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
            <Title title="Appropriations" />
            <CustomButton
              containerStyles="app__btn_green"
              title="Add New Appropriation"
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
                  <th className="app__th">Appropriation</th>
                  <th className="app__th">Allocated Amount</th>
                  <th className="app__th">Remaining Amount</th>
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
                      <td className="app__td">
                        {Number(item.amount).toLocaleString('en-US', {
                          minimumFractionDigits: 2, // Minimum number of decimal places
                          maximumFractionDigits: 2, // Maximum number of decimal places
                        })}
                      </td>
                      <td className="app__td">{countRemainingAmount(item)}</td>
                      <td className="app__td">
                        <div className="flex space-x-2 items-center">
                          <button
                            onClick={() => handleEdit(item)}
                            className="app__btn_green_xs">
                            Edit
                          </button>
                          <button
                            onClick={() => handleDownloadPOReport(item)}
                            disabled={downloading}
                            className="app__btn_green_xs">
                            {downloading ? 'Downloading...' : 'PO Summary'}
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
