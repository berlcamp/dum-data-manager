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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { fetchApprovedRisForAppropriations } from '@/utils/fetchApi'
import type { RisAppropriationSummaryRis } from '@/utils/fetchApi'
import {
  formatRisAmount,
  getRisAmount,
  roundRisAmount,
  toRisMoney,
  toRisQty,
} from '@/utils/ris-helper'
import {
  buildSignedPdf,
  signatoriesId,
  signedTableNodes,
} from '@/utils/ris-pdf'
import { format } from 'date-fns'
import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import {
  FileSpreadsheet,
  FileText,
  Inbox,
  Landmark,
  Loader2,
  PiggyBank,
  Wallet,
} from 'lucide-react'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import React, { useEffect, useMemo, useState } from 'react'

import StatWidget from '../summary/StatWidget'

type AppropriationSummary = {
  appropriationId: string
  name: string
  amount: number
  gasoline: number
  diesel: number
  oil: number
  requisitions: number
  consumedYear: number
  consumedOther: number
  remaining: number
}

// First year with R.I.S. data
const FIRST_YEAR = 2023

const formatCurrency = (n: number) => `₱ ${formatRisAmount(n)}`

const MONEY_FMT = '#,##0.00'
const QTY_FMT = '#,##0.##'

const Page: React.FC = () => {
  const currentYear = new Date().getFullYear()
  const years = Array.from(
    { length: currentYear - FIRST_YEAR + 1 },
    (_, i) => currentYear - i,
  )

  const [filterYear, setFilterYear] = useState<number>(currentYear)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const [yearRis, setYearRis] = useState<RisAppropriationSummaryRis[]>([])
  const [otherRis, setOtherRis] = useState<RisAppropriationSummaryRis[]>([])

  const { session } = useSupabase()
  const { hasAccess } = useFilter()

  // Works whether it's under pdfMake.vfs or directly vfs
  pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs

  const fetchData = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const inYear = await fetchApprovedRisForAppropriations({
        year: filterYear,
      })
      const appropriationIds = Array.from(
        new Set(
          inYear.map((r) => String(r.purchase_order?.appropriation ?? '')),
        ),
      ).filter(Boolean)
      // Approved R.I.S. from other years against the same appropriations, so
      // the remaining balance matches the Appropriations page
      const outsideYear = await fetchApprovedRisForAppropriations({
        excludeYear: filterYear,
        appropriationIds,
      })
      setYearRis(inYear)
      setOtherRis(outsideYear)
    } catch (e) {
      console.error(e)
      setYearRis([])
      setOtherRis([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [filterYear])

  const summary = useMemo((): AppropriationSummary[] => {
    const map = new Map<string, AppropriationSummary>()

    yearRis.forEach((item) => {
      const appropriation = item.purchase_order?.ddm_ris_appropriation
      const id = String(item.purchase_order?.appropriation ?? '')
      if (!id) return

      let row = map.get(id)
      if (!row) {
        row = {
          appropriationId: id,
          name: appropriation?.name || 'Unknown',
          amount: Number(appropriation?.amount ?? 0),
          gasoline: 0,
          diesel: 0,
          oil: 0,
          requisitions: 0,
          consumedYear: 0,
          consumedOther: 0,
          remaining: 0,
        }
        map.set(id, row)
      }

      const quantity = Number(item.quantity ?? 0)
      if (item.type === 'Gasoline') row.gasoline += quantity
      if (item.type === 'Diesel') row.diesel += quantity
      if (item.type === 'Oil and Lubricants') row.oil += quantity
      row.requisitions += 1
      row.consumedYear += getRisAmount(item)
    })

    otherRis.forEach((item) => {
      const row = map.get(String(item.purchase_order?.appropriation ?? ''))
      if (row) row.consumedOther += getRisAmount(item)
    })

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        consumedYear: roundRisAmount(row.consumedYear),
        consumedOther: roundRisAmount(row.consumedOther),
        remaining: roundRisAmount(
          row.amount - row.consumedYear - row.consumedOther,
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [yearRis, otherRis])

  const totals = useMemo(
    () =>
      summary.reduce(
        (acc, r) => ({
          amount: acc.amount + r.amount,
          gasoline: acc.gasoline + r.gasoline,
          diesel: acc.diesel + r.diesel,
          oil: acc.oil + r.oil,
          requisitions: acc.requisitions + r.requisitions,
          consumedYear: acc.consumedYear + r.consumedYear,
          consumedOther: acc.consumedOther + r.consumedOther,
          remaining: acc.remaining + r.remaining,
        }),
        {
          amount: 0,
          gasoline: 0,
          diesel: 0,
          oil: 0,
          requisitions: 0,
          consumedYear: 0,
          consumedOther: 0,
          remaining: 0,
        },
      ),
    [summary],
  )

  const fileStamp = `${filterYear}_${format(new Date(), 'yyyy-MM-dd')}`

  const exportExcel = async () => {
    setDownloadingExcel(true)
    try {
      const workbook = new Excel.Workbook()
      const worksheet = workbook.addWorksheet(`Appropriations ${filterYear}`)
      worksheet.columns = [
        { key: 'no', width: 6 },
        { key: 'name', width: 40 },
        { key: 'amount', width: 18, style: { numFmt: MONEY_FMT } },
        { key: 'gasoline', width: 14, style: { numFmt: QTY_FMT } },
        { key: 'diesel', width: 14, style: { numFmt: QTY_FMT } },
        { key: 'oil', width: 18, style: { numFmt: QTY_FMT } },
        { key: 'requisitions', width: 14 },
        { key: 'consumedYear', width: 18, style: { numFmt: MONEY_FMT } },
        { key: 'consumedOther', width: 20, style: { numFmt: MONEY_FMT } },
        { key: 'remaining', width: 18, style: { numFmt: MONEY_FMT } },
      ]

      worksheet.addRow(['APPROPRIATION SUMMARY']).font = {
        bold: true,
        size: 14,
      }
      worksheet.addRow([`Year: ${filterYear}`])
      worksheet.addRow([])

      const header = worksheet.addRow([
        '#',
        'Appropriation',
        'Appropriation Amount',
        'Gasoline (L)',
        'Diesel (L)',
        'Oil and Lubricants (L)',
        'Approved R.I.S.',
        `Consumed (${filterYear})`,
        'Consumed (Other Years)',
        'Remaining Balance',
      ])
      header.font = { bold: true }
      header.alignment = { wrapText: true, vertical: 'middle' }

      summary.forEach((row, i) => {
        worksheet.addRow({
          no: i + 1,
          name: row.name,
          amount: row.amount,
          gasoline: row.gasoline,
          diesel: row.diesel,
          oil: row.oil,
          requisitions: row.requisitions,
          consumedYear: row.consumedYear,
          consumedOther: row.consumedOther,
          remaining: row.remaining,
        })
      })

      worksheet.addRow({
        name: 'TOTAL',
        amount: totals.amount,
        gasoline: totals.gasoline,
        diesel: totals.diesel,
        oil: totals.oil,
        requisitions: totals.requisitions,
        consumedYear: totals.consumedYear,
        consumedOther: totals.consumedOther,
        remaining: totals.remaining,
      }).font = { bold: true }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, `Appropriation_Summary_${fileStamp}.xlsx`)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloadingExcel(false)
    }
  }

  const exportPdf = async () => {
    setDownloadingPdf(true)
    try {
      const header: any[][] = [
        [
          '#',
          'Appropriation',
          'Appropriation Amount',
          'Gasoline (L)',
          'Diesel (L)',
          'Oil & Lub (L)',
          'Approved R.I.S.',
          `Consumed (${filterYear})`,
          'Consumed (Other Years)',
          'Remaining Balance',
        ].map((text) => ({ text, style: 'tableHeader' })),
      ]

      const rows: any[][] = summary.map((row, i) => [
        String(i + 1),
        { text: row.name, alignment: 'left' },
        toRisMoney(row.amount),
        toRisQty(row.gasoline),
        toRisQty(row.diesel),
        toRisQty(row.oil),
        row.requisitions.toLocaleString('en-US'),
        toRisMoney(row.consumedYear),
        toRisMoney(row.consumedOther),
        toRisMoney(row.remaining),
      ])

      const footer: any[][] = [
        [
          { text: 'TOTAL', colSpan: 2, alignment: 'right', bold: true },
          {},
          { text: toRisMoney(totals.amount), bold: true },
          { text: toRisQty(totals.gasoline), bold: true },
          { text: toRisQty(totals.diesel), bold: true },
          { text: toRisQty(totals.oil), bold: true },
          { text: totals.requisitions.toLocaleString('en-US'), bold: true },
          { text: toRisMoney(totals.consumedYear), bold: true },
          { text: toRisMoney(totals.consumedOther), bold: true },
          { text: toRisMoney(totals.remaining), bold: true },
        ],
      ]

      const table = {
        key: 'appropriations',
        header,
        rows,
        footer,
        widths: [20, '*', 80, 55, 55, 55, 50, 80, 80, 80],
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
        },
        margin: [0, 0, 0, 20],
      }

      const signatories: any = {
        unbreakable: true,
        columns: [
          {
            width: '50%',
            stack: [
              {
                id: signatoriesId(table.key),
                text: 'ARFEL HOPE L. BOMES',
                bold: true,
                decoration: 'underline',
                margin: [0, 20, 0, 0],
                alignment: 'center',
              },
              { text: 'MMO STAFF', alignment: 'center' },
            ],
          },
          {
            width: '50%',
            stack: [
              {
                text: 'CERTIFIED CORRECT:',
                margin: [0, 20, 0, 50],
                alignment: 'center',
              },
              {
                text: 'MERCY FE DE GUZMAN',
                bold: true,
                decoration: 'underline',
                alignment: 'center',
              },
              { text: 'GSO', alignment: 'center' },
            ],
          },
        ],
        margin: [0, 40, 0, 0],
      }

      const content: any[] = [
        {
          text: 'APPROPRIATION SUMMARY',
          style: 'title',
          alignment: 'center',
        },
        {
          text: `YEAR: ${filterYear}`,
          style: 'subTitle',
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
      ]

      const docDefinition = await buildSignedPdf((splitKeys) => ({
        pageSize: 'LEGAL',
        pageOrientation: 'landscape',
        content: [
          ...content,
          ...signedTableNodes(table, splitKeys),
          signatories,
        ],
        styles: {
          title: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] },
          subTitle: { fontSize: 12, margin: [0, 0, 0, 10] },
          tableHeader: { bold: true, alignment: 'center' },
        },
        defaultStyle: { fontSize: 9, alignment: 'right' },
      }))

      pdfMake
        .createPdf(docDefinition)
        .download(`Appropriation_Summary_${fileStamp}.pdf`)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const email = session?.user?.email ?? ''
  if (
    !hasAccess('ris_admin') &&
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
  const balanceTone = (n: number) =>
    n < 0 ? 'text-red-600 dark:text-red-400' : ''

  const isEmpty = summary.length === 0

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
              <Title title="Appropriation Summary" />
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Approved R.I.S. consumption per appropriation for the year
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={exportExcel}
                disabled={loading || downloadingExcel || isEmpty}
                aria-label="Export appropriation summary to Excel">
                {downloadingExcel ? (
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
                {downloadingExcel ? 'Exporting...' : 'Export to Excel'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={exportPdf}
                disabled={loading || downloadingPdf || isEmpty}
                aria-label="Export appropriation summary to PDF">
                {downloadingPdf ? (
                  <Loader2
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4 animate-spin"
                  />
                ) : (
                  <FileText
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4 text-red-600"
                  />
                )}
                {downloadingPdf ? 'Exporting...' : 'Export to PDF'}
              </Button>
            </div>
          </div>

          <div className="app__filters">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                <div className="min-w-0 space-y-2">
                  <label
                    htmlFor="appropriation-summary-year"
                    className="app__form_label">
                    Year
                  </label>
                  <Select
                    value={String(filterYear)}
                    onValueChange={(v) => setFilterYear(Number(v))}>
                    <SelectTrigger
                      id="appropriation-summary-year"
                      className="h-9 bg-white dark:bg-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem
                          key={y}
                          value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {loading && <TwoColTableLoading />}

          {!loading && (
            <div className="space-y-4 pb-6">
              <div className="mx-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
                <StatWidget
                  label="Appropriations"
                  value={summary.length.toLocaleString('en-US')}
                  icon={Landmark}
                  tone="text-gray-600 bg-gray-100 dark:bg-gray-800"
                />
                <StatWidget
                  label="Total Appropriated"
                  value={formatCurrency(totals.amount)}
                  icon={Wallet}
                  tone="text-blue-600 bg-blue-50 dark:bg-blue-950/40"
                />
                <StatWidget
                  label={`Consumed in ${filterYear}`}
                  value={formatCurrency(totals.consumedYear)}
                  icon={Wallet}
                  tone="text-violet-600 bg-violet-50 dark:bg-violet-950/40"
                />
                <StatWidget
                  label="Remaining Balance"
                  value={formatCurrency(totals.remaining)}
                  icon={PiggyBank}
                  tone="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                />
                <StatWidget
                  label="Approved Requisitions"
                  value={totals.requisitions.toLocaleString('en-US')}
                  icon={FileText}
                  tone="text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                />
              </div>

              {isEmpty ? (
                <div className="mx-4 flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <Inbox
                    aria-hidden="true"
                    className="h-8 w-8 text-gray-300"
                  />
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {loadError
                      ? 'Could not load the appropriation summary'
                      : `No approved R.I.S. charged to an appropriation in ${filterYear}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {loadError
                      ? 'Please refresh the page and try again.'
                      : 'Try selecting a different year.'}
                  </div>
                </div>
              ) : (
                <section className="mx-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Appropriations in {filterYear}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Appropriations with approved R.I.S. requested in{' '}
                      {filterYear}. Remaining balance deducts approved R.I.S.
                      from all years.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                        <tr>
                          <th className={`${th} w-12`}>#</th>
                          <th className={th}>Appropriation</th>
                          <th className={thNum}>Appropriation Amount</th>
                          <th className={thNum}>Gasoline (L)</th>
                          <th className={thNum}>Diesel (L)</th>
                          <th className={thNum}>Oil and Lubricants (L)</th>
                          <th className={thNum}>Approved R.I.S.</th>
                          <th className={thNum}>Consumed ({filterYear})</th>
                          <th className={thNum}>Consumed (Other Years)</th>
                          <th className={thNum}>Remaining Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {summary.map((row, idx) => (
                          <tr
                            key={row.appropriationId}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className={`${td} tabular-nums text-gray-400`}>
                              {idx + 1}
                            </td>
                            <td className={`${td} font-medium`}>{row.name}</td>
                            <td className={tdNum}>
                              {formatCurrency(row.amount)}
                            </td>
                            <td className={tdNum}>{toRisQty(row.gasoline)}</td>
                            <td className={tdNum}>{toRisQty(row.diesel)}</td>
                            <td className={tdNum}>{toRisQty(row.oil)}</td>
                            <td className={tdNum}>
                              {row.requisitions.toLocaleString('en-US')}
                            </td>
                            <td className={`${tdNum} font-medium`}>
                              {formatCurrency(row.consumedYear)}
                            </td>
                            <td className={tdNum}>
                              {formatCurrency(row.consumedOther)}
                            </td>
                            <td
                              className={`${tdNum} font-medium ${balanceTone(
                                row.remaining,
                              )}`}>
                              {formatCurrency(row.remaining)}
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
                            {formatCurrency(totals.amount)}
                          </td>
                          <td className={tfNum}>{toRisQty(totals.gasoline)}</td>
                          <td className={tfNum}>{toRisQty(totals.diesel)}</td>
                          <td className={tfNum}>{toRisQty(totals.oil)}</td>
                          <td className={tfNum}>
                            {totals.requisitions.toLocaleString('en-US')}
                          </td>
                          <td className={tfNum}>
                            {formatCurrency(totals.consumedYear)}
                          </td>
                          <td className={tfNum}>
                            {formatCurrency(totals.consumedOther)}
                          </td>
                          <td
                            className={`${tfNum} ${balanceTone(
                              totals.remaining,
                            )}`}>
                            {formatCurrency(totals.remaining)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Page
