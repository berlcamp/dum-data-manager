'use client'

import Excel from 'exceljs'
import { saveAs } from 'file-saver'

import { CustomButton, TableRowLoading } from '@/components/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { ServicesListTypes, ServicesTypes } from '@/types'
import { useEffect, useState } from 'react'

export function CategorySummary() {
  // Filters
  const [filterBarangay, setFilterBarangay] = useState('All')
  const [filterService, setFilterService] = useState('')

  // data
  const [dataSets, setDataSets] = useState<any>([])
  const [excelData, setExcelData] = useState<any>([])

  const [services, setServices] = useState<any>([])

  // Loading
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const { supabase, session } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  const fetchData = async () => {
    if (loading) return
    if (filterService === '') return

    setLoading(true)

    const { data, error } = await supabase
      .from('ddm_profile_services_availed')
      .select(
        `*, service:service_id(name), profile:profile_id(fullname,address)`
      )
      .eq('service_id', filterService)

    if (error) {
      console.error(error)
    }

    // Summary data
    const { data: summaryData, error: error2 } = await supabase.rpc(
      'barangay_services_summary',
      {
        param_service_id: filterService,
      }
    )

    if (error2) {
      console.error(error2)
    }

    setExcelData(data)
    setDataSets(summaryData)

    setLoading(false)
  }

  const onExportSubmit = async () => {
    setDownloading(true)

    // Create a new workbook and add a worksheet
    const workbook = new Excel.Workbook()
    const worksheet = workbook.addWorksheet('Sheet 1')

    // Add data to the worksheet
    worksheet.columns = [
      { header: '#', key: 'no', width: 20 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Address', key: 'address', width: 20 },
      { header: 'Service Availed', key: 'service', width: 20 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Amount', key: 'amount', width: 20 },
    ]

    // Data for the Excel file
    const data: any[] = []
    excelData.forEach((item: ServicesTypes, index: number) => {
      data.push({
        no: index + 1,
        name: `${item.profile.fullname}`,
        address: `${item.profile.address}`,
        service: `${item.service.name}`,
        date: `${item.date}`,
        amount: `${item.amount || ''}`,
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
      saveAs(blob, `Barangay Summary.xlsx`)
    })
    setDownloading(false)
  }

  // Featch data
  useEffect(() => {
    void fetchData()
  }, [filterBarangay, filterService])

  useEffect(() => {
    ;(async () => {
      const result = await supabase
        .from('ddm_profile_services')
        .select()
        .order('id', { ascending: true })
      setServices(result.data)
      setFilterService(result.data[0].id)
    })()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Services Availed Per Barangay</CardTitle>
        {/* <CardDescription>January - June 2024</CardDescription> */}
        <div className="py-4">
          <div className="flex space-x-2">
            {/* <div>
              <div className="app__label_standard">Barangay</div>
              <div>
                <select
                  value={filterBarangay}
                  onChange={(e) => setFilterBarangay(e.target.value)}
                  className="app__input_standard">
                  <option value="All">All</option>
                  {barangays.map((bar: string, i: number) => (
                    <option
                      key={i}
                      value={bar}>
                      {bar}
                    </option>
                  ))}
                </select>
              </div>
            </div> */}
            <div>
              <div className="app__label_standard">Service Availed</div>
              <div>
                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="app__input_standard">
                  {services.map((h: ServicesListTypes, i: number) => (
                    <option
                      key={i}
                      value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 text-right">
          <CustomButton
            containerStyles="app__btn_blue"
            title="Export Beneficiaries to Excel"
            isDisabled={downloading}
            btnType="button"
            handleClick={onExportSubmit}
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Main Content */}
        <div>
          <table className="app__table">
            <thead className="app__thead">
              <tr>
                <th className="app__th">#</th>
                <th className="app__th">Barangay</th>
                <th className="app__th">Total Beneficiaries</th>
              </tr>
            </thead>
            <tbody>
              {dataSets &&
                dataSets.map((item: any, index: number) => (
                  <tr
                    key={index}
                    className="app__tr">
                    <td className="app__td">{index + 1}</td>
                    <td className="app__td">{item.address}</td>
                    <td className="app__td">{item.count}</td>
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
        </div>
      </CardContent>
      {/* <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter> */}
    </Card>
  )
}
