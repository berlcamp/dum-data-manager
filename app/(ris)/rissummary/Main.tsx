'use client'

import {
  RisSidebar,
  Sidebar,
  Title,
  TopBar,
  TwoColTableLoading,
  Unauthorized,
} from '@/components/index'
import { fetchRis } from '@/utils/fetchApi'
import React, { useEffect, useState } from 'react'

import Filters from './Filters'

// Types
import type {
  ProfileTypes,
  RisCaTypes,
  RisDepartmentTypes,
  RisPoTypes,
  RisTypes,
} from '@/types'

// Redux imports
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import CategoriesChart from './CategoriesChart'
import DetailsModal from './DetailsModal'

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

const Page: React.FC = () => {
  // Modal
  const [viewDetailsModal, setViewDetailsModal] = useState(false)
  const [details, setDetails] = useState<ProfileTypes | null>(null)

  // Filters
  const [filterPo, setFilterPo] = useState('All')
  const [filterCa, setFilterCa] = useState('All')
  const [filterAppropriation, setFilterAppropriation] = useState('All')
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(
    undefined
  )
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined)

  // Chart data
  const [dataSets, setDataSets] = useState([])
  const [departmentsDataSets, setDepartmentsDataSets] = useState([])
  const [poDataSets, setPoDataSets] = useState([])
  const [caDataSets, setCaDataSets] = useState([])

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

      // Fetch Purchase Orders
      const { data: purchaseOrders } = await supabase
        .from('ddm_ris_purchase_orders')
        .select()

      // Fetch Cash Advances
      const { data: cashAdvances } = await supabase
        .from('ddm_ris_cash_advances')
        .select()

      const result = await fetchRis(
        {
          filterAppropriation,
          filterCa,
          filterPo,
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

      // Start Liters by department
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
      // End Liters by department

      // Start Liters by Purchase Order
      const poDataSetsData: any = []

      purchaseOrders.forEach((po: RisPoTypes) => {
        const count = result.data.reduce((sum, f: RisTypes) => {
          if (f.po_id?.toString() === po.id.toString()) {
            return sum + f.quantity
          }
          return sum
        }, 0)

        // Create datasets array
        poDataSetsData.push({
          label: `${po.po_number} (${
            count % 1 !== 0 ? count.toFixed(2) : count
          })`,
          count: count,
          bgColor: colors[Math.floor(Math.random() * 11)],
        })
      })

      const pohighandlow = findLowestAndHighestValues(poDataSetsData, 'count')

      const newPoArray = poDataSetsData.map((d: any) => {
        // calculate the percentage
        const percentage =
          ((d.count - pohighandlow.lowest) /
            (pohighandlow.highest - pohighandlow.lowest)) *
          100
        return { ...d, percentage: percentage < 2 ? 2 : Math.round(percentage) } // set starting 2%
      })

      setPoDataSets(newPoArray)
      // End Liters by Purchase Order

      // Start Liters by Cash Advance
      const caDataSetsData: any = []

      cashAdvances.forEach((po: RisCaTypes) => {
        const count = result.data.reduce((sum, f: RisTypes) => {
          if (f.po_id?.toString() === po.id.toString()) {
            return sum + f.quantity
          }
          return sum
        }, 0)

        // Create datasets array
        caDataSetsData.push({
          label: `${po.ca_number} (${
            count % 1 !== 0 ? count.toFixed(2) : count
          })`,
          count: count,
          bgColor: colors[Math.floor(Math.random() * 11)],
        })
      })

      const cahighandlow = findLowestAndHighestValues(caDataSetsData, 'count')

      const newCaArray = caDataSetsData.map((d: any) => {
        // calculate the percentage
        const percentage =
          ((d.count - cahighandlow.lowest) /
            (cahighandlow.highest - cahighandlow.lowest)) *
          100
        return { ...d, percentage: percentage < 2 ? 2 : Math.round(percentage) } // set starting 2%
      })

      setCaDataSets(newCaArray)
      // End Liters by Cash Advance

      setLoading(false)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Featch data
  useEffect(() => {
    void fetchData()
  }, [filterAppropriation, filterPo, filterCa, filterDateFrom, filterDateTo])

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
              setFilterAppropriation={setFilterAppropriation}
              setFilterPo={setFilterPo}
              setFilterCa={setFilterCa}
              setFilterDateFrom={setFilterDateFrom}
              setFilterDateTo={setFilterDateTo}
            />
          </div>

          {loading && <TwoColTableLoading />}
          {!loading && (
            <>
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
                <div>
                  <div className="mx-4 mt-10 text-lg">
                    Liters Consumed By P.O.
                  </div>
                  <div className="mx-4 mt-2 bg-slate-100">
                    <div className="p-4 mx-auto w-full border">
                      {poDataSets.map((d: any, idx) => (
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
                <div>
                  <div className="mx-4 mt-10 text-lg">
                    Liters Consumed By C.A.
                  </div>
                  <div className="mx-4 mt-2 bg-slate-100">
                    <div className="p-4 mx-auto w-full border">
                      {caDataSets.map((d: any, idx) => (
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
