'use client'

import Excel from 'exceljs'
import { saveAs } from 'file-saver'

import { CustomButton, TableRowLoading } from '@/components/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { ProfileSurveyTypes } from '@/types'
import { useEffect, useState } from 'react'

export function CategorySummary() {
  // Filters
  const [filterSurvey, setFilterSurvey] = useState('')
  const [filterType, setFilterType] = useState('Core')

  // Chart data
  const [dataSets, setDataSets] = useState<any>([])
  const [labels, setLabels] = useState<any>([])

  const [surveys, setSurveys] = useState<any>([])

  // Loading
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const { supabase, session } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  const fetchData = async () => {
    if (filterSurvey === '') return
    if (loading) return

    setLoading(true)

    const { data, error } = await supabase.rpc('barangay_category_summary', {
      param_type: filterType,
      param_survey_id: filterSurvey,
    })

    if (error) {
      console.error(error)
    }

    setDataSets(data)
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
      { header: 'Barangay', key: 'barangay', width: 20 },
      { header: 'A', key: 'a', width: 20 },
      { header: 'B', key: 'b', width: 20 },
      { header: 'C', key: 'c', width: 20 },
      { header: 'D', key: 'd', width: 20 },
      { header: 'INC', key: 'inc', width: 20 },
      { header: 'UC', key: 'uc', width: 20 },
    ]

    // Data for the Excel file
    const data: any[] = []
    dataSets.forEach((item: any, index: number) => {
      data.push({
        no: index + 1,
        barangay: `${item.address}`,
        a: `${item.a}`,
        b: `${item.b}`,
        c: `${item.c}`,
        d: `${item.d}`,
        inc: `${item.inc}`,
        uc: `${item.uc}`,
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
  }, [filterType, filterSurvey])

  useEffect(() => {
    ;(async () => {
      const result = await supabase
        .from('ddm_profile_surveys')
        .select()
        .order('id', { ascending: true })
      setSurveys(result.data)
      setFilterSurvey(result.data[0].id)
    })()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Summary per Barangay</CardTitle>
        {/* <CardDescription>January - June 2024</CardDescription> */}
        <div className="py-4">
          <div className="flex space-x-2">
            <div>
              <div className="app__label_standard">Survey Batch</div>
              <div>
                <select
                  value={filterSurvey}
                  onChange={(e) => setFilterSurvey(e.target.value)}
                  className="app__input_standard">
                  {surveys.map((h: ProfileSurveyTypes, i: number) => (
                    <option
                      key={i}
                      value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="app__label_standard">Category Type</div>
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="app__input_standard">
                  <option value="Core">Core</option>
                  <option value="BLC">BLC</option>
                  <option value="Province">Province</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 text-right">
          <CustomButton
            containerStyles="app__btn_blue"
            title="Export to Excel"
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
                <th className="app__th">A</th>
                <th className="app__th">B</th>
                <th className="app__th">C</th>
                <th className="app__th">D</th>
                <th className="app__th">INC</th>
                <th className="app__th">UC</th>
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
                    <td className="app__td">{item.a}</td>
                    <td className="app__td">{item.b}</td>
                    <td className="app__td">{item.c}</td>
                    <td className="app__td">{item.d}</td>
                    <td className="app__td">{item.inc}</td>
                    <td className="app__td">{item.uc}</td>
                  </tr>
                ))}
              {loading && (
                <TableRowLoading
                  cols={8}
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
