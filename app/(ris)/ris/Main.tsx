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
import { fetchRis, fetchPurchaseOrders } from '@/utils/fetchApi'
import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import React, { useEffect, useState } from 'react'

import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

import Filters from './Filters'

// Types
import type { RisTypes, RisPoTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { format } from 'date-fns'
import { TDocumentDefinitions } from 'pdfmake/interfaces'
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'
import DepartmentModal from './DepartmentModal'
import PrintAllChecked from './PrintAllChecked'

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
    undefined
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
        hasRisAdminAccess
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
          '*, ddm_user:created_by(*), ddm_ris(id,quantity,price,status,total_amount), ddm_ris_appropriation:appropriation(*), department:department_id(*)'
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
          const risAmount = Number(
            ris.total_amount || ris.quantity * ris.price || 0
          )
          totalAmount += risAmount
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
        hasRisAdminAccess
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
        hasRisAdminAccess
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
      { header: 'Starting Balance', key: 'starting_balance', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 20 },
      { header: 'Price', key: 'price', width: 20 },
      { header: 'Total Amount', key: 'total_amount', width: 20 },
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
      0,
      session?.user?.email,
      currentUser?.department_id,
      hasRisAdminAccess
    )

    const risData: RisTypes[] = result.data
    const sortedItems = risData.sort(
      (a, b) =>
        new Date(a.date_requested).getTime() -
        new Date(b.date_requested).getTime()
    )

    // Data for the Excel file
    const data: any[] = []
    const threshold = Number(filterThreshold) || 0
    let runningTotal = 0

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i]
      const amount = item.total_amount || 0

      // if (threshold && runningTotal + amount > threshold) break

      runningTotal += amount

      data.push({
        no: i + 1,
        date: format(new Date(item.date_requested), 'MM/dd/yyyy'),
        vehicle: `${item.vehicle.name}-${item.vehicle.plate_number}`,
        purpose: `${item.purpose}`,
        destination: `${item.destination || ''}`,
        type: `${item.type}`,
        starting_balance: `${item.starting_balance}`,
        quantity: `${item.quantity}`,
        price: `${item.price}`,
        total_amount: `${item.total_amount || 0}`,
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
      hasRisAdminAccess
    )

    const risData: RisTypes[] = result.data

    const sortedItems = risData.sort(
      (a, b) =>
        new Date(a.date_requested).getTime() -
        new Date(b.date_requested).getTime()
    )

    let filteredRisData: RisTypes[] = []

    const threshold = Number(filterThreshold) || 0
    let runningTotal = 0

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i]
      const amount = item.price * item.quantity

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

    const content: any[] = []

    // Loop through all vehicles
    for (const [vehicleName, items] of Object.entries(grouped)) {
      const tableBody: any[] = []

      // Header rows
      tableBody.push([
        { text: 'Date Requested', rowSpan: 2, style: 'tableHeader' },
        { text: 'Purpose', rowSpan: 2, style: 'tableHeader' },
        { text: 'Destination', rowSpan: 2, style: 'tableHeader' },
        { text: 'Starting Balance', rowSpan: 2, style: 'tableHeader' },
        {
          text: 'Additional',
          colSpan: 2,
          alignment: 'center',
          style: 'tableHeader',
        },
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
      tableBody.push([
        {},
        {},
        {},
        {},
        { text: 'Gasoline', style: 'tableHeader' },
        { text: 'Diesel', style: 'tableHeader' },
        {},
        {},
        {},
        {},
      ])

      let totalGasoline = 0
      let totalDiesel = 0
      let totalConsume = 0
      let totalAmount = 0

      for (const item of items) {
        const gasoline =
          item.type?.toLowerCase() === 'gasoline' ? item.quantity : 0
        const diesel = item.type?.toLowerCase() === 'diesel' ? item.quantity : 0
        const amount = item.total_amount || 0

        totalGasoline += gasoline
        totalDiesel += diesel
        totalConsume += item.quantity
        totalAmount += amount

        tableBody.push([
          format(new Date(item.date_requested), 'MM/dd/yyyy'),
          item.purpose,
          item.destination || '',
          item.starting_balance,
          gasoline || '',
          diesel || '',
          item.quantity, // Consume
          item.starting_balance, // Finished Balance
          item.price, // Price/L
          amount.toFixed(2), // Amount (2 decimals)
        ])
      }

      // Skip empty vehicles (no data after threshold reached)
      if (tableBody.length <= 2) continue

      // Totals row
      tableBody.push([
        { text: 'TOTAL', colSpan: 4, alignment: 'right', bold: true },
        {},
        {},
        {},
        { text: totalGasoline.toFixed(2), bold: true },
        { text: totalDiesel.toFixed(2), bold: true },
        {},
        '', // Finished Balance
        '', // Price/L
        { text: totalAmount.toFixed(2), bold: true }, // Amount (2 decimals)
      ])

      // Push this vehicle’s section into content
      content.push(
        { text: 'FUEL CONSUMPTION REPORT', style: 'header' },
        { text: vehicleName, style: 'subHeader', margin: [0, 0, 0, 10] },
        {
          table: {
            headerRows: 2,
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
            ],
            body: tableBody,
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
          },
        },
        { text: '\n\n' }, // space before signatories
        {
          unbreakable: true,
          columns: [
            {
              width: '50%',
              stack: [
                {
                  text: 'ARFEL HOPE L. BOMES',
                  bold: true,
                  decoration: 'underline',
                  alignment: 'center',
                  margin: [0, 20, 0, 0],
                },
                { text: 'MMO STAFF', alignment: 'center' },
              ],
            },
            {
              width: '50%',
              stack: [
                {
                  text: 'CERTIFIED CORRECT:',
                  alignment: 'center',
                  margin: [0, 20, 0, 20],
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
        [{ text: '', pageBreak: 'after' }]
      )
    }

    const docDefinition: any = {
      pageOrientation: 'landscape',
      pageSize: 'A4',
      content,
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
    }

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
      hasRisAdminAccess
    )

    const risData: RisTypes[] = result.data

    // Sort by date
    const sortedItems = risData.sort(
      (a, b) =>
        new Date(a.date_requested).getTime() -
        new Date(b.date_requested).getTime()
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
      }
    )

    // Table
    const tableBody: any[] = []

    tableBody.push([
      { text: 'Date Requested', rowSpan: 2, style: 'tableHeader' },
      { text: 'Vehicle', rowSpan: 2, style: 'tableHeader' },
      { text: 'Purpose', rowSpan: 2, style: 'tableHeader' },
      { text: 'Destination', rowSpan: 2, style: 'tableHeader' },
      { text: 'Starting Balance', rowSpan: 2, style: 'tableHeader' },
      {
        text: 'Additional',
        colSpan: 2,
        style: 'tableHeader',
        alignment: 'center',
      },
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

    tableBody.push([
      {},
      {},
      {},
      {},
      {},
      { text: 'Gasoline', style: 'tableHeader' },
      { text: 'Diesel', style: 'tableHeader' },
      {},
      {},
      {},
      {},
    ])

    let totalGasoline = 0
    let totalDiesel = 0
    let totalConsume = 0
    let totalAmount = 0

    const threshold = Number(filterThreshold) || 0
    let runningTotal = 0

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i]
      const gasoline =
        item.type?.toLowerCase() === 'gasoline' ? item.quantity : 0
      const diesel = item.type?.toLowerCase() === 'diesel' ? item.quantity : 0
      const amount = item.total_amount || 0

      // ⛔ Stop adding if threshold exceeded
      if (threshold && runningTotal + amount > threshold) break

      runningTotal += amount

      totalGasoline += gasoline
      totalDiesel += diesel
      totalConsume += item.quantity
      totalAmount += amount

      tableBody.push([
        format(new Date(item.date_requested), 'MM/dd/yyyy'),
        `${item.vehicle?.name || ''} - ${item.vehicle?.plate_number || ''}`,
        item.purpose,
        item.destination || '',
        item.starting_balance,
        gasoline || '',
        diesel || '',
        item.quantity,
        item.starting_balance, // ⚠️ you can compute ending balance if needed
        item.price,
        amount.toFixed(2),
      ])
    }
    // zzzz

    // ➕ Totals row
    tableBody.push([
      { text: 'TOTAL', colSpan: 5, alignment: 'right', bold: true },
      {},
      {},
      {},
      {},
      { text: totalGasoline.toFixed(2), bold: true },
      { text: totalDiesel.toFixed(2), bold: true },
      {},
      {}, // finished balance not totaled
      {}, // price not totaled
      { text: totalAmount.toFixed(2), bold: true },
    ])

    content.push({
      table: {
        headerRows: 2,
        widths: [
          60, // Date Requested
          90, // Vehicle
          120, // Purpose
          120, // Destination
          60, // Starting Balance
          50, // Gasoline
          50, // Diesel
          50, // Consume
          70, // Finished Balance
          50, // Price/L
          70, // Amount
        ],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
      },
      margin: [0, 0, 0, 20],
    })

    // ✅ Signatories (kept together)
    content.push({
      unbreakable: true, // prevents splitting across pages
      columns: [
        {
          width: '50%',
          stack: [
            {
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
              margin: [0, 20, 0, 10],
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
    })

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'LEGAL', // 📄 switched from A4 to LEGAL
      pageOrientation: 'landscape',
      content,
      styles: {
        title: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] },
        subTitle: { fontSize: 12, margin: [0, 0, 0, 10] },
        tableHeader: { bold: true, alignment: 'center' },
      },
      defaultStyle: { fontSize: 9, alignment: 'center' },
    }

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
              setFilterThreshold={setFilterThreshold}
            />
          </div>

          {/* Summary Widgets */}
          <div className="mx-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Approved Requests */}
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Total Approved Requests</div>
                <div className="text-2xl font-bold text-green-600">
                  {widgetData.filter((item) => item.status === 'Approved').length}
                </div>
              </div>

              {/* Total Liters */}
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Total Liters</div>
                <div className="text-2xl font-bold text-blue-600">
                  {widgetData
                    .filter((item) => item.status === 'Approved')
                    .reduce((sum, item) => sum + (item.quantity || 0), 0)
                    .toFixed(2)}
                </div>
              </div>

              {/* Total Amount */}
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                <div className="text-2xl font-bold text-purple-600">
                  ₱
                  {widgetData
                    .filter((item) => item.status === 'Approved')
                    .reduce(
                      (sum, item) =>
                        sum + (item.total_amount || 0),
                      0
                    )
                    .toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* Warning Message - Only show for admin users */}
          {hasRisAdminAccess && zeroPrices.length > 0 && (
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

          {/* PO List Widget - Only show for non-admin users */}
          {!hasRisAdminAccess && (
            <div className="mx-4 mb-4">
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-3 font-semibold">
                  Purchase Orders - Remaining Amounts
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {poWidgetData.length > 0 ? (
                    poWidgetData.map((po) => {
                      const remainingAmount = countRemainingAmount(po)
                      return (
                        <div
                          key={po.id}
                          className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <span className="font-medium text-gray-800">
                              {po.po_number}
                            </span>
                            {po.description && (
                              <span className="text-gray-500 text-sm ml-2">
                                - {po.description}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              Remaining
                            </div>
                            <div
                              className={`font-bold ${
                                remainingAmount < 1000
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }`}>
                              ₱
                              {remainingAmount.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-gray-500 text-sm py-2">
                      No Purchase Orders found
                    </div>
                  )}
                </div>
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
              title={downloading ? 'Downloading...' : 'Export to Excel'}
              btnType="button"
              handleClick={handleDownloadExcel}
              // handleClick={handleDownloadPDF}
            />
            <CustomButton
              containerStyles="app__btn_blue"
              isDisabled={downloading}
              title={downloading ? 'Downloading...' : 'Summary by Vehicle'}
              btnType="button"
              // handleClick={handleDownloadExcel}
              handleClick={handleDownloadPDF}
            />
            {hasRisAdminAccess && (
              <>
                <CustomButton
                  containerStyles="app__btn_blue"
                  isDisabled={downloading}
                  title={downloading ? 'Downloading...' : 'Summary by Department'}
                  btnType="button"
                  // handleClick={handleDownloadExcel}
                  handleClick={() => setShowDepartmentModal(true)}
                />
                <DepartmentModal
                  isOpen={showDepartmentModal}
                  onClose={() => setShowDepartmentModal(false)}
                  onConfirm={(deptName) => {
                    setShowDepartmentModal(false)
                    handleDownloadPDFByDepartment(deptName)
                  }}
                />
              </>
            )}
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
                            <span className="font-light">
                              Starting Balance (L):
                            </span>{' '}
                            <span className="font-medium">
                              {item.starting_balance}
                            </span>
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
                            <span className="font-light">Total Amount:</span>{' '}
                            <span className="font-medium">
                              ₱
                              {(item.total_amount || 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
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
