import { format, parseISO } from 'date-fns'

import type { PortalHistoryItem } from '@/utils/portal-fuel'
import { roundRisAmount, toRisFixed } from '@/utils/ris-helper'

// Server-only: builds the portal's transaction history PDF. It is rendered on
// the server and sent as an attachment because mobile browsers (iOS Safari,
// in-app webviews) often ignore the blob download pdfmake does client-side.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const vfsFonts = require('pdfmake/build/vfs_fonts.js')

const vfs = vfsFonts.pdfMake?.vfs || vfsFonts.vfs || vfsFonts
const font = (name: string) => Buffer.from(vfs[name], 'base64')

let printer: any = null
const getPrinter = () => {
  if (!printer) {
    printer = new PdfPrinter({
      Roboto: {
        normal: font('Roboto-Regular.ttf'),
        bold: font('Roboto-Medium.ttf'),
        italics: font('Roboto-Italic.ttf'),
        bolditalics: font('Roboto-MediumItalic.ttf'),
      },
    })
  }
  return printer
}

interface HistoryPdfOptions {
  code: string
  department: string
  poNumber: string
  poAllocatedAmount: number
  items: PortalHistoryItem[]
}

export const buildHistoryPdf = ({
  code,
  department,
  poNumber,
  poAllocatedAmount,
  items,
}: HistoryPdfOptions): Promise<Buffer> => {
  const tableBody: any[] = [
    [
      { text: 'Date', style: 'tableHeader' },
      { text: 'Requester', style: 'tableHeader' },
      { text: 'Vehicle', style: 'tableHeader' },
      { text: 'Destination', style: 'tableHeader' },
      { text: 'Type', style: 'tableHeader' },
      { text: 'PO Allocated Amount', style: 'tableHeader' },
      { text: 'Qty (L)', style: 'tableHeader' },
      { text: 'Price', style: 'tableHeader' },
      { text: 'Amount', style: 'tableHeader' },
      { text: 'Status', style: 'tableHeader' },
    ],
  ]

  let totalQuantity = 0
  let totalAmount = 0

  for (const item of items) {
    totalQuantity += Number(item.quantity ?? 0)
    totalAmount += Number(item.amount ?? 0)
    tableBody.push([
      item.date_requested
        ? format(parseISO(item.date_requested), 'MM/dd/yyyy')
        : '',
      item.requester || '',
      item.vehicle || '',
      item.destination || '',
      item.type || '',
      toRisFixed(poAllocatedAmount),
      toRisFixed(item.quantity),
      toRisFixed(item.price),
      toRisFixed(item.amount),
      item.status || '',
    ])
  }

  tableBody.push([
    { text: 'TOTAL', bold: true, colSpan: 6, alignment: 'right' },
    '',
    '',
    '',
    '',
    '',
    { text: toRisFixed(roundRisAmount(totalQuantity)), bold: true },
    '',
    { text: toRisFixed(roundRisAmount(totalAmount)), bold: true },
    '',
  ])

  const subHeader = [
    `Code: ${code}`,
    department ? `Department: ${department}` : '',
    poNumber ? `P.O.: ${poNumber}` : '',
  ]
    .filter(Boolean)
    .join('   •   ')

  const docDefinition: any = {
    pageOrientation: 'landscape',
    pageSize: 'A4',
    content: [
      { text: 'FUEL REQUEST TRANSACTION HISTORY', style: 'header' },
      { text: subHeader, style: 'subHeader' },
      items.length === 0
        ? {
            text: 'No approved fuel requests yet for this P.O.',
            margin: [0, 10, 0, 0],
          }
        : {
            table: {
              headerRows: 1,
              widths: [
                'auto',
                '*',
                '*',
                '*',
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
    ],
    styles: {
      header: {
        fontSize: 14,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 5],
      },
      subHeader: {
        fontSize: 9,
        alignment: 'center',
        margin: [0, 0, 0, 10],
      },
      tableHeader: {
        bold: true,
        alignment: 'center',
      },
    },
    defaultStyle: {
      fontSize: 8,
      alignment: 'center',
    },
  }

  return new Promise((resolve, reject) => {
    const doc = getPrinter().createPdfKitDocument(docDefinition)
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}
