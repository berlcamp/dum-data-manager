'use client'

import {
  CustomButton,
  Sidebar,
  Title,
  TopBar,
  TwoColTableLoading,
  Unauthorized,
} from '@/components/index'
import { fetchProfiles } from '@/utils/fetchApi'
import React, { useEffect, useState } from 'react'

import Excel from 'exceljs'
import { saveAs } from 'file-saver'
import Filters from './Filters'

// Types
import type { ProfileTypes } from '@/types'

// Redux imports
import ProfilingSidebar from '@/components/Sidebars/ProfilingSidebar'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import CategoriesChart from './CategoriesChart'
import DetailsModal from './DetailsModal'

const Page: React.FC = () => {
  // Modal
  const [viewDetailsModal, setViewDetailsModal] = useState(false)
  const [details, setDetails] = useState<ProfileTypes | null>(null)

  // Filters
  const [filterBarangay, setFilterBarangay] = useState('')

  // Summary Data
  const [totalA, setTotalA] = useState(0)
  const [totalB, setTotalB] = useState(0)
  const [totalC, setTotalC] = useState(0)
  const [totalUC, setTotalUC] = useState(0)

  // Chart data
  const [dataSets, setDataSets] = useState([])
  const [labels, setLabels] = useState<string[] | []>([])

  const [positionsDataSets, setPositionsDataSets] = useState([])

  // Loading
  const [downloading, setDownloading] = useState(false)
  const [loading, setLoading] = useState(false)

  const { supabase, session } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  const colors = [
    '#55d978',
    '#d9ca55',
    '#d9985f',
    '#5caecc',
    '#adedd9',
    '#d0e3f7',
    '#c3ffad',
    '#ffc4ef',
    '#87f5ff',
    '#8ce37d',
    '#6dd6b5',
  ]

  const query = async (category: string) => {
    setLoading(true)

    let query = supabase.from('ddm_profiles').select('id', { count: 'exact' })

    // Filter Address
    if (filterBarangay !== '') {
      query = query.eq('address', filterBarangay)
    }

    // Filter Category
    if (category !== '') {
      query = query.eq('category', category)
    }

    const { count } = await query
    return count
  }

  const fetchData = async () => {
    setLoading(true)

    try {
      const dataSetsData: any = []

      const countA = await query('A')
      const countB = await query('B')
      const countC = await query('C')
      const countUC = await query('UC')

      dataSetsData.push(
        {
          label: `A`,
          data: [countA],
          bgColor: colors[Math.floor(Math.random() * 11)],
        },
        {
          label: `B`,
          data: [countB],
          bgColor: colors[Math.floor(Math.random() * 11)],
        },
        {
          label: `C`,
          data: [countC],
          bgColor: colors[Math.floor(Math.random() * 11)],
        },
        {
          label: `UC`,
          data: [countUC],
          bgColor: colors[Math.floor(Math.random() * 11)],
        }
      )

      // Set summary data
      setTotalA(countA)
      setTotalB(countB)
      setTotalC(countC)
      setTotalUC(countUC)

      // Charts data
      setLabels(['Categories'])
      setDataSets(dataSetsData)

      setLoading(false)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadExcel = async () => {
    if (filterBarangay === '') {
      setToast('error', 'Please apply barangay filter first')
      return
    }

    setDownloading(true)

    // Create a new workbook and add a worksheet
    const workbook = new Excel.Workbook()
    const worksheet = workbook.addWorksheet('Sheet 1')

    // Add data to the worksheet
    worksheet.columns = [
      { header: '#', key: 'no', width: 20 },
      { header: 'Fullname', key: 'fullname', width: 20 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Barangay', key: 'barangay', width: 20 },
      // Add more columns based on your data structure
    ]

    const result = await fetchProfiles(
      {
        filterBarangay,
      },
      99999,
      0
    )

    const profiles: ProfileTypes[] = result.data

    // Data for the Excel file
    const data: any[] = []
    profiles.forEach((item, index) => {
      data.push({
        no: index + 1,
        fullname: `${item.fullname}`,
        barangay: `${item.address}`,
        category: `${item.category}`,
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
      saveAs(blob, `Summary.xlsx`)
    })
    setDownloading(false)
  }

  // Featch data
  useEffect(() => {
    void fetchData()
  }, [filterBarangay])

  const email: string = session.user.email

  // Check access from permission settings or Super Admins
  if (!hasAccess('profiling') && !superAdmins.includes(email))
    return <Unauthorized />

  return (
    <>
      <Sidebar>
        <ProfilingSidebar />
      </Sidebar>
      <div className="app__main">
        <div>
          {/* Header */}
          <TopBar />
          <div className="app__title">
            <Title title="Profiles Summary" />
          </div>

          {/* Filters */}
          <div className="app__filters">
            <Filters setFilterBarangay={setFilterBarangay} />
          </div>

          {loading && <TwoColTableLoading />}
          {!loading && (
            <>
              <div className="mx-4 flex justify-end">
                <CustomButton
                  containerStyles="app__btn_blue"
                  isDisabled={downloading}
                  title={downloading ? 'Downloading...' : 'Export To Excel'}
                  btnType="submit"
                  handleClick={handleDownloadExcel}
                />
              </div>
              <div className="mx-4 mt-10 text-lg">Categories Summary</div>
              <div className="mx-4 mt-2 bg-slate-100">
                <div className="border-b grid grid-cols-4">
                  <div className="hover:bg-slate-200 text-gray-700">
                    <div className="p-2">
                      <div className="text-center font-extralight">A</div>
                      <div className="flex items-center justify-center">
                        <span className="text-2xl">{totalA}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hover:bg-slate-200 text-gray-700">
                    <div className="p-2">
                      <div className="text-center font-extralight">B</div>
                      <div className="flex items-center justify-center">
                        <span className="text-2xl">{totalB}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hover:bg-slate-200 text-gray-700">
                    <div className="p-2">
                      <div className="text-center font-extralight">C</div>
                      <div className="flex items-center justify-center">
                        <span className="text-2xl">{totalC}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hover:bg-slate-200 text-gray-700">
                    <div className="p-2">
                      <div className="text-center font-extralight">UC</div>
                      <div className="flex items-center justify-center">
                        <span className="text-2xl">{totalUC}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-10 p-2 mx-auto w-full md:w-1/2">
                  <CategoriesChart
                    labels={labels}
                    dataSets={dataSets}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Details Modal */}
      {details && viewDetailsModal && (
        <DetailsModal
          details={details}
          hideModal={() => setViewDetailsModal(false)}
        />
      )}
    </>
  )
}
export default Page
