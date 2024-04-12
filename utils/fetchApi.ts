import type { AccountTypes } from '@/types'
import { createBrowserClient } from '@supabase/ssr'
import { format } from 'date-fns'
import { fullTextQuery } from './text-helper'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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

export async function fetchDocuments (filters: DocumentFilterTypes, perPageCount: number, rangeFrom: number) {
  try {
    // Advance filters
    const trackerIds: string[] = []
    if (filters.filterDateForwardedFrom || filters.filterDateForwardedTo) {
      let query1 = supabase.from('ddm_tracker_routes')
        .select('tracker_id')
        .limit(900)

      if(filters.filterRoute && filters.filterRoute !== '') {
        query1 = query1.eq('title', filters.filterRoute)
      }
      if(filters.filterDateForwardedFrom) {
        query1 = query1.gte('date', format(new Date(filters.filterDateForwardedFrom), 'yyyy-MM-dd'))
      }
      if(filters.filterDateForwardedTo) {
        query1 = query1.lte('date', format(new Date(filters.filterDateForwardedTo), 'yyyy-MM-dd'))
      }

      const { data: data1 } = await query1

      if (data1) {
        if(data1.length > 0) {
        data1.forEach(d => trackerIds.push(d.tracker_id))
        } else {
          trackerIds.push('99999999')
        }
      }
    }

    let query = supabase
      .from('ddm_trackers')
      .select('*', { count: 'exact' })
      .eq('archived', false)

      // Full text search
    if (typeof filters.filterKeyword !== 'undefined' && filters.filterKeyword.trim() !== '') {
      query = query.or(`routing_slip_no.ilike.%${filters.filterKeyword}%,particulars.ilike.%${filters.filterKeyword}%,agency.ilike.%${filters.filterKeyword}%,requester.ilike.%${filters.filterKeyword}%,amount.ilike.%${filters.filterKeyword}%,cheque_no.ilike.%${filters.filterKeyword}%`)
    }

    // Filter Current Location
    if (filters.filterCurrentRoute && filters.filterCurrentRoute.trim() !== '') {
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

    // Advance Filters
    if (trackerIds.length > 0) {
      query = query.in('id', trackerIds)
    }

    // Filter type
    if (typeof filters.filterTypes !== 'undefined' && filters.filterTypes.length > 0) {
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

export async function fetchProfiles (filters: FilterProfileTypes, perPageCount: number, rangeFrom: number) {
  try {
    let query = supabase
      .from('ddm_profiles')
      .select('*', { count: 'exact' })

      // Full text search
    if (filters.filterKeyword && filters.filterKeyword.trim() !== '') {
      query = query.textSearch('fts', fullTextQuery(filters.filterKeyword), {
        config: 'english'
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

export async function fetchPurchaseOrders (filters: {
  filterType?: string
  filterKeyword?: string
}, perPageCount: number, rangeFrom: number) {
  try {
    let query = supabase
      .from('ddm_ris_purchase_orders')
      .select('*, ddm_user:created_by(*), ddm_ris(quantity)', { count: 'exact' })

      // Full text search
    if (typeof filters.filterKeyword !== 'undefined' && filters.filterKeyword.trim() !== '') {
      query = query.eq('po_number', filters.filterKeyword)
    }

    // Filter type
    if (typeof filters.filterType !== 'undefined' && filters.filterType.trim() !== 'All') {
      query = query.eq('type', filters.filterType)
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

export async function fetchPriceControl (filters: {
  filterType?: string
  filterDate?: Date | undefined
}, perPageCount: number, rangeFrom: number) {
  try {
    let query = supabase
      .from('ddm_ris_prices')
      .select('*', { count: 'exact' })

      // Full text search
    if (filters.filterType && filters.filterType.trim() !== '') {
      query = query.eq('type', filters.filterType)
    }

    // Filter type
    if (filters.filterDate) {
      query = query.eq('date', format(new Date(filters.filterDate), 'yyyy-MM-dd'))
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
    console.error('fetch error price', error)
    return { data: [], count: 0 }
  }
}

export async function fetchRis (filters: {
  filterKeyword?: string
  filterDepartment?: string
  filterType?: string
  filterDateFrom?: Date | undefined
  filterDateTo?: Date | undefined
}, perPageCount: number, rangeFrom: number) {
  try {
    let query = supabase
      .from('ddm_ris')
      .select('*, ddm_user:created_by(*), vehicle:vehicle_id(*), purchase_order:po_id(*), department:department_id(*)', { count: 'exact' })

      // Full text search
    if (typeof filters.filterKeyword !== 'undefined' && filters.filterKeyword.trim() !== '') {
      query = query.or(`id.eq.${Number(filters.filterKeyword) || 0},requester.ilike.%${filters.filterKeyword}%,purpose.ilike.%${filters.filterKeyword}%`)
    }

    // Filter type
    if (typeof filters.filterType !== 'undefined' && filters.filterType.trim() !== 'All') {
      query = query.eq('type', filters.filterType)
    }

    // Filter Department
    if (typeof filters.filterDepartment !== 'undefined' && filters.filterDepartment.trim() !== 'All') {
      query = query.eq('department_id', filters.filterDepartment)
    }

    // Filter date from
    if (typeof filters.filterDateFrom !== 'undefined') {
        query = query.gte('date_requested', format(new Date(filters.filterDateFrom), 'yyyy-MM-dd'))
    }

    // Filter date to
    if (typeof filters.filterDateTo !== 'undefined') {
        query = query.lte('date_requested', format(new Date(filters.filterDateTo), 'yyyy-MM-dd'))
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

export async function fetchRisVehicles (filters: {

  filterKeyword?: string
}, perPageCount: number, rangeFrom: number) {
  try {
    let query = supabase
      .from('ddm_ris_vehicles')
      .select('*', { count: 'exact' })

      // Full text search
    if (typeof filters.filterKeyword !== 'undefined' && filters.filterKeyword.trim() !== '') {
      query = query.or(`name.ilike.%${filters.filterKeyword}%,plate_number.ilike.%${filters.filterKeyword}%`)
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

export async function fetchRisDepartments (filters: {

  filterKeyword?: string
}, perPageCount: number, rangeFrom: number) {
  try {
    let query = supabase
      .from('ddm_ris_departments')
      .select('*', { count: 'exact' })

      // Full text search
    if (typeof filters.filterKeyword !== 'undefined' && filters.filterKeyword.trim() !== '') {
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

export async function fetchActivities (today: string, endDate: Date) {
  try {
    const { data, count, error } = await supabase
      .from('ddm_trackers')
      .select('*', { count: 'exact' })
      .gte('activity_date', today)
      .lt('activity_date', endDate.toISOString())
      .order('activity_date', { ascending: true })
      .limit(100)

    if (error) {
      throw new Error(error.message)
    }

    return { data, count }
  } catch (error) {
    console.error('fetch error', error)
    return { data: [], count: 0 }
  }
}

export async function fetchAccounts (filters: { filterStatus?: string }, perPageCount: number, rangeFrom: number) {
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

export async function logError (transaction: string, table: string, data: string, error: string) {
  await supabase
    .from('error_logs')
    .insert({
      system: 'ddm',
      transaction,
      table,
      data,
      error
    })
}

export async function fetchErrorLogs (perPageCount: number, rangeFrom: number) {
  try {
    let query = supabase
      .from('error_logs')
      .select('*', { count: 'exact' })

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

