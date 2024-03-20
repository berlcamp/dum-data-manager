'use client'

import {
  CustomButton,
  DeleteModal,
  PerPage,
  ShowMore,
  Sidebar,
  TableRowLoading,
  Title,
  TopBar,
  TrackerSideBar,
  Unauthorized,
} from '@/components/index'
import { fetchActivities, fetchDocuments } from '@/utils/fetchApi'
import { Menu, Transition } from '@headlessui/react'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  StarIcon,
} from '@heroicons/react/20/solid'
import { format } from 'date-fns'
import React, { Fragment, useEffect, useState } from 'react'
import ActivitiesModal from './ActivitiesModal'
import AddDocumentModal from './AddDocumentModal'
import Filters from './Filters'

// Types
import type { AccountTypes, DocumentTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import { statusList, superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { CheckIcon } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { Tooltip } from 'react-tooltip'
import AddStickyModal from './AddStickyModal'
import Attachment from './Attachment'
import StickiesModal from './StickiesModal'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showStickiesModal, setShowStickiesModal] = useState(false)
  const [showAddStickyModal, setShowAddStickyModal] = useState(false)

  const [viewActivity, setViewActivity] = useState(false)
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<DocumentTypes | null>(null)
  const [activitiesData, setActivitiesData] = useState<DocumentTypes[]>([])

  // Filters
  const [filterTypes, setFilterTypes] = useState<any[] | []>([])
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined)
  const [filterKeyword, setFilterKeyword] = useState('')

  // List
  const [list, setList] = useState<DocumentTypes[]>([])
  const [perPageCount, setPerPageCount] = useState<number>(10)
  const [showingCount, setShowingCount] = useState<number>(0)
  const [resultsCount, setResultsCount] = useState<number>(0)

  const searchParams = useSearchParams()

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

    try {
      const result = await fetchDocuments(
        {
          filterDate,
          filterTypes,
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

    try {
      const result = await fetchDocuments(
        {
          filterDate,
          filterTypes,
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

  const handleDelete = (id: string) => {
    setSelectedId(id)
    setShowDeleteModal(true)
  }

  const handleChangeStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('ddm_letter_trackers')
      .update({ status })
      .eq('id', id)

    // Append new data in redux
    const items = [...globallist]
    const updatedData = {
      status,
      id,
    }
    const foundIndex = items.findIndex((x) => x.id === updatedData.id)
    items[foundIndex] = { ...items[foundIndex], ...updatedData }
    dispatch(updateList(items))

    // pop up the success message
    setToast('success', 'Successfully Saved.')
  }

  const handleEdit = (item: DocumentTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }

  const handleViewActivities = () => {
    setViewActivity(true)
  }

  const getStatusColor = (status: string): string => {
    const statusArr = statusList.filter((item) => item.status === status)
    if (statusArr.length > 0) {
      return statusArr[0].color
    } else {
      return '#000000'
    }
  }

  // Upcoming activities
  const fetchActivitiesData = async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const today2 = new Date()
    const endDate = new Date()
    endDate.setDate(today2.getDate() + 60)

    const result = await fetchActivities(today, endDate)

    setActivitiesData(result.data)
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
  }, [filterDate, filterKeyword, filterTypes, perPageCount])

  useEffect(() => {
    void fetchActivitiesData()
  }, [])

  const isDataEmpty = !Array.isArray(list) || list.length < 1 || !list
  const email: string = session.user.email

  // Check access from permission settings or Super Admins
  if (!hasAccess('request_tracker') && !superAdmins.includes(email))
    return <Unauthorized />

  return (
    <>
      <Sidebar>
        <TrackerSideBar />
      </Sidebar>
      <div className="app__main">
        <div>
          {/* Header */}
          <TopBar />
          <div className="app__title">
            <Title title="Letter Tracker" />
            <StarIcon
              onClick={() => setShowStickiesModal(true)}
              className="cursor-pointer w-7 h-7 text-yellow-500"
              data-tooltip-id="stickies-tooltip"
              data-tooltip-content="Starred"
            />
            <Tooltip
              id="stickies-tooltip"
              place="bottom-end"
            />
            <CalendarDaysIcon
              onClick={handleViewActivities}
              className="cursor-pointer w-7 h-7"
              data-tooltip-id="calendar-tooltip"
              data-tooltip-content="Upcoming Activities"
            />
            <Tooltip
              id="calendar-tooltip"
              place="bottom-end"
            />
            <CustomButton
              containerStyles="app__btn_green"
              title="Add New Letter"
              btnType="button"
              handleClick={handleAdd}
            />
          </div>

          {/* Filters */}
          <div className="app__filters">
            <Filters
              setFilterDate={setFilterDate}
              setFilterTypes={setFilterTypes}
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
                  <th className="app__th">Details</th>
                  <th className="hidden md:table-cell app__th">Routing</th>
                  <th className="hidden md:table-cell app__th">Status</th>
                  <th className="app__th"></th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item: DocumentTypes, index: number) => (
                    <tr
                      key={index}
                      className="app__tr">
                      <td className="app__td">
                        <div className="space-y-2">
                          <div>
                            <span className="font-light">Type:</span>{' '}
                            <span className="font-medium">{item.type}</span>
                            {(item.type === 'Others' ||
                              item.type === 'Medical Assistance') && (
                              <span className="font-medium mt-1">
                                {item.specify}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-light">Requester:</span>{' '}
                            <span className="font-medium">
                              {item.requester}
                            </span>
                          </div>
                          <div>
                            <span className="font-light">Received:</span>{' '}
                            <span className="font-medium">
                              {format(
                                new Date(item.date_received),
                                'MMMM dd, yyyy'
                              )}
                            </span>
                          </div>
                          {item.activity_date && (
                            <div>
                              <span className="font-light">Activity Date:</span>{' '}
                              <span className="font-medium">
                                {format(
                                  new Date(item.activity_date),
                                  'MMMM dd, yyyy'
                                )}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="font-light">Particulars:</span>{' '}
                            <span className="font-medium">
                              {item.particulars}
                            </span>
                          </div>
                          {item.attachments && (
                            <div>
                              {item.attachments?.length === 0 && (
                                <span className="font-medium">
                                  No attachments
                                </span>
                              )}
                              {item.attachments?.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-2 justify-start">
                                  <Attachment
                                    file={file.name}
                                    id={item.id}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="md:hidden flex items-center">
                            <span
                              className="font-bold"
                              style={{ color: getStatusColor(item.status) }}>
                              {item.status}
                            </span>
                            <Menu
                              as="div"
                              className="app__menu_container font-normal text-gray-600">
                              <div>
                                <Menu.Button className="app__dropdown_btn">
                                  <ChevronDownIcon
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
                                    {statusList.map((i, idx) => (
                                      <Menu.Item key={idx}>
                                        <div
                                          onClick={() =>
                                            handleChangeStatus(
                                              item.id,
                                              i.status
                                            )
                                          }
                                          className="flex items-center justify-between space-x-2 cursor-pointer hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2 text-xs">
                                          <span>{i.status}</span>
                                          {i.status === item.status && (
                                            <CheckIcon className="w-4 h-4" />
                                          )}
                                        </div>
                                      </Menu.Item>
                                    ))}
                                  </div>
                                </Menu.Items>
                              </Transition>
                            </Menu>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell app__td">
                        <div className="flex items-center">
                          <span
                            className="font-bold"
                            style={{ color: getStatusColor(item.status) }}>
                            {item.status}
                          </span>
                          <Menu
                            as="div"
                            className="app__menu_container font-normal text-gray-600">
                            <div>
                              <Menu.Button className="app__dropdown_btn">
                                <ChevronDownIcon
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
                              <Menu.Items className="absolute right-0 z-30 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                  {statusList.map((i, idx) => (
                                    <Menu.Item key={idx}>
                                      <div
                                        onClick={() =>
                                          handleChangeStatus(item.id, i.status)
                                        }
                                        className="flex items-center justify-between space-x-2 cursor-pointer hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2 text-xs">
                                        <span>{i.status}</span>
                                        {i.status === item.status && (
                                          <CheckIcon className="w-4 h-4" />
                                        )}
                                      </div>
                                    </Menu.Item>
                                  ))}
                                </div>
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        </div>
                      </td>
                      <td className="hidden md:table-cell app__td">
                        <div className="flex items-center">
                          <span
                            className="font-bold"
                            style={{ color: getStatusColor(item.status) }}>
                            {item.status}
                          </span>
                          <Menu
                            as="div"
                            className="app__menu_container font-normal text-gray-600">
                            <div>
                              <Menu.Button className="app__dropdown_btn">
                                <ChevronDownIcon
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
                              <Menu.Items className="absolute right-0 z-30 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                  {statusList.map((i, idx) => (
                                    <Menu.Item key={idx}>
                                      <div
                                        onClick={() =>
                                          handleChangeStatus(item.id, i.status)
                                        }
                                        className="flex items-center justify-between space-x-2 cursor-pointer hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2 text-xs">
                                        <span>{i.status}</span>
                                        {i.status === item.status && (
                                          <CheckIcon className="w-4 h-4" />
                                        )}
                                      </div>
                                    </Menu.Item>
                                  ))}
                                </div>
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        </div>
                      </td>
                      <td className="app__td">
                        <div className="flex space-x-2 items-center">
                          <div>
                            <StarIcon
                              onClick={() => {
                                setShowAddStickyModal(true)
                                setSelectedItem(item)
                              }}
                              className="cursor-pointer outline-none w-6 h-6 text-yellow-500"
                              data-tooltip-id="add-sticky-tooltip"
                              data-tooltip-content="Add to Starred"
                            />
                            <Tooltip
                              id="add-sticky-tooltip"
                              place="bottom-end"
                            />
                          </div>
                          <button
                            onClick={() => handleEdit(item)}
                            className="app__btn_green_xs">
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="app__btn_red_xs">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {loading && (
                  <TableRowLoading
                    cols={4}
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

          {/* Add Document Modal */}
          {showAddModal && (
            <AddDocumentModal
              editData={selectedItem}
              hideModal={() => setShowAddModal(false)}
            />
          )}

          {/* Confirm Delete Modal */}
          {showDeleteModal && (
            <DeleteModal
              table="ddm_letter_trackers"
              selectedId={selectedId}
              showingCount={showingCount}
              setShowingCount={setShowingCount}
              resultsCount={resultsCount}
              setResultsCount={setResultsCount}
              hideModal={() => setShowDeleteModal(false)}
            />
          )}

          {/* Activities Modal */}
          {viewActivity && (
            <ActivitiesModal
              activitiesData={activitiesData}
              hideModal={() => setViewActivity(false)}
            />
          )}
          {/* Stickies Modal */}
          {showStickiesModal && (
            <StickiesModal hideModal={() => setShowStickiesModal(false)} />
          )}
          {/* Add to Sticky Modal */}
          {showAddStickyModal && (
            <AddStickyModal
              item={selectedItem}
              hideModal={() => setShowAddStickyModal(false)}
            />
          )}
        </div>
      </div>
    </>
  )
}
export default Page
