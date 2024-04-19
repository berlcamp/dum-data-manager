'use client'

import {
  ArchiveModal,
  CustomButton,
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
  PencilIcon,
  StarIcon,
} from '@heroicons/react/20/solid'
import { format } from 'date-fns'
import React, { Fragment, useEffect, useState } from 'react'
import ActivitiesModal from './ActivitiesModal'
import AddEditModal from './AddEditModal'
import Filters from './Filters'

// Types
import type { AccountTypes, DocumentTypes } from '@/types'

// Redux imports
import { updateList } from '@/GlobalRedux/Features/listSlice'
import {
  docRouting,
  statusList,
  superAdmins,
} from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { CheckIcon, ChevronDown, PrinterIcon, Trash2 } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Tooltip } from 'react-tooltip'
import AddStickyModal from './AddStickyModal'
import DownloadExcelButton from './DownloadExcel'
import PrintButton from './PrintButton'
import StickiesModal from './StickiesModal'
import TrackerModal from './TrackerModal'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPrintSlipModal, setShowPrintSlipModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showStickiesModal, setShowStickiesModal] = useState(false)
  const [showAddStickyModal, setShowAddStickyModal] = useState(false)
  const [viewActivity, setViewActivity] = useState(false)
  const [viewTrackerModal, setViewTrackerModal] = useState(false)

  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<DocumentTypes | null>(null)
  const [activitiesData, setActivitiesData] = useState<DocumentTypes[]>([])

  // Filters
  const [filterTypes, setFilterTypes] = useState<any[] | []>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterAgency, setFilterAgency] = useState('')
  const [filterCurrentRoute, setFilterCurrentRoute] = useState('')
  const [filterRoute, setFilterRoute] = useState('')
  const [filterDateForwardedFrom, setFilterDateForwardedFrom] = useState<
    Date | undefined
  >(undefined)
  const [filterDateForwardedTo, setFilterDateForwardedTo] = useState<
    Date | undefined
  >(undefined)

  // List
  const [list, setList] = useState<DocumentTypes[]>([])
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

    try {
      const result = await fetchDocuments(
        {
          filterTypes,
          filterKeyword,
          filterAgency,
          filterStatus,
          filterCurrentRoute,
          filterRoute,
          filterDateForwardedFrom,
          filterDateForwardedTo,
        },
        perPageCount,
        0
      )
      // update the list in redux
      dispatch(updateList(result.data))
      setResultsCount(result.count ? result.count : 0)
      setShowingCount(result.data.length)
      // dispatch(updateList([]))
      // setResultsCount(0)
      // setShowingCount(0)
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
          filterTypes,
          filterKeyword,
          filterAgency,
          filterStatus,
          filterCurrentRoute,
          filterRoute,
          filterDateForwardedFrom,
          filterDateForwardedTo,
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

  const handleArchive = (id: string) => {
    setSelectedId(id)
    setShowArchiveModal(true)
  }

  const handleChangeStatus = async (item: DocumentTypes, status: string) => {
    const { error } = await supabase
      .from('ddm_trackers')
      .update({ status })
      .eq('id', item.id)

    await supabase.from('ddm_tracker_routes').insert({
      tracker_id: item.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'h:mm a'),
      user_id: session.user.id,
      user: `${user.firstname} ${user.middlename || ''} ${user.lastname || ''}`,
      title: 'Details updated',
      message: [
        {
          field: 'Status',
          before: item.status,
          after: status,
        },
      ],
    })

    // Append new data in redux
    const items = [...globallist]
    const updatedData = {
      status,
      id: item.id,
    }
    const foundIndex = items.findIndex((x) => x.id === updatedData.id)
    items[foundIndex] = { ...items[foundIndex], ...updatedData }
    dispatch(updateList(items))

    // pop up the success message
    setToast('success', 'Successfully Saved.')
  }
  const handleChangeLocation = async (
    item: DocumentTypes,
    location: string
  ) => {
    if (item.location === location) {
      return
    }

    try {
      const { error } = await supabase
        .from('ddm_trackers')
        .update({ location })
        .eq('id', item.id)

      if (error) throw new Error(error.message)

      // Append new data in redux
      const items = [...globallist]
      const updatedData = {
        id: item.id,
        location,
      }
      const foundIndex = items.findIndex((x) => x.id === updatedData.id)
      items[foundIndex] = { ...items[foundIndex], ...updatedData }
      dispatch(updateList(items))

      // Add tracker route logs if route is changed
      const trackerRoutes = {
        tracker_id: item.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'h:mm a'),
        user_id: session.user.id,
        user: `${user.firstname} ${user.middlename || ''} ${
          user.lastname || ''
        }`,
        title: location,
        message: '',
      }

      await supabase.from('ddm_tracker_routes').insert(trackerRoutes)

      // pop up the success message
      setToast('success', 'Successfully Saved.')
    } catch (error) {
      console.error(error)
    }
  }

  const handleEdit = (item: DocumentTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }

  const handleViewActivities = () => {
    void fetchActivitiesData()
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
  }, [
    filterKeyword,
    filterAgency,
    filterStatus,
    filterTypes,
    filterCurrentRoute,
    filterRoute,
    filterDateForwardedFrom,
    filterDateForwardedTo,
    perPageCount,
  ])

  const isDataEmpty = !Array.isArray(list) || list.length < 1 || !list
  const email: string = session.user.email

  // Check access from permission settings or Super Admins
  if (!hasAccess('tracker') && !superAdmins.includes(email))
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
            <Title title="Document Tracker" />
            {/* Download Excel */}
            {!isDataEmpty && (
              <div className="hidden md:flex items-center">
                <DownloadExcelButton
                  filters={{
                    filterKeyword,
                    filterStatus,
                    filterTypes,
                    filterCurrentRoute,
                    filterRoute,
                    filterDateForwardedFrom,
                    filterDateForwardedTo,
                  }}
                />
              </div>
            )}
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
              title="Add New Document"
              btnType="button"
              handleClick={handleAdd}
            />
          </div>

          {/* Filters */}
          <div className="app__filters">
            <Filters
              setFilterTypes={setFilterTypes}
              setFilterStatus={setFilterStatus}
              setFilterKeyword={setFilterKeyword}
              setFilterCurrentRoute={setFilterCurrentRoute}
              setFilterRoute={setFilterRoute}
              setFilterAgency={setFilterAgency}
              setFilterDateForwardedFrom={setFilterDateForwardedFrom}
              setFilterDateForwardedTo={setFilterDateForwardedTo}
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
                  <th className="app__th">Routing No</th>
                  <th className="hidden md:table-cell app__th">
                    Current Location
                  </th>
                  <th className="hidden md:table-cell app__th">Status</th>
                  <th className="hidden md:table-cell app__th">Requester</th>
                  <th className="app__th">Particulars</th>
                  <th className="hidden md:table-cell app__th">
                    Recent Remarks
                  </th>
                  <th className="hidden md:table-cell app__th">
                    Date Received
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isDataEmpty &&
                  list.map((item: DocumentTypes, index: number) => (
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
                                    onClick={() => {
                                      setShowPrintSlipModal(true)
                                      setSelectedItem(item)
                                    }}
                                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2 text-xs">
                                    <PrinterIcon className="cursor-pointer outline-none w-6 h-6 text-blue-500" />
                                    <span>Print Slip</span>
                                  </div>
                                </Menu.Item>
                                <Menu.Item>
                                  <div
                                    onClick={() => {
                                      setShowAddStickyModal(true)
                                      setSelectedItem(item)
                                    }}
                                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2 text-xs">
                                    <StarIcon className="cursor-pointer outline-none w-6 h-6 text-yellow-500" />
                                    <span>Add to Starred</span>
                                  </div>
                                </Menu.Item>
                                <Menu.Item>
                                  <div
                                    onClick={() => handleEdit(item)}
                                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2 text-xs">
                                    <PencilIcon className="cursor-pointer outline-none w-6 h-6 text-green-500" />
                                    <span>Edit Details</span>
                                  </div>
                                </Menu.Item>
                                <Menu.Item>
                                  <div
                                    onClick={() => handleArchive(item.id)}
                                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2 text-xs">
                                    <Trash2 className="cursor-pointer outline-none w-6 h-6 text-red-500" />
                                    <span>Move To Archive</span>
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
                            <span className="font-bold">
                              {item.routing_slip_no}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CustomButton
                              containerStyles="app__btn_green_xs"
                              title="View&nbsp;Details"
                              btnType="button"
                              handleClick={() => {
                                setSelectedItem(item)
                                setViewTrackerModal(true)
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell app__td">
                        <div className="flex items-center">
                          <Menu
                            as="div"
                            className="app__menu_container font-normal text-gray-600">
                            <div>
                              <Menu.Button className="app__dropdown_btn">
                                <span className="font-bold">
                                  {item.location}
                                </span>
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
                                  {docRouting.map((route, idx) => (
                                    <Menu.Item key={idx}>
                                      <div
                                        onClick={() =>
                                          handleChangeLocation(item, route!)
                                        }
                                        className="flex items-center justify-between space-x-2 cursor-pointer hover:bg-gray-100 text-gray-700 hover:text-gray-900 px-4 py-2 text-xs">
                                        <span>{route}</span>
                                        {route === item.location && (
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
                          <Menu
                            as="div"
                            className="app__menu_container font-normal text-gray-600">
                            <div>
                              <Menu.Button className="app__dropdown_btn">
                                <span
                                  className="font-bold"
                                  style={{
                                    color: getStatusColor(item.status),
                                  }}>
                                  {item.status}
                                </span>
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
                                          handleChangeStatus(item, i.status)
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
                      <td className="hidden md:table-cell app__td max-w-[150px]">
                        <div className="space-y-1">
                          <div>
                            <span className="font-medium">
                              {item.requester}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">{item.agency}</span>
                          </div>
                          <div>
                            <span className="font-bold">
                              {item.amount &&
                                Number(item.amount).toLocaleString('en-US', {
                                  minimumFractionDigits: 2, // Minimum number of decimal places
                                  maximumFractionDigits: 2, // Maximum number of decimal places
                                })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="app__td max-w-[300px]">
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium">
                              {item.particulars.length > 100 ? (
                                <span>
                                  {item.particulars.substring(0, 100 - 3)}...
                                  <span
                                    className="cursor-pointer text-blue-500"
                                    onClick={() => {
                                      setSelectedItem(item)
                                      setViewTrackerModal(true)
                                    }}>
                                    See&nbsp;More
                                  </span>
                                </span>
                              ) : (
                                <span>{item.particulars}</span>
                              )}
                            </span>
                          </div>
                          {item.attachments?.length > 0 && (
                            <div>
                              <span className="font-medium">
                                {item.attachments.length} File/s Attached
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="hidden md:table-cell app__td">
                        <div className="w-full">
                          {item.recent_remarks && (
                            <>
                              <div className="w-full">
                                <div className="flex items-center space-x-2">
                                  <div className="flex flex-1 items-center space-x-2">
                                    <div className="flex items-center space-x-1">
                                      <div className="font-bold">
                                        <span>{item.recent_remarks.user} </span>
                                      </div>
                                      <div className="text-gray-500  focus:ring-0 focus:outline-none text-xs text-left inline-flex items-center">
                                        {item.recent_remarks.timestamp &&
                                          format(
                                            new Date(
                                              item.recent_remarks.timestamp
                                            ),
                                            'MMM dd h:mm'
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Message */}
                                <div className="mt-1">
                                  <div>{item.recent_remarks.remarks}</div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="hidden md:table-cell app__td">
                        {format(new Date(item.date_received), 'MMM dd, yyyy')}
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

          {/* Confirm Move to Archive Modal */}
          {showArchiveModal && (
            <ArchiveModal
              table="ddm_trackers"
              selectedId={selectedId}
              showingCount={showingCount}
              setShowingCount={setShowingCount}
              resultsCount={resultsCount}
              setResultsCount={setResultsCount}
              hideModal={() => setShowArchiveModal(false)}
            />
          )}

          {/* Activities Modal */}
          {viewActivity && (
            <ActivitiesModal
              activitiesData={activitiesData}
              hideModal={() => setViewActivity(false)}
            />
          )}

          {/* Tracker Modal */}
          {viewTrackerModal && selectedItem && (
            <TrackerModal
              handleEdit={handleEdit}
              documentDataProp={selectedItem}
              hideModal={() => setViewTrackerModal(false)}
            />
          )}

          {/* Stickies Modal */}
          {showStickiesModal && (
            <StickiesModal hideModal={() => setShowStickiesModal(false)} />
          )}

          {/* Print Slip Modal */}
          {showPrintSlipModal && selectedItem && (
            <PrintButton
              document={selectedItem}
              hideModal={() => setShowPrintSlipModal(false)}
            />
          )}

          {/* Add to Sticky Modal */}
          {showAddStickyModal && (
            <AddStickyModal
              item={selectedItem}
              hideModal={() => setShowAddStickyModal(false)}
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
