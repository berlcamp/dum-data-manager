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

const CategoryCount = ({
  category,
  core,
  blc,
  prov,
}: {
  category: string
  core: number
  blc: number
  prov: number
}) => {
  return (
    <div className="hover:bg-slate-200 text-gray-700">
      <div className="p-2">
        <div className="flex items-center justify-center">
          <div className="w-10 h-10 bg-gray-500 text-white rounded-full flex items-center justify-center">
            {category}
          </div>
        </div>
        <div className="pl-10 mt-2 font-extralight">
          <span className="text-sm">Core: </span>
          <span className="font-bold">{core}</span>
        </div>
        <div className="pl-10 font-extralight">
          <span className="text-sm">BLC: </span>
          <span className="font-bold">{blc}</span>
        </div>
        <div className="pl-10 font-extralight">
          <span className="text-sm">Province: </span>
          <span className="font-bold">{prov}</span>
        </div>
      </div>
    </div>
  )
}
const Page: React.FC = () => {
  // Filters
  const [filterBarangay, setFilterBarangay] = useState('')

  // Summary Data
  const [totalACore, setTotalACore] = useState(0)
  const [totalABlc, setTotalABlc] = useState(0)
  const [totalAProv, setTotalAProv] = useState(0)
  const [totalBCore, setTotalBCore] = useState(0)
  const [totalBBlc, setTotalBBlc] = useState(0)
  const [totalBProv, setTotalBProv] = useState(0)
  const [totalCCore, setTotalCCore] = useState(0)
  const [totalCBlc, setTotalCBlc] = useState(0)
  const [totalCProv, setTotalCProv] = useState(0)
  const [totalUCCore, setTotalUCCore] = useState(0)
  const [totalUCBlc, setTotalUCBlc] = useState(0)
  const [totalUCProv, setTotalUCProv] = useState(0)

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

  const query = async (category: string, type: string) => {
    setLoading(true)

    let query = supabase.from('ddm_profiles').select('id', { count: 'exact' })

    // Filter Address
    if (filterBarangay !== '') {
      query = query.eq('address', filterBarangay)
    }

    // Filter Category
    if (category !== '') {
      if (type === 'core') {
        query = query.eq('category', category)
      }
      if (type === 'blc') {
        query = query.eq('blc_category', category)
      }
      if (type === 'prov') {
        query = query.eq('province_category', category)
      }
    }

    const { count } = await query
    return count
  }

  const fetchData = async () => {
    setLoading(true)

    try {
      const dataSetsData: any = []

      const countACore = await query('A', 'core')
      const countABlc = await query('A', 'blc')
      const countAProv = await query('A', 'prov')
      const countBCore = await query('B', 'core')
      const countBBlc = await query('B', 'blc')
      const countBProv = await query('B', 'prov')
      const countCCore = await query('C', 'core')
      const countCBlc = await query('C', 'blc')
      const countCProv = await query('C', 'prov')
      const countUCCore = await query('UC', 'core')
      const countUCBlc = await query('UC', 'blc')
      const countUCProv = await query('UC', 'prov')

      dataSetsData.push(
        {
          label: `A`,
          data: [countACore],
          bgColor: colors[Math.floor(Math.random() * 11)],
        },
        {
          label: `B`,
          data: [countBCore],
          bgColor: colors[Math.floor(Math.random() * 11)],
        },
        {
          label: `C`,
          data: [countCCore],
          bgColor: colors[Math.floor(Math.random() * 11)],
        },
        {
          label: `UC`,
          data: [countUCCore],
          bgColor: colors[Math.floor(Math.random() * 11)],
        }
      )

      // Set summary data
      setTotalACore(countACore)
      setTotalABlc(countABlc)
      setTotalAProv(countAProv)
      setTotalBCore(countBCore)
      setTotalBBlc(countBBlc)
      setTotalBProv(countBProv)
      setTotalCCore(countCCore)
      setTotalCBlc(countCBlc)
      setTotalCProv(countCProv)
      setTotalUCCore(countUCCore)
      setTotalUCBlc(countUCBlc)
      setTotalUCProv(countUCProv)

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
              <div className="mx-4 flex border-b pb-4 justify-end">
                <CustomButton
                  containerStyles="app__btn_blue"
                  isDisabled={downloading}
                  title={downloading ? 'Downloading...' : 'Export To Excel'}
                  btnType="submit"
                  handleClick={handleDownloadExcel}
                />
              </div>
              <div className="mx-4 mt-4 text-lg">Categories Summary</div>
              <div className="mx-4 mt-2 bg-slate-100">
                <div className="border-b grid grid-cols-4">
                  <CategoryCount
                    category="A"
                    core={totalACore}
                    blc={totalABlc}
                    prov={totalAProv}
                  />
                  <CategoryCount
                    category="B"
                    core={totalBCore}
                    blc={totalBBlc}
                    prov={totalBProv}
                  />
                  <CategoryCount
                    category="C"
                    core={totalCCore}
                    blc={totalCBlc}
                    prov={totalCProv}
                  />
                  <CategoryCount
                    category="UC"
                    core={totalUCCore}
                    blc={totalUCBlc}
                    prov={totalUCProv}
                  />
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
    </>
  )
}
export default Page
