'use client'

import {
  PerPage,
  Sidebar,
  TableRowLoading,
  Title,
  TopBar,
  Unauthorized,
} from '@/components/index'
import React, { useEffect, useState } from 'react'

import { CustomButton } from '@/components/index'

// Redux imports
import ProfilingSidebar from '@/components/Sidebars/ProfilingSidebar'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { ImportLogTypes } from '@/types'
import { fetchImportLogs } from '@/utils/fetchApi'
import { useDispatch, useSelector } from 'react-redux'
import ExportModal from './ExportModal'
import ImportModal from './ImportModal'

const Page: React.FC = () => {
  //
  const { session, supabase } = useSupabase()
  const { hasAccess } = useFilter()
  const [loading, setLoading] = useState(false)

  // List
  const [list, setList] = useState<ImportLogTypes[]>([])
  const [perPageCount, setPerPageCount] = useState<number>(10)
  const [showingCount, setShowingCount] = useState<number>(0)
  const [resultsCount, setResultsCount] = useState<number>(0)

  // Modals
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)

    try {
      const result = await fetchImportLogs(perPageCount, 0)

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
      const result = await fetchImportLogs(perPageCount, list.length)

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

  // Update list whenever list in redux updates
  useEffect(() => {
    setList(globallist)
  }, [globallist])

  // Featch data
  useEffect(() => {
    setList([])
    void fetchData()
  }, [perPageCount])

  const isDataEmpty = !Array.isArray(list) || list.length < 1 || !list
  const email: string = session.user.email

  // Check access from permission settings or Super Admins
  if (!hasAccess('profiling_admin') && !superAdmins.includes(email))
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
            <Title title="Export/Import Logs" />
            <div className="space-x-2">
              <CustomButton
                containerStyles="app__btn_green"
                title="Import Survey Data"
                btnType="button"
                handleClick={() => setShowImportModal(true)}
              />
              <CustomButton
                containerStyles="app__btn_blue"
                title="Export Survey Data"
                btnType="button"
                handleClick={() => setShowExportModal(true)}
              />
            </div>
          </div>

          {/* Per Page */}
          <PerPage
            showingCount={showingCount}
            resultsCount={resultsCount}
            perPageCount={perPageCount}
            setPerPageCount={setPerPageCount}
          />
        </div>

        {/* Main Content */}
        <div>
          <table className="app__table">
            <thead className="app__thead">
              <tr>
                <th className="app__th">Date</th>
                <th className="app__th">Log</th>
              </tr>
            </thead>
            <tbody>
              {!isDataEmpty &&
                list.map((item, index: number) => (
                  <tr
                    key={index}
                    className="app__tr">
                    <td className="app__td">{item.created_at}</td>
                    <td className="app__td">
                      Imported Barangay {item.profile.address} {item.type}{' '}
                      categories to {item.survey.name}
                    </td>
                  </tr>
                ))}
              {loading && (
                <TableRowLoading
                  cols={2}
                  rows={2}
                />
              )}
            </tbody>
          </table>
          {!loading && isDataEmpty && (
            <div className="app__norecordsfound">No records found.</div>
          )}
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <ImportModal hideModal={() => setShowImportModal(false)} />
        )}

        {/* Export Modal */}
        {showExportModal && (
          <ExportModal hideModal={() => setShowExportModal(false)} />
        )}
      </div>
    </>
  )
}
export default Page
