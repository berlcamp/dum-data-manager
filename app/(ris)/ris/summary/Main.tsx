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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import type { RisTypes } from '@/types'
import { fetchRis } from '@/utils/fetchApi'
import { format } from 'date-fns'
import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import React, { useEffect, useMemo, useState } from 'react'

import CategoriesChart from '../../rissummary/CategoriesChart'
import Filters from './Filters'
import StatWidget from './StatWidget'

type DepartmentSummary = {
  departmentId: string
  departmentName: string
  gasoline: number
  diesel: number
  totalAmount: number
}

type PoSummary = {
  poId: string
  poNumber: string
  appropriationName: string
  departmentName: string
  gasoline: number
  diesel: number
  totalAmount: number
}

const formatNum = (n: number, decimals = 2) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

const formatCurrency = (n: number) =>
  `₱ ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const colors = ['#55d978', '#d9ca55', '#5caecc', '#ffc4ef']

const Page: React.FC = () => {
  const [filterDepartment, setFilterDepartment] = useState('All')
  const [filterAppropriation, setFilterAppropriation] = useState('All')
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(
    undefined,
  )
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined)

  const [loading, setLoading] = useState(false)
  const [downloadingDept, setDownloadingDept] = useState(false)
  const [downloadingPo, setDownloadingPo] = useState(false)

  const [risData, setRisData] = useState<RisTypes[]>([])

  const { session, currentUser } = useSupabase()
  const { hasAccess } = useFilter()
  const hasRisAdminAccess = hasAccess('ris_admin')

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await fetchRis(
        {
          filterAppropriation,
          filterDepartment,
          filterDateFrom,
          filterDateTo,
          filterStatus: 'Approved',
        },
        99999,
        0,
        session?.user?.email,
        currentUser?.department_id,
        hasRisAdminAccess,
      )
      setRisData(result.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [
    filterDepartment,
    filterAppropriation,
    filterDateFrom,
    filterDateTo,
    session?.user?.email,
    currentUser?.department_id,
    hasRisAdminAccess,
  ])

  const stats = useMemo(() => {
    let totalGasoline = 0
    let totalDiesel = 0
    let totalAmount = 0
    risData.forEach((item: RisTypes) => {
      if (item.type === 'Gasoline') totalGasoline += item.quantity
      if (item.type === 'Diesel') totalDiesel += item.quantity
      totalAmount += item.total_amount || item.price * item.quantity
    })
    return {
      totalGasoline,
      totalDiesel,
      totalAmount,
      totalLiters: totalGasoline + totalDiesel,
      requisitions: risData.length,
    }
  }, [risData])

  const departmentSummary = useMemo((): DepartmentSummary[] => {
    const map = new Map<string, DepartmentSummary>()
    risData.forEach((item: RisTypes) => {
      const deptId = item.department_id
      const deptName = (item.department as { name?: string })?.name || 'Unknown'
      const existing = map.get(deptId)
      const gasoline = item.type === 'Gasoline' ? item.quantity : 0
      const diesel = item.type === 'Diesel' ? item.quantity : 0
      const amt = item.total_amount || item.price * item.quantity

      if (existing) {
        existing.gasoline += gasoline
        existing.diesel += diesel
        existing.totalAmount += amt
      } else {
        map.set(deptId, {
          departmentId: deptId,
          departmentName: deptName,
          gasoline,
          diesel,
          totalAmount: amt,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) =>
      a.departmentName.localeCompare(b.departmentName),
    )
  }, [risData])

  const poSummary = useMemo((): PoSummary[] => {
    const map = new Map<string, PoSummary>()
    risData.forEach((item: RisTypes) => {
      const po = item.purchase_order
      if (!po?.id) return
      const poId = po.id
      const poNumber = po.po_number || ''
      const appropriationName =
        (po.ddm_ris_appropriation as { name?: string })?.name || ''
      const departmentName = (po.department as { name?: string })?.name || ''
      const gasoline = item.type === 'Gasoline' ? item.quantity : 0
      const diesel = item.type === 'Diesel' ? item.quantity : 0
      const amt = item.total_amount || item.price * item.quantity

      const existing = map.get(poId)
      if (existing) {
        existing.gasoline += gasoline
        existing.diesel += diesel
        existing.totalAmount += amt
      } else {
        map.set(poId, {
          poId,
          poNumber,
          appropriationName,
          departmentName,
          gasoline,
          diesel,
          totalAmount: amt,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) =>
      a.poNumber.localeCompare(b.poNumber),
    )
  }, [risData])

  const chartDataSets = useMemo(
    () => [
      {
        label: `Diesel (${formatNum(stats.totalDiesel)})`,
        data: [stats.totalDiesel],
        bgColor: colors[0],
      },
      {
        label: `Gasoline (${formatNum(stats.totalGasoline)})`,
        data: [stats.totalGasoline],
        bgColor: colors[1],
      },
    ],
    [stats.totalDiesel, stats.totalGasoline],
  )

  const exportDepartmentExcel = async () => {
    setDownloadingDept(true)
    const workbook = new Excel.Workbook()
    const worksheet = workbook.addWorksheet('By Department')
    worksheet.columns = [
      { header: '#', key: 'no', width: 8 },
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Gasoline (L)', key: 'gasoline', width: 15 },
      { header: 'Diesel (L)', key: 'diesel', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 18 },
    ]
    departmentSummary.forEach((row, i) => {
      worksheet.addRow({
        no: i + 1,
        department: row.departmentName,
        gasoline: formatNum(row.gasoline),
        diesel: formatNum(row.diesel),
        totalAmount: formatCurrency(row.totalAmount),
      })
    })
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    saveAs(
      blob,
      `RIS_Summary_By_Department_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    )
    setDownloadingDept(false)
  }

  const exportPoExcel = async () => {
    setDownloadingPo(true)
    const workbook = new Excel.Workbook()
    const worksheet = workbook.addWorksheet('By PO')
    worksheet.columns = [
      { header: '#', key: 'no', width: 8 },
      { header: 'PO Number', key: 'poNumber', width: 18 },
      { header: 'Appropriation', key: 'appropriation', width: 20 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Gasoline (L)', key: 'gasoline', width: 15 },
      { header: 'Diesel (L)', key: 'diesel', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 18 },
    ]
    poSummary.forEach((row, i) => {
      worksheet.addRow({
        no: i + 1,
        poNumber: row.poNumber,
        appropriation: row.appropriationName,
        department: row.departmentName,
        gasoline: formatNum(row.gasoline),
        diesel: formatNum(row.diesel),
        totalAmount: formatCurrency(row.totalAmount),
      })
    })
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    saveAs(blob, `RIS_Summary_By_PO_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    setDownloadingPo(false)
  }

  const email = session?.user?.email ?? ''
  if (
    !hasAccess('ris') &&
    !hasAccess('ris_summary') &&
    !superAdmins.includes(email)
  )
    return <Unauthorized />

  return (
    <>
      <Sidebar>
        <RisSidebar />
      </Sidebar>
      <div className="app__main">
        <div className="space-y-6">
          <TopBar />
          <div className="app__title">
            <Title title="RIS Summary" />
          </div>

          <div className="app__filters">
            <Filters
              setFilterAppropriation={setFilterAppropriation}
              setFilterDepartment={setFilterDepartment}
              setFilterDateFrom={setFilterDateFrom}
              setFilterDateTo={setFilterDateTo}
            />
          </div>

          {loading && <TwoColTableLoading />}

          {!loading && (
            <>
              {/* Stat Widgets */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 px-4">
                <StatWidget
                  label="Total Gasoline"
                  value={`${formatNum(stats.totalGasoline)} L`}
                />
                <StatWidget
                  label="Total Diesel"
                  value={`${formatNum(stats.totalDiesel)} L`}
                />
                <StatWidget
                  label="Total Amount"
                  value={formatCurrency(stats.totalAmount)}
                />
                <StatWidget
                  label="Requisitions"
                  value={stats.requisitions}
                />
                <StatWidget
                  label="Total Liters"
                  value={`${formatNum(stats.totalLiters)} L`}
                />
              </div>

              {risData.length === 0 ? (
                <div className="mx-4 p-6 bg-muted/50 rounded-lg text-center text-muted-foreground">
                  No data for selected filters.
                </div>
              ) : (
                <>
                  {/* Department Table */}
                  <Card className="mx-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle>Consumption by Department</CardTitle>
                      <CustomButton
                        containerStyles="app__btn_green"
                        title={
                          downloadingDept ? 'Exporting...' : 'Export to Excel'
                        }
                        btnType="button"
                        handleClick={exportDepartmentExcel}
                        isDisabled={downloadingDept}
                      />
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="app__table">
                          <thead className="app__thead">
                            <tr>
                              <th className="app__th w-12">#</th>
                              <th className="app__th">Department</th>
                              <th className="app__th text-right">
                                Gasoline (L)
                              </th>
                              <th className="app__th text-right">Diesel (L)</th>
                              <th className="app__th text-right">
                                Total Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {departmentSummary.map((row, idx) => (
                              <tr
                                key={row.departmentId}
                                className="app__tr">
                                <td className="app__td">{idx + 1}</td>
                                <td className="app__td">
                                  {row.departmentName}
                                </td>
                                <td className="app__td text-right tabular-nums">
                                  {formatNum(row.gasoline)}
                                </td>
                                <td className="app__td text-right tabular-nums">
                                  {formatNum(row.diesel)}
                                </td>
                                <td className="app__td text-right tabular-nums">
                                  {formatCurrency(row.totalAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* PO Summary Table */}
                  <Card className="mx-4">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle>Summary by Purchase Order</CardTitle>
                      <CustomButton
                        containerStyles="app__btn_green"
                        title={
                          downloadingPo ? 'Exporting...' : 'Export to Excel'
                        }
                        btnType="button"
                        handleClick={exportPoExcel}
                        isDisabled={downloadingPo}
                      />
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="app__table">
                          <thead className="app__thead">
                            <tr>
                              <th className="app__th w-12">#</th>
                              <th className="app__th">PO</th>
                              <th className="app__th">Appropriation</th>
                              <th className="app__th">Department</th>
                              <th className="app__th text-right">
                                Gasoline (L)
                              </th>
                              <th className="app__th text-right">Diesel (L)</th>
                              <th className="app__th text-right">
                                Total Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {poSummary.map((row, idx) => (
                              <tr
                                key={row.poId}
                                className="app__tr">
                                <td className="app__td">{idx + 1}</td>
                                <td className="app__td">{row.poNumber}</td>
                                <td className="app__td">
                                  {row.appropriationName}
                                </td>
                                <td className="app__td">
                                  {row.departmentName}
                                </td>
                                <td className="app__td text-right tabular-nums">
                                  {formatNum(row.gasoline)}
                                </td>
                                <td className="app__td text-right tabular-nums">
                                  {formatNum(row.diesel)}
                                </td>
                                <td className="app__td text-right tabular-nums">
                                  {formatCurrency(row.totalAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gasoline vs Diesel Chart */}
                  <Card className="mx-4">
                    <CardHeader>
                      <CardTitle>Liters Consumed by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <CategoriesChart
                          labels={['Liters']}
                          dataSets={chartDataSets}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default Page
