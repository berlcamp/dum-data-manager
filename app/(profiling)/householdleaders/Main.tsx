'use client'

import {
  PerPage,
  ShowMore,
  Sidebar,
  TableRowLoading,
  Title,
  TopBar,
  Unauthorized,
} from '@/components/index'
import { fetchHouseholdLeaders } from '@/utils/fetchApi'
import React, { useEffect, useState } from 'react'

import Filters from './Filters'

// Types
import type { ProfileTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import ProfilingSidebar from '@/components/Sidebars/ProfilingSidebar'
import { Button } from '@/components/ui/button'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { useDispatch, useSelector } from 'react-redux'
import PrintModal from './PrintModal'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // Modal
  const [viewDetailsModal, setViewDetailsModal] = useState(false)
  const [details, setDetails] = useState<ProfileTypes | null>(null)

  // Filters
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterBarangay, setFilterBarangay] = useState('')

  // List
  const [list, setList] = useState<ProfileTypes[]>([])
  const [perPageCount, setPerPageCount] = useState<number>(10)
  const [showingCount, setShowingCount] = useState<number>(0)
  const [resultsCount, setResultsCount] = useState<number>(0)

  const { supabase, session } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)

    try {
      const result = await fetchHouseholdLeaders(
        {
          filterKeyword,
          filterBarangay,
        },
        perPageCount,
        0
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
      const result = await fetchHouseholdLeaders(
        {
          filterKeyword,
          filterBarangay,
        },
        perPageCount,
        list.length
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

  // Append data to existing list whenever theres result on search
  const handleSearch = async () => {
    setLoading(true)

    try {
      // const { data, error } = await supabase.rpc('search_users', {
      //   fullname_param: filterKeyword,
      //   address_param: filterBarangay,
      // })

      // if (error) {
      //   setToast('error', 'Something went wrong')
      //   throw new Error(error.message)
      // }

      // // update the list in redux
      // const newList = [...data]
      // dispatch(updateList(newList))

      const result = await fetchHouseholdLeaders(
        {
          filterKeyword,
          filterBarangay,
        },
        perPageCount,
        0
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

  // Update list whenever list in redux updates
  useEffect(() => {
    setList(globallist)
  }, [globallist])

  // Featch data
  useEffect(() => {
    setList([])
    void fetchData()
  }, [perPageCount])

  // Keyword search
  useEffect(() => {
    setList([])
    void handleSearch()
  }, [filterKeyword, filterBarangay])

  const isDataEmpty = !Array.isArray(list) || list.length < 1 || !list
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
            <Title title="Household Leaders" />
          </div>

          {/* Filters */}
          <div className="app__filters">
            <Filters
              setFilterBarangay={setFilterBarangay}
              setFilterKeyword={setFilterKeyword}
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
                  <th className="app__th"></th>
                  <th className="app__th">Fullname</th>
                  <th className="app__th">Address</th>
                  <th className="app__th">Precinct</th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item, index: number) => (
                    <tr
                      key={index}
                      className="app__tr">
                      <td className="app__td">
                        <Button
                          onClick={() => {
                            setViewDetailsModal(true)
                            setDetails(item)
                          }}
                          variant="outline"
                          size="sm">
                          Print ID
                        </Button>
                      </td>
                      <td className="app__td">{item.fullname}</td>
                      <td className="app__td text-xs">
                        {item.address} - {item.purok}
                      </td>
                      <td className="app__td text-xs">{item.precinct}</td>
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
        </div>
      </div>
      {/* Details Modal */}
      {details && viewDetailsModal && (
        <PrintModal
          details={details}
          hideModal={() => setViewDetailsModal(false)}
        />
      )}
    </>
  )
}
export default Page
