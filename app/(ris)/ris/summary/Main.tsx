'use client'

import {
  RisSidebar,
  Sidebar,
  Title,
  TopBar,
  TwoColTableLoading,
  Unauthorized,
} from '@/components/index'
import { Button } from '@/components/ui/button'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import type { RisTypes } from '@/types'
import { fetchAllRis } from '@/utils/fetchApi'
import { formatRisAmount, getRisAmount } from '@/utils/ris-helper'
import { format } from 'date-fns'
import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import {
  Droplet,
  Droplets,
  FileSpreadsheet,
  FileText,
  Fuel,
  Inbox,
  Loader2,
  Wallet,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import CategoriesChart from '../../rissummary/CategoriesChart'
import Filters from './Filters'
import StatWidget from './StatWidget'

type DepartmentSummary = {
  departmentId: string
  departmentName: string
  gasoline: number
  diesel: number
  oil: number
  totalAmount: number
}

type PoSummary = {
  poId: string
  poNumber: string
  appropriationName: string
  departmentName: string
  gasoline: number
  diesel: number
  oil: number
  totalAmount: number
}

// Whole numbers print bare ("3", not "3.00")
const formatNum = (n: number, decimals = 2) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : decimals,
    maximumFractionDigits: decimals,
  })

const formatCurrency = (n: number) => `₱ ${formatRisAmount(n)}`

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
      const result = await fetchAllRis(
        {
          filterAppropriation,
          filterDepartment,
          filterDateFrom,
          filterDateTo,
          filterStatus: 'Approved',
        },
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
    let totalOil = 0
    let totalAmount = 0
    risData.forEach((item: RisTypes) => {
      if (item.type === 'Gasoline') totalGasoline += item.quantity
      if (item.type === 'Diesel') totalDiesel += item.quantity
      if (item.type === 'Oil and Lubricants') totalOil += item.quantity
      totalAmount += getRisAmount(item)
    })
    return {
      totalGasoline,
      totalDiesel,
      totalOil,
      totalAmount,
      totalLiters: totalGasoline + totalDiesel + totalOil,
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
      const oil = item.type === 'Oil and Lubricants' ? item.quantity : 0
      const amt = getRisAmount(item)

      if (existing) {
        existing.gasoline += gasoline
        existing.diesel += diesel
        existing.oil += oil
        existing.totalAmount += amt
      } else {
        map.set(deptId, {
          departmentId: deptId,
          departmentName: deptName,
          gasoline,
          diesel,
          oil,
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
      const oil = item.type === 'Oil and Lubricants' ? item.quantity : 0
      const amt = getRisAmount(item)

      const existing = map.get(poId)
      if (existing) {
        existing.gasoline += gasoline
        existing.diesel += diesel
        existing.oil += oil
        existing.totalAmount += amt
      } else {
        map.set(poId, {
          poId,
          poNumber,
          appropriationName,
          departmentName,
          gasoline,
          diesel,
          oil,
          totalAmount: amt,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) =>
      a.poNumber.localeCompare(b.poNumber),
    )
  }, [risData])

  const sumRows = (
    rows: {
      gasoline: number
      diesel: number
      oil: number
      totalAmount: number
    }[],
  ) =>
    rows.reduce(
      (acc, r) => ({
        gasoline: acc.gasoline + r.gasoline,
        diesel: acc.diesel + r.diesel,
        oil: acc.oil + r.oil,
        totalAmount: acc.totalAmount + r.totalAmount,
      }),
      { gasoline: 0, diesel: 0, oil: 0, totalAmount: 0 },
    )

  const departmentTotals = useMemo(
    () => sumRows(departmentSummary),
    [departmentSummary],
  )
  const poTotals = useMemo(() => sumRows(poSummary), [poSummary])

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
      {
        label: `Oil and Lubricants (${formatNum(stats.totalOil)})`,
        data: [stats.totalOil],
        bgColor: colors[2],
      },
    ],
    [stats.totalDiesel, stats.totalGasoline, stats.totalOil],
  )

  const exportDepartmentExcel = async () => {
    setDownloadingDept(true)
    try {
      const workbook = new Excel.Workbook()
      const worksheet = workbook.addWorksheet('By Department')
      worksheet.columns = [
        { header: '#', key: 'no', width: 8 },
        { header: 'Department', key: 'department', width: 25 },
        { header: 'Gasoline (L)', key: 'gasoline', width: 15 },
        { header: 'Diesel (L)', key: 'diesel', width: 15 },
        { header: 'Oil and Lubricants (L)', key: 'oil', width: 20 },
        { header: 'Total Amount', key: 'totalAmount', width: 18 },
      ]
      departmentSummary.forEach((row, i) => {
        worksheet.addRow({
          no: i + 1,
          department: row.departmentName,
          gasoline: formatNum(row.gasoline),
          diesel: formatNum(row.diesel),
          oil: formatNum(row.oil),
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
    } catch (e) {
      console.error(e)
    } finally {
      setDownloadingDept(false)
    }
  }

  const exportPoExcel = async () => {
    setDownloadingPo(true)
    try {
      const workbook = new Excel.Workbook()
      const worksheet = workbook.addWorksheet('By Department Allocation')
      worksheet.columns = [
        { header: '#', key: 'no', width: 8 },
        { header: 'Department Allocation No.', key: 'poNumber', width: 18 },
        { header: 'Appropriation', key: 'appropriation', width: 20 },
        { header: 'Department', key: 'department', width: 22 },
        { header: 'Gasoline (L)', key: 'gasoline', width: 15 },
        { header: 'Diesel (L)', key: 'diesel', width: 15 },
        { header: 'Oil and Lubricants (L)', key: 'oil', width: 20 },
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
          oil: formatNum(row.oil),
          totalAmount: formatCurrency(row.totalAmount),
        })
      })
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(
        blob,
        `RIS_Summary_By_Department_Allocation_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
      )
    } catch (e) {
      console.error(e)
    } finally {
      setDownloadingPo(false)
    }
  }

  const email = session?.user?.email ?? ''
  if (
    !hasAccess('ris') &&
    !hasAccess('ris_summary') &&
    !superAdmins.includes(email)
  )
    return <Unauthorized />

  const th =
    'whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300'
  const thNum = `${th} text-right`
  const td = 'px-3 py-2 text-gray-700 dark:text-gray-300'
  const tdNum = `${td} whitespace-nowrap text-right tabular-nums`
  const tfNum =
    'whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100'

  const renderExportButton = (
    onClick: () => void,
    downloading: boolean,
    label: string,
    isEmpty = false,
  ) => (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={downloading || isEmpty}
      aria-label={label}>
      {downloading ? (
        <Loader2
          aria-hidden="true"
          className="mr-1.5 h-4 w-4 animate-spin"
        />
      ) : (
        <FileSpreadsheet
          aria-hidden="true"
          className="mr-1.5 h-4 w-4 text-emerald-600"
        />
      )}
      {downloading ? 'Exporting...' : 'Export to Excel'}
    </Button>
  )

  const renderCardHeader = (
    title: string,
    subtitle: string,
    action?: React.ReactNode,
  ) => (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      {action}
    </div>
  )

  return (
    <>
      <Sidebar>
        <RisSidebar />
      </Sidebar>
      <div className="app__main">
        <div>
          <TopBar />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div>
              <Title title="R.I.S. Summary" />
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Approved fuel consumption by department and department
                allocation
              </p>
            </div>
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
            <div className="space-y-4 pb-6">
              <div className="mx-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                <StatWidget
                  label="Total Gasoline"
                  value={`${formatNum(stats.totalGasoline)} L`}
                  icon={Fuel}
                  tone="text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                />
                <StatWidget
                  label="Total Diesel"
                  value={`${formatNum(stats.totalDiesel)} L`}
                  icon={Fuel}
                  tone="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                />
                <StatWidget
                  label="Total Oil and Lubricants"
                  value={`${formatNum(stats.totalOil)} L`}
                  icon={Droplet}
                  tone="text-sky-600 bg-sky-50 dark:bg-sky-950/40"
                />
                <StatWidget
                  label="Total Liters"
                  value={`${formatNum(stats.totalLiters)} L`}
                  icon={Droplets}
                  tone="text-blue-600 bg-blue-50 dark:bg-blue-950/40"
                />
                <StatWidget
                  label="Total Amount"
                  value={formatCurrency(stats.totalAmount)}
                  icon={Wallet}
                  tone="text-violet-600 bg-violet-50 dark:bg-violet-950/40"
                />
                <StatWidget
                  label="Approved Requisitions"
                  value={stats.requisitions.toLocaleString('en-US')}
                  icon={FileText}
                  tone="text-gray-600 bg-gray-100 dark:bg-gray-800"
                />
              </div>

              {risData.length === 0 ? (
                <div className="mx-4 flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <Inbox
                    aria-hidden="true"
                    className="h-8 w-8 text-gray-300"
                  />
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    No approved R.I.S. found
                  </div>
                  <div className="text-xs text-gray-500">
                    Try adjusting or clearing the filters.
                  </div>
                </div>
              ) : (
                <>
                  <section className="mx-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    {renderCardHeader(
                      'Consumption by Department',
                      `${departmentSummary.length.toLocaleString('en-US')} ${
                        departmentSummary.length === 1
                          ? 'department'
                          : 'departments'
                      }`,
                      renderExportButton(
                        exportDepartmentExcel,
                        downloadingDept,
                        'Export consumption by department to Excel',
                      ),
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                          <tr>
                            <th className={`${th} w-12`}>#</th>
                            <th className={th}>Department</th>
                            <th className={thNum}>Gasoline (L)</th>
                            <th className={thNum}>Diesel (L)</th>
                            <th className={thNum}>Oil and Lubricants (L)</th>
                            <th className={thNum}>Total Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {departmentSummary.map((row, idx) => (
                            <tr
                              key={row.departmentId}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td
                                className={`${td} tabular-nums text-gray-400`}>
                                {idx + 1}
                              </td>
                              <td className={`${td} font-medium`}>
                                {row.departmentName}
                              </td>
                              <td className={tdNum}>
                                {formatNum(row.gasoline)}
                              </td>
                              <td className={tdNum}>{formatNum(row.diesel)}</td>
                              <td className={tdNum}>{formatNum(row.oil)}</td>
                              <td className={`${tdNum} font-medium`}>
                                {formatCurrency(row.totalAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                          <tr>
                            <td
                              colSpan={2}
                              className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                              Total
                            </td>
                            <td className={tfNum}>
                              {formatNum(departmentTotals.gasoline)}
                            </td>
                            <td className={tfNum}>
                              {formatNum(departmentTotals.diesel)}
                            </td>
                            <td className={tfNum}>
                              {formatNum(departmentTotals.oil)}
                            </td>
                            <td className={tfNum}>
                              {formatCurrency(departmentTotals.totalAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </section>

                  <section className="mx-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    {renderCardHeader(
                      'Summary by Department Allocation',
                      `${poSummary.length.toLocaleString('en-US')} ${
                        poSummary.length === 1
                          ? 'department allocation'
                          : 'department allocations'
                      }`,
                      renderExportButton(
                        exportPoExcel,
                        downloadingPo,
                        'Export summary by department allocation to Excel',
                        poSummary.length === 0,
                      ),
                    )}
                    {poSummary.length === 0 ? (
                      <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                        <Inbox
                          aria-hidden="true"
                          className="h-6 w-6 text-gray-300"
                        />
                        <div className="text-xs text-gray-500">
                          No R.I.S. in this view is charged to a department
                          allocation.
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                            <tr>
                              <th className={`${th} w-12`}>#</th>
                              <th className={th}>Department Allocation</th>
                              <th className={th}>Appropriation</th>
                              <th className={th}>Department</th>
                              <th className={thNum}>Gasoline (L)</th>
                              <th className={thNum}>Diesel (L)</th>
                              <th className={thNum}>Oil and Lubricants (L)</th>
                              <th className={thNum}>Total Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {poSummary.map((row, idx) => (
                              <tr
                                key={row.poId}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td
                                  className={`${td} tabular-nums text-gray-400`}>
                                  {idx + 1}
                                </td>
                                <td
                                  className={`${td} whitespace-nowrap font-medium`}>
                                  {row.poNumber}
                                </td>
                                <td className={td}>{row.appropriationName}</td>
                                <td className={td}>{row.departmentName}</td>
                                <td className={tdNum}>
                                  {formatNum(row.gasoline)}
                                </td>
                                <td className={tdNum}>
                                  {formatNum(row.diesel)}
                                </td>
                                <td className={tdNum}>{formatNum(row.oil)}</td>
                                <td className={`${tdNum} font-medium`}>
                                  {formatCurrency(row.totalAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                                Total
                              </td>
                              <td className={tfNum}>
                                {formatNum(poTotals.gasoline)}
                              </td>
                              <td className={tfNum}>
                                {formatNum(poTotals.diesel)}
                              </td>
                              <td className={tfNum}>
                                {formatNum(poTotals.oil)}
                              </td>
                              <td className={tfNum}>
                                {formatCurrency(poTotals.totalAmount)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </section>

                  <section className="mx-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    {renderCardHeader(
                      'Liters Consumed by Type',
                      'Gasoline, diesel, and oil and lubricants',
                    )}
                    <div className="h-48 p-4">
                      <CategoriesChart
                        labels={['Liters']}
                        dataSets={chartDataSets}
                      />
                    </div>
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Page
