'use client'

import {
  CustomButton,
  RisSidebar,
  Sidebar,
  Title,
  TopBar,
  TwoColTableLoading,
  Unauthorized,
} from '@/components/index'
import { fetchRis } from '@/utils/fetchApi'
import React, { useEffect, useState } from 'react'

import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import Filters from './Filters'

// Types
import type { ProfileTypes, RisDepartmentTypes, RisTypes } from '@/types'

// Redux imports
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import CategoriesChart from './CategoriesChart'
import DetailsModal from './DetailsModal'

const Page: React.FC = () => {
  // Modal
  const [viewDetailsModal, setViewDetailsModal] = useState(false)
  const [details, setDetails] = useState<ProfileTypes | null>(null)

  // Filters
  const [filterType, setFilterType] = useState('All')
  const [filterDepartment, setFilterDepartment] = useState('All')
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(
    undefined
  )
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined)

  // Chart data
  const [dataSets, setDataSets] = useState([])
  const [departmentsDataSets, setDepartmentsDataSets] = useState([])

  // Loading
  const [downloading, setDownloading] = useState(false)
  const [loading, setLoading] = useState(false)

  const { supabase, session } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  const colors = [
    '#55d978',
    '#d9ca55',
    '#d9985f',
    '#5caecc',
    '#adedd9',
    '#d0e3f7',
    '#c3ffad',
    '#ffc4ef',
    '#87f5ff',
    '#8ce37d',
    '#6dd6b5',
  ]

  const fetchData = async () => {
    setLoading(true)

    try {
      // Fetch departments
      const { data: departments } = await supabase
        .from('ddm_ris_departments')
        .select()

      const result = await fetchRis(
        {
          filterDepartment,
          filterType,
          filterDateFrom,
          filterDateTo,
        },
        9999,
        0
      )

      const dataSetsData: any = []

      let countDiesel = 0
      let countGasoline = 0

      result.data.forEach((item: RisTypes) => {
        if (item.type === 'Diesel') {
          countDiesel += item.quantity
        }
        if (item.type === 'Gasoline') {
          countGasoline += item.quantity
        }
      })

      dataSetsData.push(
        {
          label: `Diesel (${
            countDiesel % 1 !== 0 ? countDiesel.toFixed(2) : countDiesel
          })`,
          data: [countDiesel],
          bgColor: colors[Math.floor(Math.random() * 11)],
        },
        {
          label: `Gasoline (${
            countGasoline % 1 !== 0 ? countGasoline.toFixed(2) : countGasoline
          })`,
          data: [countGasoline],
          bgColor: colors[Math.floor(Math.random() * 11)],
        }
      )

      // Charts data
      setDataSets(dataSetsData)

      const departmentDataSetsData: any = []

      departments.forEach((department: RisDepartmentTypes) => {
        const count = result.data.reduce((sum, f: RisTypes) => {
          if (f.department_id.toString() === department.id.toString()) {
            return sum + f.quantity
          }
          return sum
        }, 0)

        // Create datasets array
        departmentDataSetsData.push({
          label: `${department.name} (${
            count % 1 !== 0 ? count.toFixed(2) : count
          })`,
          count: count,
          bgColor: colors[Math.floor(Math.random() * 11)],
        })
      })

      const findLowestAndHighestValues = (items: any, key: any) => {
        return items.reduce(
          (acc: any, item: any) => {
            // Compare the value for the specified key and update the accumulator
            if (item[key] < acc.lowest) {
              acc.lowest = item[key]
            }
            if (item[key] > acc.highest) {
              acc.highest = item[key]
            }
            return acc
          },
          { lowest: Infinity, highest: -Infinity }
        )
      }

      const highandlow = findLowestAndHighestValues(
        departmentDataSetsData,
        'count'
      )

      const newDepartmentArray = departmentDataSetsData.map((d: any) => {
        // calculate the percentage
        const percentage =
          ((d.count - highandlow.lowest) /
            (highandlow.highest - highandlow.lowest)) *
          100
        return { ...d, percentage: percentage < 2 ? 2 : Math.round(percentage) } // set starting 2%
      })

      setDepartmentsDataSets(newDepartmentArray)
      setLoading(false)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadExcel = async () => {
    setDownloading(true)

    // Create a new workbook and add a worksheet
    const workbook = new Excel.Workbook()
    const worksheet = workbook.addWorksheet('Sheet 1')

    // Add data to the worksheet
    worksheet.columns = [
      { header: '#', key: 'no', width: 20 },
      { header: 'PO', key: 'po', width: 20 },
      { header: 'Requester', key: 'requester', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 20 },
      { header: 'Price', key: 'price', width: 20 },
      // Add more columns based on your data structure
    ]

    const result = await fetchRis(
      {
        filterDepartment,
        filterType,
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
        po: `${item.purchase_order.po_number}`,
        requester: `${item.requester}`,
        type: `${item.type}`,
        quantity: `${item.quantity}`,
        price: `${item.price}`,
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

  // Featch data
  useEffect(() => {
    void fetchData()
  }, [filterDepartment, filterType, filterDateFrom, filterDateTo])

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
            <Title title="RIS Summary" />
          </div>

          {/* Filters */}
          <div className="app__filters">
            <Filters
              setFilterType={setFilterType}
              setFilterDepartment={setFilterDepartment}
              setFilterDateFrom={setFilterDateFrom}
              setFilterDateTo={setFilterDateTo}
            />
          </div>

          {loading && <TwoColTableLoading />}
          {!loading && (
            <>
              <div className="mx-4 flex justify-end">
                <CustomButton
                  containerStyles="app__btn_blue"
                  isDisabled={downloading}
                  title={downloading ? 'Downloading...' : 'Export To Excel'}
                  btnType="submit"
                  handleClick={handleDownloadExcel}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mx-4 mt-10 text-lg">
                    Liters Consumed By Type
                  </div>
                  <div className="mx-4 mt-2 bg-slate-100 border">
                    <div className="mt-10 p-2 mx-auto w-full">
                      <CategoriesChart
                        labels={['Liters']}
                        dataSets={dataSets}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mx-4 mt-10 text-lg">
                    Liters Consumed By Department
                  </div>
                  <div className="mx-4 mt-2 bg-slate-100">
                    <div className="p-4 mx-auto w-full border">
                      {departmentsDataSets.map((d: any, idx) => (
                        <div
                          key={idx}
                          className="flex items-center w-full my-1">
                          <div
                            className="border"
                            style={{
                              height: `15px`,
                              width: `${d.percentage}%`,
                              backgroundColor: `${d.bgColor}`,
                            }}></div>
                          <div className="whitespace-nowrap text-[11px] text-gray-500">
                            {d.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Details Modal */}
      {details && viewDetailsModal && (
        <DetailsModal
          details={details}
          hideModal={() => setViewDetailsModal(false)}
        />
      )}
    </>
  )
}
export default Page
