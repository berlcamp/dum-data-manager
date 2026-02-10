'use client'

import VehicleReservationSidebar from '@/components/Sidebars/VehicleReservationSidebar'
import { Sidebar, TopBar, Unauthorized } from '@/components/index'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { superAdmins } from '@/constants/TrackerConstants'
import { useFilter } from '@/context/FilterContext'
import { useSupabase } from '@/context/SupabaseProvider'
import { fetchVehicleReservations } from '@/utils/fetchApi'
import {
  addDays,
  addMonths,
  endOfWeek,
  format,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Settings,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AddEditModal from './AddEditModal'
import CalendarView from './CalendarView'
import Filters from './Filters'
import ListView from './ListView'
import Week from './Week'
import { updateList } from '@/GlobalRedux/Features/listSlice'
import type { ReservationTypes } from '@/types'

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'calendar' | 'week' | 'list'>('calendar')
  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ReservationTypes | null>(null)

  // Filters
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('')

  // List
  const [list, setList] = useState<ReservationTypes[] | []>([])

  const { session } = useSupabase()
  const { hasAccess } = useFilter()

  // Redux
  const globallist = useSelector((state: any) => state.list.value)
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await fetchVehicleReservations({
        filterKeyword,
        filterVehicle,
      })
      dispatch(updateList(result.data))
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

  const handleEdit = (item: ReservationTypes) => {
    setShowAddModal(true)
    setSelectedItem(item)
  }

  const hasActiveFilters = filterKeyword !== '' || filterVehicle !== ''
  const effectiveView = hasActiveFilters ? 'list' : view

  const goPrev = () => {
    if (effectiveView === 'calendar' || effectiveView === 'list') {
      setCurrentDate((d) => subMonths(d, 1))
    } else {
      setCurrentDate((d) => addDays(d, -7))
    }
  }
  const goNext = () => {
    if (effectiveView === 'calendar' || effectiveView === 'list') {
      setCurrentDate((d) => addMonths(d, 1))
    } else {
      setCurrentDate((d) => addDays(d, 7))
    }
  }
  const goToday = () => setCurrentDate(new Date())

  useEffect(() => {
    setList(globallist)
  }, [globallist])

  useEffect(() => {
    setList([])
    void fetchData()
  }, [filterKeyword, filterVehicle])

  const isDataEmpty = list.length < 1 || !list
  const email: string = session?.user?.email ?? ''

  if (!hasAccess('vehiclereservation') && !superAdmins.includes(email))
    return <Unauthorized />

  return (
    <>
      <Sidebar>
        <VehicleReservationSidebar />
      </Sidebar>
      <div className="app__main">
        <TopBar />
        <div className="space-y-6 px-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CalendarIcon className="h-6 w-6" />
                Vehicle Reservations
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and view your scheduled vehicle reservations
              </p>
            </div>
            <div className="flex items-center gap-2">
              {superAdmins.includes(email) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" disabled>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings (coming soon)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Filters */}
          <Filters
            setFilterKeyword={setFilterKeyword}
            setFilterVehicle={setFilterVehicle}
            filterKeyword={filterKeyword}
            filterVehicle={filterVehicle}
          />

          {/* Calendar Header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goPrev}
                    className="h-9 w-9"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToday}
                    className="h-9"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goNext}
                    className="h-9 w-9"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold ml-4 min-w-[180px]">
                    {effectiveView === 'week'
                      ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d, yyyy')}`
                      : format(currentDate, 'MMMM yyyy')}
                  </h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 border rounded-md p-1">
                    <Button
                      variant={effectiveView === 'calendar' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setView('calendar')}
                      className="h-8"
                    >
                      Calendar
                    </Button>
                    <Button
                      variant={effectiveView === 'week' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setView('week')}
                      className="h-8"
                    >
                      Week
                    </Button>
                    <Button
                      variant={effectiveView === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setView('list')}
                      className="h-8"
                    >
                      List
                    </Button>
                  </div>
                  <Button onClick={handleAdd} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Reservation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          {loading ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Loading reservations...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isDataEmpty ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    No reservations found
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Get started by adding a new reservation
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : effectiveView === 'calendar' ? (
            <CalendarView data={list} currentDate={currentDate} onEdit={handleEdit} />
          ) : effectiveView === 'week' ? (
            <Week data={list} currentDate={currentDate} onEdit={handleEdit} />
          ) : (
            <ListView data={list} onEdit={handleEdit} />
          )}
        </div>
      </div>
      {showAddModal && (
        <AddEditModal
          editData={selectedItem}
          hideModal={() => setShowAddModal(false)}
        />
      )}
    </>
  )
}
export default Page
