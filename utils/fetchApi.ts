import { docRouting } from '@/constants/TrackerConstants'
import type { AccountTypes } from '@/types'
import { createBrowserClient } from '@supabase/ssr'
import { addDays, format, subDays } from 'date-fns'
import { fullTextQuery } from './text-helper'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface DocumentFilterTypes {
  filterTypes?: any[]
  filterKeyword?: string
  filterAgency?: string
  filterStatus?: string
  filterCurrentRoute?: string
  filterRoute?: string
  filterDateForwardedFrom?: Date | undefined
  filterDateForwardedTo?: Date | undefined
}

interface FilterProfileTypes {
  filterKeyword?: string
  filterBarangay?: string
  filterCategory?: string
}

// Helper function to get query condition by department
function getStatusesByOffice(department: string) {
  return docRouting
    .filter((route) => route.office === department)
    .map((route) => `title.eq.${route.status}`)
    .join(',')
}

export async function fetchDocuments(
  filters: DocumentFilterTypes,
  userDepartment: string,
  perPageCount: number,
  rangeFrom: number
) {
  try {
    // Get Document ID within Tracker Flow and origin department
    const trackerIds: string[] = []
    let newTrackerIds: string[] = []

    if (userDepartment) {
      let query1 = supabase.from('ddm_tracker_routes').select('tracker_id')

      const statuses = getStatusesByOffice(userDepartment)
      query1 = query1.or(statuses)

      const { data: trackerFlow } = await query1

      trackerFlow?.forEach((item: any) => {
        trackerIds.push(item.tracker_id)
      })

      const { data: origins } = await supabase
        .from('ddm_trackers')
        .select('id, origin_department')
        .eq('origin_department', userDepartment)
      origins?.forEach((item: any) => {
        trackerIds.push(item.id)
      })
    }

    if (trackerIds.length === 0) {
      trackerIds.push('99999')
    }

    // Advance filters
    if (filters.filterDateForwardedFrom || filters.filterDateForwardedTo) {
      let query1 = supabase
        .from('ddm_tracker_routes')
        .select('tracker_id')
        .limit(900)
        .in('id', trackerIds)

      if (filters.filterRoute && filters.filterRoute !== '') {
        query1 = query1.eq('title', filters.filterRoute)
      }
      if (filters.filterDateForwardedFrom) {
        query1 = query1.gte(
          'date',
          format(new Date(filters.filterDateForwardedFrom), 'yyyy-MM-dd')
        )
      }
      if (filters.filterDateForwardedTo) {
        query1 = query1.lte(
          'date',
          format(new Date(filters.filterDateForwardedTo), 'yyyy-MM-dd')
        )
      }

      const { data: data1 } = await query1

      if (data1) {
        if (data1.length > 0) {
          data1.forEach((d) => newTrackerIds.push(d.tracker_id))
        }
      }
    } else {
      newTrackerIds = trackerIds
    }

    console.log('newTrackerIds', userDepartment, newTrackerIds)

    let query = supabase
      .from('ddm_trackers')
      .select('*', { count: 'exact' })
      .eq('archived', false)

    // Full text search
    if (
      typeof filters.filterKeyword !== 'undefined' &&
      filters.filterKeyword.trim() !== ''
    ) {
      query = query.or(
        `routing_slip_no.ilike.%${filters.filterKeyword}%,particulars.ilike.%${filters.filterKeyword}%,agency.ilike.%${filters.filterKeyword}%,requester.ilike.%${filters.filterKeyword}%,amount.ilike.%${filters.filterKeyword}%,cheque_no.ilike.%${filters.filterKeyword}%`
      )
    }

    // Filter Current Location
    if (
      filters.filterCurrentRoute &&
      filters.filterCurrentRoute.trim() !== ''
    ) {
      query = query.eq('location', filters.filterCurrentRoute)
    }

    // Filter Agency
    if (filters.filterAgency && filters.filterAgency.trim() !== '') {
      query = query.or(`agency.ilike.%${filters.filterAgency}%`)
    }

    // Filter status
    if (filters.filterStatus && filters.filterStatus.trim() !== '') {
      query = query.eq('status', filters.filterStatus)
    }

    // Filters allowed tracker Ids
    query = query.in('id', newTrackerIds)

    // Filter type
    if (
      typeof filters.filterTypes !== 'undefined' &&
      filters.filterTypes.length > 0
    ) {
      const statement: string[] = []
      filters.filterTypes?.forEach((type: string) => {
        const str = `type.eq.${type}`
        statement.push(str)
      })
      query = query.or(statement.join(', '))
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('created_at', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch tracker error', error)
    return { data: [], count: 0 }
  }
}

export async function fetchProfiles(
  filters: FilterProfileTypes,
  perPageCount: number,
  rangeFrom: number
) {
  try {
    let query = supabase
      .from('ddm_profiles')
      .select('*, coordinator:coordinator_id(*)', { count: 'exact' })

    // Full text search
    if (filters.filterKeyword && filters.filterKeyword.trim() !== '') {
      query = query.textSearch('fts', fullTextQuery(filters.filterKeyword), {
        config: 'english',
      })
      // query = query.or(`fullname.ilike.%${filters.filterKeyword}%`)
    }

    // Filter Address
    if (filters.filterBarangay && filters.filterBarangay.trim() !== '') {
      query = query.eq('address', filters.filterBarangay)
    }

    // Filter Category
    if (filters.filterCategory && filters.filterCategory.trim() !== '') {
      query = query.eq('category', filters.filterCategory)
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: true })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch profiles error', error)
    return { data: [], count: 0 }
  }
}

export async function fetchImportLogs(perPageCount: number, rangeFrom: number) {
  try {
    let query = supabase
      .from('ddm_profile_import_logs')
      .select('*, profile:profile_id(address), survey:survey_id(name)', {
        count: 'exact',
      })

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: true })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error', error)
    return { data: [], count: 0 }
  }
}

export async function fetchCategories(
  filters: {
    profile_ids?: string[]
    survey_id?: string
    type?: string
  },
  perPageCount: number,
  rangeFrom: number
) {
  try {
    let query = supabase
      .from('ddm_profile_categories')
      .select('*, profile:profile_id(fullname,address)', { count: 'exact' })

    // Filter profile ids
    if (filters.profile_ids) {
      query = query.in('profile_id', filters.profile_ids)
    }

    // Filter survey_id
    if (filters.survey_id && filters.survey_id.trim() !== '') {
      query = query.eq('survey_id', filters.survey_id)
    }

    // Filter type
    if (filters.type && filters.type.trim() !== '') {
      query = query.eq('type', filters.type)
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: true })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error', error)
    return { data: [], count: 0 }
  }
}

export async function fetchCoordinators(
  filters: {
    filterKeyword?: string
  },
  perPageCount: number,
  rangeFrom: number
) {
  try {
    let query = supabase.from('ddm_profile_coordinators').select('*', {
      count: 'exact',
    })

    // Full text search
    if (
      typeof filters.filterKeyword !== 'undefined' &&
      filters.filterKeyword.trim() !== ''
    ) {
      query = query.or(`fullname.ilike.%${filters.filterKeyword}%`)
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error xx', error)
    return { data: [], count: 0 }
  }
}

export async function fetchPurchaseOrders(
  filters: {
    filterType?: string
    filterKeyword?: string
    filterAppropriation?: string
  },
  perPageCount: number,
  rangeFrom: number
) {
  try {
    let query = supabase
      .from('ddm_ris_purchase_orders')
      .select(
        '*, ddm_user:created_by(*), ddm_ris(id,quantity,price,status), ddm_ris_appropriation:appropriation(*)',
        { count: 'exact' }
      )

    // Full text search
    if (
      typeof filters.filterKeyword !== 'undefined' &&
      filters.filterKeyword.trim() !== ''
    ) {
      query = query.or(
        `po_number.ilike.%${filters.filterKeyword}%,description.ilike.%${filters.filterKeyword}%`
      )
    }

    // Filter type
    if (
      typeof filters.filterType !== 'undefined' &&
      filters.filterType.trim() !== 'All'
    ) {
      query = query.eq('type', filters.filterType)
    }
    // Filter appropriation
    if (
      filters.filterAppropriation &&
      filters.filterAppropriation.trim() !== 'All'
    ) {
      query = query.eq('appropriation', filters.filterAppropriation)
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error xx', error)
    return { data: [], count: 0 }
  }
}

export async function fetchCashAdvances(
  filters: {
    filterKeyword?: string
  },
  perPageCount: number,
  rangeFrom: number
) {
  try {
    let query = supabase
      .from('ddm_ris_cash_advances')
      .select('*, ddm_user:created_by(*), ddm_ris(price,quantity)', {
        count: 'exact',
      })

    // Full text search
    if (
      typeof filters.filterKeyword !== 'undefined' &&
      filters.filterKeyword.trim() !== ''
    ) {
      query = query.or(`ca_number.ilike.%${filters.filterKeyword}%`)
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error xx', error)
    return { data: [], count: 0 }
  }
}

export async function fetchRis(
  filters: {
    filterKeyword?: string
    filterAppropriation?: string
    filterVehicle?: string
    filterStatus?: string
    filterDepartment?: string
    filterCa?: string
    filterPo?: string
    filterType?: string
    filterDateFrom?: Date | undefined
    filterDateTo?: Date | undefined
  },
  perPageCount: number,
  rangeFrom: number
) {
  try {
    // Appropriation filters
    const poIds: string[] = []
    if (filters.filterAppropriation && filters.filterAppropriation !== 'All') {
      let query1 = supabase
        .from('ddm_ris_purchase_orders')
        .select('id')
        .eq('appropriation', filters.filterAppropriation)
        .limit(500)
      const { data: data1 } = await query1

      if (data1) {
        if (data1.length > 0) {
          data1.forEach((d) => poIds.push(d.id))
        } else {
          poIds.push('99999999')
        }
      }
    }

    let query = supabase
      .from('ddm_ris')
      .select(
        '*, ddm_user:created_by(*), vehicle:vehicle_id(*), purchase_order:po_id(*, ddm_ris_appropriation:appropriation(name)),cash_advance:ca_id(*), department:department_id(*)',
        { count: 'exact' }
      )
      .eq('is_deleted', false)

    // Full text search
    if (
      typeof filters.filterKeyword !== 'undefined' &&
      filters.filterKeyword.trim() !== ''
    ) {
      query = query.or(
        `id.eq.${Number(filters.filterKeyword) || 0},requester.ilike.%${
          filters.filterKeyword
        }%,purpose.ilike.%${filters.filterKeyword}%`
      )
    }

    // P.O.
    if (filters.filterPo && filters.filterPo !== 'All') {
      query = query.eq('po_id', filters.filterPo)
    }

    // C.A.
    if (filters.filterCa && filters.filterCa !== 'All') {
      query = query.eq('ca_id', filters.filterCa)
    }

    // Type
    if (filters.filterType && filters.filterType !== 'All') {
      query = query.eq('type', filters.filterType)
    }

    // Status
    if (filters.filterStatus && filters.filterStatus !== 'All') {
      query = query.eq('status', filters.filterStatus)
    }

    // Department
    if (filters.filterDepartment && filters.filterDepartment !== 'All') {
      query = query.eq('department_id', filters.filterDepartment)
    }

    // Vehicle
    if (filters.filterVehicle && filters.filterVehicle !== 'All') {
      query = query.eq('vehicle_id', filters.filterVehicle)
    }

    // From Appropriation filters
    if (poIds.length > 0) {
      query = query.in('po_id', poIds)
    }

    // Filter date from
    if (typeof filters.filterDateFrom !== 'undefined') {
      query = query.gte(
        'date_requested',
        format(new Date(filters.filterDateFrom), 'yyyy-MM-dd')
      )
    }

    // Filter date to
    if (typeof filters.filterDateTo !== 'undefined') {
      query = query.lte(
        'date_requested',
        format(new Date(filters.filterDateTo), 'yyyy-MM-dd')
      )
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('date_requested', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch ris error', error)
    return { data: [], count: 0 }
  }
}

export async function fetchRisVehicles(
  filters: {
    filterKeyword?: string
  },
  perPageCount: number,
  rangeFrom: number
) {
  try {
    let query = supabase
      .from('ddm_ris_vehicles')
      .select('*', { count: 'exact' })

    // Full text search
    if (
      typeof filters.filterKeyword !== 'undefined' &&
      filters.filterKeyword.trim() !== ''
    ) {
      query = query.or(
        `name.ilike.%${filters.filterKeyword}%,plate_number.ilike.%${filters.filterKeyword}%`
      )
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error xx', error)
    return { data: [], count: 0 }
  }
}

export async function fetchRisDepartmentCodes(
  filters: {
    filterKeyword?: string
  },
  perPageCount: number,
  rangeFrom: number
) {
  try {
    let query = supabase
      .from('ddm_ris_department_codes')
      .select('*, department:department_id(*), purchase_order:po_id(*)', {
        count: 'exact',
      })

    // Full text search
    if (
      typeof filters.filterKeyword !== 'undefined' &&
      filters.filterKeyword.trim() !== ''
    ) {
      query = query.or(`code.ilike.%${filters.filterKeyword}%`)
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error xx', error)
    return { data: [], count: 0 }
  }
}

export async function fetchVehicleReservations(filters: {
  filterKeyword?: string
  filterVehicle?: string
  filterDate?: Date | undefined
}) {
  try {
    let query = supabase
      .from('ddm_reservations')
      .select('*, vehicle:vehicle_id(*)', { count: 'exact' })

    // Full text search
    if (
      typeof filters.filterKeyword !== 'undefined' &&
      filters.filterKeyword.trim() !== ''
    ) {
      query = query.or(
        `requester.ilike.%${filters.filterKeyword}%,department.ilike.%${filters.filterKeyword}%`
      )
    }

    // Filter date
    if (typeof filters.filterDate !== 'undefined') {
      query = query.eq(
        'date',
        format(new Date(filters.filterDate), 'yyyy-MM-dd')
      )
    } else {
      const d = new Date()
      const currentDate = subDays(d, 2)
      const newDate = addDays(d, 5)
      query = query.gte('date', format(currentDate, 'yyyy-MM-dd'))
      query = query.lte('date', format(newDate, 'yyyy-MM-dd'))
    }

    // Filter vehicle
    if (filters.filterVehicle && filters.filterVehicle !== '') {
      query = query.eq('vehicle_id', filters.filterVehicle)
    }

    // Order By
    query = query.order('time', { ascending: true })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error xx', error)
    return { data: [], count: 0 }
  }
}

export async function fetchReservationVehicles(
  filters: {
    filterKeyword?: string
  },
  perPageCount: number,
  rangeFrom: number
) {
  try {
    let query = supabase
      .from('ddm_reservation_vehicles')
      .select('*', { count: 'exact' })

    // Full text search
    if (
      typeof filters.filterKeyword !== 'undefined' &&
      filters.filterKeyword.trim() !== ''
    ) {
      query = query.or(
        `name.ilike.%${filters.filterKeyword}%,plate_number.ilike.%${filters.filterKeyword}%`
      )
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error xx', error)
    return { data: [], count: 0 }
  }
}

export async function fetchRisDepartments(
  filters: {
    filterKeyword?: string
  },
  perPageCount: number,
  rangeFrom: number
) {
  try {
    let query = supabase
      .from('ddm_ris_departments')
      .select('*', { count: 'exact' })

    // Full text search
    if (
      typeof filters.filterKeyword !== 'undefined' &&
      filters.filterKeyword.trim() !== ''
    ) {
      query = query.or(`name.ilike.%${filters.filterKeyword}%`)
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error xx', error)
    return { data: [], count: 0 }
  }
}

export async function fetchSurveys(perPageCount: number, rangeFrom: number) {
  try {
    let query = supabase
      .from('ddm_profile_surveys')
      .select('*', { count: 'exact' })

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error xx', error)
    return { data: [], count: 0 }
  }
}

export async function fetchServices(perPageCount: number, rangeFrom: number) {
  try {
    let query = supabase
      .from('ddm_profile_services')
      .select('*', { count: 'exact' })

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error xx', error)
    return { data: [], count: 0 }
  }
}

export async function fetchRisAppropriations(
  filters: {
    filterKeyword?: string
  },
  perPageCount: number,
  rangeFrom: number
) {
  try {
    let query = supabase
      .from('ddm_ris_appropriations')
      .select('*,ddm_ris_purchase_orders(amount)', { count: 'exact' })

    // Full text search
    if (
      typeof filters.filterKeyword !== 'undefined' &&
      filters.filterKeyword.trim() !== ''
    ) {
      query = query.or(`name.ilike.%${filters.filterKeyword}%`)
    }

    // Perform count before paginations
    // const { count } = await query

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)
    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error xx', error)
    return { data: [], count: 0 }
  }
}

export async function fetchActivities(
  userDepartment: string,
  today: string,
  endDate: Date
) {
  try {
    // Get Document ID within Tracker Flow and origin department
    const trackerIds: string[] = []

    if (userDepartment) {
      let query1 = supabase.from('ddm_tracker_routes').select('tracker_id')

      const statuses = getStatusesByOffice(userDepartment)
      query1 = query1.or(statuses)

      const { data: trackerFlow } = await query1

      trackerFlow?.forEach((item: any) => {
        trackerIds.push(item.tracker_id)
      })

      const { data: origins } = await supabase
        .from('ddm_trackers')
        .select('id, origin_department')
        .eq('origin_department', userDepartment)
      origins?.forEach((item: any) => {
        trackerIds.push(item.id)
      })
    }

    if (trackerIds.length === 0) {
      trackerIds.push('99999')
    }

    const { data, count, error } = await supabase
      .from('ddm_trackers')
      .select('*', { count: 'exact' })
      .gte('activity_date', today)
      .lt('activity_date', endDate.toISOString())
      .eq('archived', false)
      .in('id', trackerIds) // Filters allowed tracker Ids
      .order('activity_date', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error', error)
    return { data: [], count: 0 }
  }
}

export async function fetchAccounts(
  filters: { filterStatus?: string },
  perPageCount: number,
  rangeFrom: number
) {
  try {
    let query = supabase
      .from('ddm_users')
      .select('*', { count: 'exact' })
      .neq('email', 'berlcamp@gmail.com')

    // filter status
    if (filters.filterStatus && filters.filterStatus !== '') {
      query = query.eq('status', filters.filterStatus)
    }

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)

    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data: userData, error, count } = await query

    if (error) {
      throw new Error(error.message)
    }

    const data: AccountTypes[] = userData

    return { data, count }
  } catch (error) {
    console.error('fetch error', error)
    return { data: [], count: 0 }
  }
}

export async function logError(
  transaction: string,
  table: string,
  data: string,
  error: string
) {
  await supabase.from('error_logs').insert({
    system: 'ddm',
    transaction,
    table,
    data,
    error,
  })
}

export async function fetchErrorLogs(perPageCount: number, rangeFrom: number) {
  try {
    let query = supabase.from('error_logs').select('*', { count: 'exact' })

    // Per Page from context
    const from = rangeFrom
    const to = from + (perPageCount - 1)

    // Per Page from context
    query = query.range(from, to)

    // Order By
    query = query.order('id', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error logs error', error)
    return { data: [], count: 0 }
  }
}
