'use client'
import { TwoColTableLoading } from '@/components/index'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSupabase } from '@/context/SupabaseProvider'
import { RisCaTypes, RisTypes } from '@/types'
import { formatRisAmount, getRisAmount, toRisFixed } from '@/utils/ris-helper'
import { format } from 'date-fns'
// Redux imports
import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import { FileSpreadsheet, Inbox, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ModalProps {
  hideModal: () => void
  ca: RisCaTypes
}

export default function RisModal({ hideModal, ca }: ModalProps) {
  const [list, setList] = useState<RisTypes[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const { supabase } = useSupabase()

  const handleDownloadExcel = async () => {
    setDownloading(true)

    // Create a new workbook and add a worksheet
    const workbook = new Excel.Workbook()
    const worksheet = workbook.addWorksheet('Sheet 1')

    // Add data to the worksheet
    worksheet.columns = [
      { header: '#', key: 'no', width: 20 },
      { header: 'CA', key: 'ca', width: 20 },
      { header: 'Requester', key: 'requester', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 20 },
      { header: 'Price', key: 'price', width: 20 },
      { header: 'Total Amount', key: 'total_amount', width: 20 },
      { header: 'Vehicle', key: 'vehicle', width: 20 },
      { header: 'Department', key: 'department', width: 20 },
      // Add more columns based on your data structure
    ]

    const risData: RisTypes[] = list

    // Data for the Excel file
    const data: any[] = []
    risData.forEach((item, index) => {
      data.push({
        no: index + 1,
        ca: `${ca.ca_number}`,
        requester: `${item.requester}`,
        type: `${item.type}`,
        quantity: toRisFixed(item.quantity),
        price: formatRisAmount(Number(item.price ?? 0)),
        total_amount: formatRisAmount(getRisAmount(item)),
        vehicle: `${item.vehicle.name}-${item.vehicle.plate_number}`,
        department: `${item.department.name}`,
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
      saveAs(blob, `CA-${ca.ca_number}.xlsx`)
    })
    setDownloading(false)
  }

  useEffect(() => {
    // fetch RIS list
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('ddm_ris')
        .select('*, vehicle:vehicle_id(*), department:department_id(*)')
        .eq('ca_id', ca.id)
        .eq('is_deleted', false)
      setList(data ?? [])
      setLoading(false)
    })()
  }, [])

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && hideModal()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-4xl dark:border-gray-700 dark:bg-gray-900">
        <DialogHeader className="border-b border-gray-200 px-5 py-4 pr-12 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-gray-900 dark:text-gray-100">
                R.I.S. charged to C.A. {ca.ca_number}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs tabular-nums">
                C.A. amount: ₱{formatRisAmount(Number(ca.amount ?? 0))}
                {ca.ca_date &&
                  ` · ${format(new Date(ca.ca_date), 'MMMM dd, yyyy')}`}
              </DialogDescription>
            </div>
            {list.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={downloading}
                onClick={() => void handleDownloadExcel()}>
                {downloading ? (
                  <Loader2
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4 animate-spin"
                  />
                ) : (
                  <FileSpreadsheet
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4"
                  />
                )}
                {downloading ? 'Preparing…' : 'Export to Excel'}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto">
          {loading && <TwoColTableLoading />}
          {!loading && list.length == 0 && (
            <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
              <Inbox
                aria-hidden="true"
                className="h-8 w-8 text-gray-300"
              />
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No R.I.S. found
              </div>
              <div className="text-xs text-gray-500">
                No R.I.S. has been charged to this C.A. yet.
              </div>
            </div>
          )}
          {!loading && list.length > 0 && (
            <table className="app__table">
              <thead className="app__thead">
                <tr>
                  <th className="app__th">Date</th>
                  <th className="app__th">Vehicle</th>
                  <th className="app__th text-right">Quantity</th>
                  <th className="app__th text-right">Price</th>
                  <th className="app__th text-right">Amount</th>
                  <th className="app__th">Requester</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr
                    key={item.id}
                    className="app__tr">
                    <td className="app__td whitespace-nowrap">
                      {item.date_requested
                        ? format(new Date(item.date_requested), 'MMM dd, yyyy')
                        : '—'}
                    </td>
                    <td className="app__td">
                      {item.vehicle
                        ? `${item.vehicle.name} - ${item.vehicle.plate_number}`
                        : '—'}
                    </td>
                    <td className="app__td whitespace-nowrap text-right tabular-nums">
                      {toRisFixed(item.quantity)} L
                    </td>
                    <td className="app__td whitespace-nowrap text-right tabular-nums">
                      ₱{formatRisAmount(Number(item.price ?? 0))}/L
                    </td>
                    <td className="app__td whitespace-nowrap text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                      ₱{formatRisAmount(getRisAmount(item))}
                    </td>
                    <td className="app__td">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {item.requester || '—'}
                      </div>
                      {item.department?.name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.department.name}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
