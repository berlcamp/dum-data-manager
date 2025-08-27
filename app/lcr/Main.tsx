'use client'

import {
  CustomButton,
  PerPage,
  ShowMore,
  Sidebar,
  TableRowLoading,
  Title,
  TopBar,
  Unauthorized,
} from '@/components/index'
import { fetchLcr } from '@/utils/fetchApi'
import { Menu, Transition } from '@headlessui/react'
import { PencilIcon } from '@heroicons/react/20/solid'
import { format } from 'date-fns'
import React, { Fragment, useEffect, useState } from 'react'
import AddEditModal from './AddEditModal'
import Filters from './Filters'

// Types
import type { AccountTypes, LcrTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import DetailsModal from './DetailsModal'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [detailModal, setDetailsModal] = useState(false)

  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<LcrTypes | null>(null)
  const [activitiesData, setActivitiesData] = useState<LcrTypes[]>([])

  // Filters
  const [filterType, setFilterType] = useState('')
  const [filterKeyword, setFilterKeyword] = useState('')

  // List
  const [list, setList] = useState<LcrTypes[]>([])
  const [perPageCount, setPerPageCount] = useState<number>(10)
  const [showingCount, setShowingCount] = useState<number>(0)
  const [resultsCount, setResultsCount] = useState<number>(0)

  const { supabase, session, systemUsers } = useSupabase()
  const { hasAccess, setToast } = useFilter()

  const user: AccountTypes = systemUsers.find(
    (user: AccountTypes) => user.id === session.user.id
  )

  // Redux staff
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)
    if (!user) return

    try {
      const result = await fetchLcr(
        {
          filterType,
          filterKeyword,
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
    if (!user) return

    try {
      const result = await fetchLcr(
        {
          filterType,
          filterKeyword,
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

  const handleAdd = () => {
    setShowAddModal(true)
    setSelectedItem(null)
  }

  const handleEdit = (item: LcrTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }

  // Update list whenever list in redux updates
  useEffect(() => {
    setList(globallist)
  }, [globallist])

  // Featch data
  useEffect(() => {
    setList([])
    void fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKeyword, filterType, perPageCount])

  const isDataEmpty = !Array.isArray(list) || list.length < 1 || !list
  const email: string = session.user.email

  // Check access from permission settings or Super Admins
  if (!hasAccess('tracker') && !superAdmins.includes(email))
    return <Unauthorized />

  return (
    <>
      <Sidebar>
        <div className="px-2 mt-12">
          <ul className="space-y-2 border-gray-700">
            <li>
              <Link
                href="/lcr"
                className="app__menu_link app_menu_link_active">
                <span className="flex-1 ml-3 whitespace-nowrap">
                  Local Civil Registrar
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </Sidebar>
      <div className="app__main">
        <div>
          {/* Header */}
          <TopBar />
          <div className="app__title">
            <Title title="Local Civil Registrar" />
            <CustomButton
              containerStyles="app__btn_green"
              title="Add New Record"
              btnType="button"
              handleClick={handleAdd}
            />
          </div>

          {/* Filters */}
          <div className="app__filters">
            <Filters
              setFilterType={setFilterType}
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
                  <th className="app__th w-10"></th>
                  <th className="app__th">Reg No.</th>
                  <th className="hidden md:table-cell app__th">Type</th>
                  <th className="hidden md:table-cell app__th">Name</th>
                  <th className="hidden md:table-cell app__th">Date</th>
                  <th className="app__th">Other Details</th>
                  <th className="app__th">Attachment</th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item: LcrTypes, index: number) => (
                    <tr
                      key={index}
                      className="app__tr">
                      <td className="app__td">
                        <Menu
                          as="div"
                          className="app__menu_container font-normal text-gray-600">
                          <div>
                            <Menu.Button className="app__dropdown_btn">
                              <ChevronDown
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </Menu.Button>
                          </div>

                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95">
                            <Menu.Items className="absolute left-0 z-30 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              <div className="py-1">
                                <Menu.Item>
                                  <div
                                    onClick={() => handleEdit(item)}
                                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2 text-xs">
                                    <PencilIcon className="cursor-pointer outline-none w-6 h-6 text-green-500" />
                                    <span>Edit Details</span>
                                  </div>
                                </Menu.Item>
                              </div>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      </td>
                      <td className="app__td">
                        <div className="space-y-2">
                          <div>
                            <span className="font-bold">{item.reg_no}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CustomButton
                              containerStyles="app__btn_green_xs"
                              title="View&nbsp;Details"
                              btnType="button"
                              handleClick={() => {
                                setSelectedItem(item)
                                setDetailsModal(true)
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell app__td">
                        {item.type}
                      </td>
                      <td className="hidden md:table-cell app__td">
                        {item.firstname && (
                          <div>
                            {item.lastname}, {item.firstname} {item.middlename}
                          </div>
                        )}
                        {item.husband_firstname && (
                          <div>
                            <div>
                              Husband: {item.husband_lastname},{' '}
                              {item.husband_firstname} {item.husband_middlename}
                            </div>
                            <div>
                              Wife: {item.wife_lastname}, {item.wife_firstname}{' '}
                              {item.wife_middlename}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="hidden md:table-cell app__td">
                        {format(new Date(item.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="hidden md:table-cell app__td">
                        <div>
                          {item.father_name && `Father: ${item.father_name}`}
                        </div>
                        <div>
                          {item.mother_name && `Mother: ${item.mother_name}`}
                        </div>
                      </td>
                      <td className="hidden md:table-cell app__td">
                        <ul className="list-disc ml-4">
                          {item.attachments?.map((url, i) => (
                            <li key={i}>
                              <a
                                target="_blank"
                                href={url}
                                className="text-blue-800 text-sm">
                                Download File {i + 1}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </td>
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
            {!loading && isDataEmpty && (
              <div className="app__norecordsfound">No records found.</div>
            )}
          </div>

          {/* Show More */}
          {resultsCount > showingCount && !loading && (
            <ShowMore handleShowMore={handleShowMore} />
          )}

          {/* Tracker Modal */}
          {detailModal && selectedItem && (
            <DetailsModal
              handleEdit={handleEdit}
              documentDataProp={selectedItem}
              hideModal={() => setDetailsModal(false)}
            />
          )}

          {/* Add Document Modal */}
          {showAddModal && (
            <AddEditModal
              editData={selectedItem}
              hideModal={() => setShowAddModal(false)}
            />
          )}
        </div>
      </div>
    </>
  )
}
export default Page
