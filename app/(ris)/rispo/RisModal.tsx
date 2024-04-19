'use client'
import { CustomButton, TwoColTableLoading } from '@/components/index'
import { useSupabase } from '@/context/SupabaseProvider'
import { RisPoTypes, RisTypes } from '@/types'
import { format } from 'date-fns'
// Redux imports
import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import { useEffect, useRef, useState } from 'react'

interface ModalProps {
  hideModal: () => void
  po: RisPoTypes
}

export default function RisModal({ hideModal, po }: ModalProps) {
  const [list, setList] = useState<RisTypes[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const { supabase } = useSupabase()

  const wrapperRef = useRef<HTMLDivElement>(null)

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
        po: `${po.po_number}`,
        requester: `${item.requester}`,
        type: `${item.type}`,
        quantity: `${item.quantity}`,
        price: `${item.price}`,
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
      saveAs(blob, `PO-${po.po_number}.xlsx`)
    })
    setDownloading(false)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      hideModal()
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [wrapperRef])

  useEffect(() => {
    // fetch RIS list
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('ddm_ris')
        .select('*, vehicle:vehicle_id(*), department:department_id(*)')
        .eq('po_id', po.id)
      setList(data)
      setLoading(false)
    })()
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="app__modal_wrapper">
      <div className="app__modal_wrapper2_large">
        <div className="app__modal_wrapper3">
          <div className="app__modal_header">
            <h5 className="text-md font-bold leading-normal text-gray-800 dark:text-gray-300">
              P.O. #: {po.po_number}
            </h5>
            <div className="flex space-x-2">
              {list.length > 0 && (
                <CustomButton
                  containerStyles="app__btn_blue"
                  title={downloading ? 'Downloading' : 'Export to Excel'}
                  btnType="button"
                  handleClick={handleDownloadExcel}
                />
              )}
              <CustomButton
                containerStyles="app__btn_gray"
                title="Close"
                btnType="button"
                handleClick={hideModal}
              />
            </div>
          </div>

          <div className="app__modal_body">
            {loading && <TwoColTableLoading />}
            {!loading && list.length == 0 && (
              <div className="my-10 text-center">No R.I.S. records found.</div>
            )}
            {list.length > 0 && (
              <table className="app__table">
                <thead className="app__thead">
                  <tr>
                    <th className="app__th">Date</th>
                    <th className="app__th">Vehicle</th>
                    <th className="app__th">Quantity</th>
                    <th className="app__th">Price</th>
                    <th className="app__th">Amount</th>
                    <th className="app__th">Requester</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item, index: number) => (
                    <tr
                      key={index}
                      className="app__tr">
                      <td className="app__td">
                        <div className="flex items-center space-x-2 whitespace-nowrap uppercase">
                          <span className="text-lg">
                            {format(new Date(item.date_requested), 'dd')}
                          </span>
                          <span>
                            {format(new Date(item.date_requested), 'MMM yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="app__td">
                        {item.vehicle?.name}-{item.vehicle?.plate_number}
                      </td>
                      <td className="app__td">
                        <div>{item.quantity} Liters</div>
                      </td>
                      <td className="app__td whitespace-nowrap">
                        {item.price.toLocaleString('en-US', {
                          minimumFractionDigits: 2, // Minimum number of decimal places
                          maximumFractionDigits: 2, // Maximum number of decimal places
                        })}{' '}
                        per Liter
                      </td>
                      <td className="app__td">
                        {(item.price * item.quantity).toLocaleString('en-US', {
                          minimumFractionDigits: 2, // Minimum number of decimal places
                          maximumFractionDigits: 2, // Maximum number of decimal places
                        })}
                      </td>
                      <td className="app__td">
                        {item.requester} / {item.department?.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
