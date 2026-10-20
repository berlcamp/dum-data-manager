'use client'

import {
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
import {
  formatRisAmount,
  getRisAmount,
  toRisFixed,
  toRisMoney,
  toRisQty,
} from '@/utils/ris-helper'
import {
  buildSignedPdf,
  signatoriesId,
  signedTableNodes,
} from '@/utils/ris-pdf'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import React, { useEffect, useState } from 'react'

import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

import Filters from './Filters'

// Types
import type { RisPoTypes, RisTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { format } from 'date-fns'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Droplet,
  FileSpreadsheet,
  FileText,
  Inbox,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Wallet,
} from 'lucide-react'
import { TDocumentDefinitions } from 'pdfmake/interfaces'
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'
import DepartmentModal from './DepartmentModal'
import PrintAllChecked from './PrintAllChecked'

const formatListAmount = formatRisAmount

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Modals
  const [showDepartmentModal, setShowDepartmentModal] = useState(false)
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
    undefined,
  )
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined)
  const [filterThreshold, setFilterThreshold] = useState('')
  const [filterKeyword, setFilterKeyword] = useState('')

  // List
  const [list, setList] = useState<RisTypes[]>([])
  const [perPageCount, setPerPageCount] = useState<number>(10)
  const [showingCount, setShowingCount] = useState<number>(0)
  const [resultsCount, setResultsCount] = useState<number>(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [checkAll, setCheckAll] = useState(false)

  // Widget data - all results based on current filters
  const [widgetData, setWidgetData] = useState<RisTypes[]>([])

  const [zeroPrices, setZeroPrices] = useState<RisTypes[] | []>([])

  // PO widget data for non-admin users
  const [poWidgetData, setPoWidgetData] = useState<RisPoTypes[]>([])

  const { supabase, session, currentUser } = useSupabase()
  const { hasAccess, setToast } = useFilter()
  const hasRisAdminAccess = hasAccess('ris_admin')

  // Works whether it's under pdfMake.vfs or directly vfs
  pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  // Fetch all results for widget calculations
  const fetchWidgetData = async () => {
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
        99999, // Fetch all results for widgets
        0,
        session?.user?.email,
        currentUser?.department_id,
        hasRisAdminAccess,
      )

      setWidgetData(result.data || [])
    } catch (e) {
      console.error(e)
      setWidgetData([])
    }
  }

  // Fetch PO data for widget (only for non-admin users)
  const fetchPoWidgetData = async () => {
    if (hasRisAdminAccess) {
      setPoWidgetData([])
      return
    }

    try {
      // For non-admin users, filter by their department
      let query = supabase
        .from('ddm_ris_purchase_orders')
        .select(
          '*, ddm_user:created_by(*), ddm_ris(id,quantity,price,status,total_amount), ddm_ris_appropriation:appropriation(*), department:department_id(*)',
        )
        .eq('type', 'Fuel') // Only show Fuel type POs

      // Filter by department for non-admin users
      if (currentUser?.department_id) {
        query = query.eq('department_id', currentUser.department_id)
      }

      // Filter by appropriation if selected
      if (filterAppropriation && filterAppropriation !== 'All') {
        query = query.eq('appropriation', filterAppropriation)
      }

      query = query.order('id', { ascending: false })

      const { data, error } = await query

      if (error) throw new Error(error.message)

      setPoWidgetData(data || [])
    } catch (e) {
      console.error(e)
      setPoWidgetData([])
    }
  }

  // Calculate remaining amount for PO (for Fuel type)
  const countRemainingAmount = (item: RisPoTypes) => {
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
        0,
        session?.user?.email,
        currentUser?.department_id,
        hasRisAdminAccess,
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
        list.length,
        session?.user?.email,
        currentUser?.department_id,
        hasRisAdminAccess,
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
    if (item.is_locked) {
      setToast('error', 'This RIS is locked and cannot be edited.')
      return
    }
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
      { header: 'Starting Balance', key: 'starting_balance', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 20 },
      { header: 'Price', key: 'price', width: 20 },
      { header: 'Total Amount', key: 'total_amount', width: 20 },
      { header: 'Department Allocation', key: 'po', width: 20 },
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
      0,
      session?.user?.email,
      currentUser?.department_id,
      hasRisAdminAccess,
    )

    const risData: RisTypes[] = result.data
    const sortedItems = risData.sort(
      (a, b) =>
        new Date(a.date_requested).getTime() -
        new Date(b.date_requested).getTime(),
    )

    // Data for the Excel file
    const data: any[] = []
    const threshold = Number(filterThreshold) || 0
    let runningTotal = 0

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i]
      const amount = getRisAmount(item)

      // if (threshold && runningTotal + amount > threshold) break

      runningTotal += amount

      data.push({
        no: i + 1,
        date: format(new Date(item.date_requested), 'MM/dd/yyyy'),
        vehicle: `${item.vehicle.name}-${item.vehicle.plate_number}`,
        purpose: `${item.purpose}`,
        destination: `${item.destination || ''}`,
        type: `${item.type}`,
        starting_balance: toRisFixed(item.starting_balance),
        quantity: toRisFixed(item.quantity),
        price: formatRisAmount(Number(item.price ?? 0)),
        total_amount: formatRisAmount(amount),
        po: `${item.purchase_order?.po_number || ''}`,
        requester: `${item.requester}`,
        department: `${item.department.name}`,
      })
    }

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

  const handleDownloadPDF = async () => {
    setDownloading(true)

    const result = await fetchRis(
      {
        filterKeyword,
        filterAppropriation,
        filterVehicle,
        filterStatus: 'Approved', // summary only includes Approved RIS
        filterPo,
        filterCa,
        filterDateFrom,
        filterDateTo,
      },
      99999,
      0,
      session?.user?.email,
      currentUser?.department_id,
      hasRisAdminAccess,
    )

    const risData: RisTypes[] = result.data

    const sortedItems = risData.sort(
      (a, b) =>
        new Date(a.date_requested).getTime() -
        new Date(b.date_requested).getTime(),
    )

    let filteredRisData: RisTypes[] = []

    const threshold = Number(filterThreshold) || 0
    let runningTotal = 0

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i]
      const amount = getRisAmount(item)

      // ⛔ Stop adding if threshold exceeded
      if (threshold && runningTotal + amount > threshold) break
      runningTotal += amount
      filteredRisData[i] = sortedItems[i]
    }

    console.log('filteredRisData', filteredRisData)

    // Group by vehicle (for layout only)
    const grouped: Record<string, RisTypes[]> = {}
    filteredRisData.forEach((item) => {
      const key = `${item.vehicle.name}-${item.vehicle.plate_number}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    })

    // One builder per vehicle section; buildSignedPdf may ask a section to
    // split its table so the signatories keep rows above them
    const sections: ((splitKeys: Set<string>) => any[])[] = []

    // Loop through all vehicles
    for (const [vehicleName, items] of Object.entries(grouped)) {
      const header: any[][] = []
      const rows: any[][] = []

      // Header rows
      header.push([
        { text: 'Date Requested', rowSpan: 2, style: 'tableHeader' },
        { text: 'Purpose', rowSpan: 2, style: 'tableHeader' },
        { text: 'Destination', rowSpan: 2, style: 'tableHeader' },
        { text: 'Starting Balance', rowSpan: 2, style: 'tableHeader' },
        {
          text: 'Additional',
          colSpan: 3,
          alignment: 'center',
          style: 'tableHeader',
        },
        {},
        {},
        { text: 'Consume', rowSpan: 2, style: 'tableHeader' },
        { text: 'Finished Balance', rowSpan: 2, style: 'tableHeader' },
        { text: 'Price/L', rowSpan: 2, style: 'tableHeader' },
        {
          stack: [
            { text: 'Amount', style: 'tableHeader' },
            {
              text: '(Add’l * Price)',
              fontSize: 7,
              italics: true,
              color: 'black',
            },
          ],
          rowSpan: 2,
        },
      ])

      // Second header row
      header.push([
        {},
        {},
        {},
        {},
        { text: 'Gasoline', style: 'tableHeader' },
        { text: 'Diesel', style: 'tableHeader' },
        { text: 'Oil & Lub', style: 'tableHeader' },
        {},
        {},
        {},
        {},
      ])

      let totalGasoline = 0
      let totalDiesel = 0
      let totalOil = 0
      let totalConsume = 0
      let totalAmount = 0

      for (const item of items) {
        const gasoline =
          item.type?.toLowerCase() === 'gasoline' ? item.quantity : 0
        const diesel = item.type?.toLowerCase() === 'diesel' ? item.quantity : 0
        const oil =
          item.type?.toLowerCase() === 'oil and lubricants' ? item.quantity : 0
        const amount = getRisAmount(item)

        totalGasoline += gasoline
        totalDiesel += diesel
        totalOil += oil
        totalConsume += item.quantity
        totalAmount += amount

        rows.push([
          format(new Date(item.date_requested), 'MM/dd/yyyy'),
          item.purpose,
          item.destination || '',
          toRisQty(item.starting_balance),
          gasoline ? toRisQty(gasoline) : '',
          diesel ? toRisQty(diesel) : '',
          oil ? toRisQty(oil) : '',
          toRisQty(item.quantity), // Consume
          toRisQty(item.starting_balance), // Finished Balance
          toRisMoney(item.price ?? 0), // Price/L
          toRisMoney(amount), // Amount
        ])
      }

      // Skip empty vehicles (no data after threshold reached)
      if (rows.length === 0) continue

      // Totals row
      const totals = [
        { text: 'TOTAL', colSpan: 4, alignment: 'right', bold: true },
        {},
        {},
        {},
        { text: toRisQty(totalGasoline), bold: true },
        { text: toRisQty(totalDiesel), bold: true },
        { text: toRisQty(totalOil), bold: true },
        {},
        '', // Finished Balance
        '', // Price/L
        { text: toRisMoney(totalAmount), bold: true },
      ]

      // Signatories from PO department (ddm_ris_departments.issued_by, issued_by_designation)

      const dept = items[0]?.purchase_order?.department ?? items[0]?.department
      const issuedBy = dept?.issued_by ?? 'ARFEL HOPE L. BOMES'
      const issuedByDesignation = dept?.issued_by_dessignation ?? 'MMO STAFF'

      const key = String(sections.length)

      // This vehicle's section
      sections.push((splitKeys) => [
        { text: 'FUEL CONSUMPTION REPORT', style: 'header' },
        { text: vehicleName, style: 'subHeader', margin: [0, 0, 0, 10] },
        ...signedTableNodes(
          {
            key,
            header,
            rows,
            footer: [totals],
            widths: [
              'auto',
              '*',
              '*',
              'auto',
              'auto',
              'auto',
              'auto',
              'auto',
              'auto',
              'auto',
              'auto',
            ],
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
            },
          },
          splitKeys,
        ),
        { text: '\n\n' }, // space before signatories
        {
          unbreakable: true,
          columns: [
            {
              width: '50%',
              stack: [
                {
                  id: signatoriesId(key),
                  text: issuedBy,
                  bold: true,
                  decoration: 'underline',
                  alignment: 'center',
                  margin: [0, 20, 0, 0],
                },
                { text: issuedByDesignation, alignment: 'center' },
              ],
            },
            {
              width: '50%',
              stack: [
                {
                  text: 'CERTIFIED CORRECT:',
                  alignment: 'center',
                  margin: [0, 20, 0, 50],
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
        },
        [{ text: '', pageBreak: 'after' }],
      ])
    }

    const docDefinition = await buildSignedPdf((splitKeys) => ({
      pageOrientation: 'landscape',
      pageSize: 'A4',
      content: sections.flatMap((section) => section(splitKeys)),
      styles: {
        header: {
          fontSize: 14,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 5],
        },
        subHeader: {
          fontSize: 12,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
        tableHeader: {
          bold: true,
          alignment: 'center',
        },
      },
      defaultStyle: {
        fontSize: 9,
        alignment: 'center',
      },
    }))

    pdfMake.createPdf(docDefinition).download('FuelConsumptionReport.pdf')
    setDownloading(false)
  }

  const handleDownloadPDFByDepartment = async (deptName: string) => {
    setDownloading(true)

    const result = await fetchRis(
      {
        filterKeyword,
        filterAppropriation,
        filterVehicle,
        filterStatus: 'Approved', // summary only includes Approved RIS
        filterPo,
        filterCa,
        filterDateFrom,
        filterDateTo,
      },
      99999,
      0,
      session?.user?.email,
      currentUser?.department_id,
      hasRisAdminAccess,
    )

    const risData: RisTypes[] = result.data

    // Sort by date
    const sortedItems = risData.sort(
      (a, b) =>
        new Date(a.date_requested).getTime() -
        new Date(b.date_requested).getTime(),
    )

    const content: any[] = []

    // Title
    content.push(
      {
        text: 'FUEL CONSUMPTION REPORT',
        style: 'title',
        alignment: 'center',
      },
      {
        text: `DEPARTMENT: ${deptName}`,
        style: 'subTitle',
        alignment: 'center',
        margin: [0, 0, 0, 10],
      },
    )

    // Table
    const header: any[][] = []
    const rows: any[][] = []

    header.push([
      { text: 'Date Requested', rowSpan: 2, style: 'tableHeader' },
      { text: 'Vehicle', rowSpan: 2, style: 'tableHeader' },
      { text: 'Purpose', rowSpan: 2, style: 'tableHeader' },
      { text: 'Destination', rowSpan: 2, style: 'tableHeader' },
      { text: 'Starting Balance', rowSpan: 2, style: 'tableHeader' },
      {
        text: 'Additional',
        colSpan: 3,
        style: 'tableHeader',
        alignment: 'center',
      },
      {},
      {},
      { text: 'Consume', rowSpan: 2, style: 'tableHeader' },
      { text: 'Finished Balance', rowSpan: 2, style: 'tableHeader' },
      { text: 'Price/L', rowSpan: 2, style: 'tableHeader' },
      {
        stack: [
          { text: 'Amount', style: 'tableHeader' },
          { text: '(Add’l * Price)', fontSize: 7, color: 'black' },
        ],
        rowSpan: 2,
      },
    ])

    header.push([
      {},
      {},
      {},
      {},
      {},
      { text: 'Gasoline', style: 'tableHeader' },
      { text: 'Diesel', style: 'tableHeader' },
      { text: 'Oil & Lub', style: 'tableHeader' },
      {},
      {},
      {},
      {},
    ])

    let totalGasoline = 0
    let totalDiesel = 0
    let totalOil = 0
    let totalConsume = 0
    let totalAmount = 0

    const threshold = Number(filterThreshold) || 0
    let runningTotal = 0

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i]
      const gasoline =
        item.type?.toLowerCase() === 'gasoline' ? item.quantity : 0
      const diesel = item.type?.toLowerCase() === 'diesel' ? item.quantity : 0
      const oil =
        item.type?.toLowerCase() === 'oil and lubricants' ? item.quantity : 0
      const amount = getRisAmount(item)

      // ⛔ Stop adding if threshold exceeded
      if (threshold && runningTotal + amount > threshold) break

      runningTotal += amount

      totalGasoline += gasoline
      totalDiesel += diesel
      totalOil += oil
      totalConsume += item.quantity
      totalAmount += amount

      rows.push([
        format(new Date(item.date_requested), 'MM/dd/yyyy'),
        `${item.vehicle?.name || ''} - ${item.vehicle?.plate_number || ''}`,
        item.purpose,
        item.destination || '',
        toRisQty(item.starting_balance),
        gasoline ? toRisQty(gasoline) : '',
        diesel ? toRisQty(diesel) : '',
        oil ? toRisQty(oil) : '',
        toRisQty(item.quantity),
        toRisQty(item.starting_balance), // ⚠️ you can compute ending balance if needed
        toRisMoney(item.price ?? 0),
        toRisMoney(amount),
      ])
    }

    // ➕ Totals row
    const totals = [
      { text: 'TOTAL', colSpan: 5, alignment: 'right', bold: true },
      {},
      {},
      {},
      {},
      { text: toRisQty(totalGasoline), bold: true },
      { text: toRisQty(totalDiesel), bold: true },
      { text: toRisQty(totalOil), bold: true },
      {},
      {}, // finished balance not totaled
      {}, // price not totaled
      { text: toRisMoney(totalAmount), bold: true },
    ]

    const table = {
      key: 'department',
      header,
      rows,
      footer: [totals],
      widths: [
        60, // Date Requested
        90, // Vehicle
        120, // Purpose
        120, // Destination
        60, // Starting Balance
        50, // Gasoline
        50, // Diesel
        50, // Oil & Lub
        50, // Consume
        70, // Finished Balance
        50, // Price/L
        70, // Amount
      ],
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
      },
      margin: [0, 0, 0, 20],
    }

    // Signatories: use default when no PO selected; otherwise from PO department
    const dept =
      filterPo === 'All'
        ? null
        : (sortedItems[0]?.purchase_order?.department ??
          sortedItems[0]?.department)
    const issuedBy = dept?.issued_by ?? 'ARFEL HOPE L. BOMES'
    const issuedByDesignation = dept?.issued_by_dessignation ?? 'MMO STAFF'

    // ✅ Signatories (kept together)
    const signatories = {
      unbreakable: true, // prevents splitting across pages
      columns: [
        {
          width: '50%',
          stack: [
            {
              id: signatoriesId(table.key),
              text: issuedBy,
              bold: true,
              decoration: 'underline',
              margin: [0, 20, 0, 0],
              alignment: 'center',
            },
            { text: issuedByDesignation, alignment: 'center' },
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

    const docDefinition = await buildSignedPdf((splitKeys) => ({
      pageSize: 'LEGAL', // 📄 switched from A4 to LEGAL
      pageOrientation: 'landscape',
      content: [...content, ...signedTableNodes(table, splitKeys), signatories],
      styles: {
        title: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] },
        subTitle: { fontSize: 12, margin: [0, 0, 0, 10] },
        tableHeader: { bold: true, alignment: 'center' },
      },
      defaultStyle: { fontSize: 9, alignment: 'center' },
    }))

    pdfMake
      .createPdf(docDefinition)
      .download(`Fuel_Consumption_Report_${deptName}.pdf`)
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

  const handleMarkAsLock = async () => {
    const ids = widgetData.map((item) => item.id)
    if (ids.length === 0) {
      setToast('error', 'No filtered records to update')
      return
    }
    try {
      const { error } = await supabase
        .from('ddm_ris')
        .update({ is_locked: true })
        .in('id', ids)

      if (error) throw new Error(error.message)

      setToast('success', 'Successfully marked as locked')
      void fetchData()
      void fetchWidgetData()
    } catch (error) {
      setToast('error', 'Something went wrong')
    }
  }

  const handleMarkAsUnlock = async () => {
    const ids = widgetData.map((item) => item.id)
    if (ids.length === 0) {
      setToast('error', 'No filtered records to update')
      return
    }
    try {
      const { error } = await supabase
        .from('ddm_ris')
        .update({ is_locked: false })
        .in('id', ids)

      if (error) throw new Error(error.message)

      setToast('success', 'Successfully marked as unlocked')
      void fetchData()
      void fetchWidgetData()
    } catch (error) {
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

  // Get all RIS without price (only for admin users)
  useEffect(() => {
    if (hasRisAdminAccess) {
      ;(async () => {
        const { data } = await supabase.from('ddm_ris').select().eq('price', 0)
        setZeroPrices(data || [])
      })()
    } else {
      setZeroPrices([])
    }
  }, [hasRisAdminAccess, supabase])

  // Update list whenever list in redux updates
  useEffect(() => {
    setList(globallist)
  }, [globallist])

  // Fetch widget data whenever filters change
  useEffect(() => {
    void fetchWidgetData()
    void fetchPoWidgetData()
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
    hasRisAdminAccess,
    currentUser?.department_id,
  ])

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

  const clearSelection = () => {
    setSelectedIds([])
    setSelectedItems([])
    setCheckAll(false)
  }

  // Widget figures, from every record matching the current filters
  const approvedRis = widgetData.filter((item) => item.status === 'Approved')
  const approvedCount = approvedRis.length
  const pendingCount = widgetData.filter(
    (item) => item.status === 'Pending',
  ).length
  const approvedLiters = approvedRis.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  )
  const approvedAmount = approvedRis.reduce(
    (sum, item) => sum + getRisAmount(item),
    0,
  )

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
              <Title title="Requisition & Issue Slip" />
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Fuel requests charged against department allocations
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
              New R.I.S.
            </Button>
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
              setFilterThreshold={setFilterThreshold}
              filterDateFrom={filterDateFrom}
              filterDateTo={filterDateTo}
              onMarkAsLock={handleMarkAsLock}
              onMarkAsUnlock={handleMarkAsUnlock}
              isSuperAdmin={superAdmins.includes(email)}
              filteredCount={widgetData.length}
            />
          </div>

          {/* Summary Widgets */}
          <div className="mx-4 mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: 'Approved Requests',
                value: approvedCount.toLocaleString('en-US'),
                icon: CheckCircle2,
                tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
              },
              {
                label: 'Pending Requests',
                value: pendingCount.toLocaleString('en-US'),
                icon: Clock,
                tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
              },
              {
                label: 'Total Liters (Approved)',
                value: approvedLiters.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                icon: Droplet,
                tone: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
              },
              {
                label: 'Total Amount (Approved)',
                value: `₱${formatListAmount(approvedAmount)}`,
                icon: Wallet,
                tone: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-4">
                <div
                  className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-md sm:flex ${stat.tone}`}>
                  <stat.icon
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </div>
                  <div className="truncate text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100 sm:text-xl">
                    {stat.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Warning Message - Only show for admin users */}
          {hasRisAdminAccess && zeroPrices.length > 0 && (
            <div
              role="alert"
              className="mx-4 mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle
                aria-hidden="true"
                className="h-4 w-4 shrink-0"
              />
              <div>
                <span className="font-semibold">
                  {zeroPrices.length} R.I.S. have a price of 0:
                </span>{' '}
                {zeroPrices.map((ris) => ris.id).join(', ')}
              </div>
            </div>
          )}

          {/* PO List Widget - Only show for non-admin users */}
          {!hasRisAdminAccess && (
            <div className="mx-4 mb-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-gray-200">
                Department Allocations
              </div>
              <div className="max-h-60 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                {poWidgetData.length > 0 ? (
                  poWidgetData.map((po) => {
                    const allocated = Number(po.amount ?? 0)
                    const remainingAmount = countRemainingAmount(po)
                    const usedPct =
                      allocated > 0
                        ? Math.min(
                            100,
                            ((allocated - remainingAmount) / allocated) * 100,
                          )
                        : 100
                    const isLow = remainingAmount < 1000
                    return (
                      <div
                        key={po.id}
                        className="px-4 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                              {po.po_number}
                            </div>
                            {po.description && (
                              <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {po.description}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <div
                              className={`text-sm font-semibold tabular-nums ${
                                isLow
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                              ₱{formatListAmount(remainingAmount)}
                            </div>
                            <div className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                              left of ₱{formatListAmount(allocated)}
                            </div>
                          </div>
                        </div>
                        <div
                          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                          role="progressbar"
                          aria-label={`${po.po_number} used`}
                          aria-valuenow={Math.round(usedPct)}
                          aria-valuemin={0}
                          aria-valuemax={100}>
                          <div
                            className={`h-full rounded-full ${
                              isLow ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="px-4 py-3 text-xs text-gray-500">
                    No Department Allocations found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Toolbar: bulk actions for the selected rows + exports */}
          <div className="mx-4 mb-3 flex flex-wrap items-center gap-2">
            {selectedItems.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 dark:border-blue-900 dark:bg-blue-950/30">
                <span className="px-1 text-xs font-semibold text-blue-800 dark:text-blue-300">
                  {selectedItems.length} selected
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApproveSelected}
                  className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4"
                  />
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handlePendingSelected}>
                  <Clock
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4"
                  />
                  Mark as Pending
                </Button>
                <PrintAllChecked selectedRis={selectedItems} />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}>
                  Clear selection
                </Button>
              </div>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Select rows to approve, mark as pending or print.
              </span>
            )}
            <div className="ml-auto">
              {/* Non-modal: a modal menu leaves pointer-events: none on <body> when
                  an item opens a Dialog or blocks the main thread (PDF export) */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={downloading}>
                    {downloading ? (
                      <Loader2
                        aria-hidden="true"
                        className="mr-1.5 h-4 w-4 animate-spin"
                      />
                    ) : (
                      <Download
                        aria-hidden="true"
                        className="mr-1.5 h-4 w-4"
                      />
                    )}
                    {downloading ? 'Preparing…' : 'Export'}
                    <ChevronDown
                      aria-hidden="true"
                      className="ml-1.5 h-4 w-4"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => void handleDownloadExcel()}>
                    <FileSpreadsheet
                      aria-hidden="true"
                      className="mr-2 h-4 w-4"
                    />
                    Excel list
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void handleDownloadPDF()}>
                    <FileText
                      aria-hidden="true"
                      className="mr-2 h-4 w-4"
                    />
                    Summary by Vehicle (PDF)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setShowDepartmentModal(true)}>
                    <FileText
                      aria-hidden="true"
                      className="mr-2 h-4 w-4"
                    />
                    Summary by Department (PDF)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <DepartmentModal
              isOpen={showDepartmentModal}
              onClose={() => setShowDepartmentModal(false)}
              onConfirm={(deptName) => {
                setShowDepartmentModal(false)
                handleDownloadPDFByDepartment(deptName)
              }}
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
                  <th className="hidden md:table-cell app__th w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all rows"
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                      checked={checkAll}
                      onChange={handleCheckAllChange}
                    />
                  </th>
                  <th className="hidden md:table-cell app__th">RIS #</th>
                  <th className="app__th">Details</th>
                  <th className="app__th">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item: RisTypes, index: number) => {
                    const isSelected = selectedIds.includes(item.id.toString())
                    return (
                      <tr
                        key={index}
                        onClick={() =>
                          handleCheckboxChange(item.id.toString())
                        }
                        className={`app__tr cursor-pointer transition-colors ${
                          isSelected
                            ? '!bg-blue-50 dark:!bg-blue-950/30'
                            : ''
                        }`}>
                        <td className="hidden md:table-cell app__td align-top pt-3">
                          <input
                            type="checkbox"
                            aria-label={`Select R.I.S. ${item.id}`}
                            className="h-4 w-4 cursor-pointer accent-emerald-600"
                            value={item.id.toString()}
                            checked={isSelected}
                            readOnly
                          />
                        </td>
                        <td className="hidden md:table-cell app__td align-top pt-3">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {item.id}
                          </div>
                        </td>
                        <td className="app__td py-2.5">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900 md:hidden dark:text-gray-100">
                              #{item.id}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                item.status === 'Pending'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              }`}>
                              {item.status}
                            </span>
                            {item.is_locked && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                <Lock
                                  aria-hidden="true"
                                  className="h-3 w-3"
                                />
                                Locked
                              </span>
                            )}
                            <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                              ₱{formatListAmount(getRisAmount(item))}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {item.date_requested &&
                                format(
                                  new Date(item.date_requested),
                                  'MMMM dd, yyyy',
                                )}
                            </span>
                          </div>
                          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
                            {[
                              ['Type', item.type],
                              [
                                'Allocation',
                                item.transaction_type === 'Cash Advance'
                                  ? `C.A. ${item.cash_advance?.ca_number ?? ''}`
                                  : item.purchase_order?.po_number,
                              ],
                              ['Department', item.department?.name],
                              ['Requester', item.requester],
                              [
                                'Vehicle',
                                item.vehicle
                                  ? `${item.vehicle.name} - ${item.vehicle.plate_number}`
                                  : '',
                              ],
                              [
                                'Quantity',
                                `${item.quantity} L @ ₱${formatListAmount(
                                  Number(item.price ?? 0),
                                )}/L`,
                              ],
                              ['Starting Balance', `${item.starting_balance} L`],
                              ['Purpose', item.purpose],
                              ['Destination', item.destination],
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
                        </td>
                        <td className="app__td align-top pt-2.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Edit R.I.S. ${item.id}`}
                            onClick={(e) => {
                              // Don't toggle the row selection too
                              e.stopPropagation()
                              handleEdit(item)
                            }}>
                            <Pencil
                              aria-hidden="true"
                              className="h-3.5 w-3.5 md:mr-1.5"
                            />
                            <span className="hidden md:inline">Edit</span>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
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
                  No R.I.S. found
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
