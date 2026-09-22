import { createClient } from '@supabase/supabase-js'

import {
  formatRisAmount,
  getRisAmount,
  roundRisAmount,
} from '@/utils/ris-helper'

// Shared by the public fuel request portal's API routes. The portal runs with
// the anon key, which RLS blocks from reading ddm_ris — the embed comes back
// empty instead of erroring, so any balance computed in the browser would show
// the P.O.'s full allocation. Everything here runs server-side instead.

export const createServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceRoleKey =
    process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export interface PortalBalance {
  label: string
  value: string
  // 'amount' for Fuel P.O.s (tracked in pesos), 'liters' for the rest
  unit: 'amount' | 'liters'
  // Raw figure, negative when the P.O. is already over-consumed
  remaining: number
  depleted: boolean
}

// Mirrors the P.O. list widgets (app/(ris)/rispo/Main.tsx): Fuel P.O.s are
// tracked by amount, the rest by liters, and only Approved R.I.S. consume them.
export const getPortalBalance = (po: any): PortalBalance | null => {
  if (!po) return null

  const ris: any[] = po.ddm_ris || []

  if (po.type === 'Fuel') {
    const totalAmountUsed = ris.reduce(
      (acc, r) => acc + (r.status === 'Approved' ? getRisAmount(r) : 0),
      0,
    )
    const remaining = roundRisAmount(Number(po.amount) - totalAmountUsed)
    return {
      label: 'Remaining Balance',
      value: `₱${formatRisAmount(Math.max(0, remaining))}`,
      unit: 'amount',
      remaining,
      depleted: remaining <= 0,
    }
  }

  const totalQuantityUsed = ris.reduce(
    (acc, r) => acc + (r.status === 'Approved' ? Number(r.quantity) : 0),
    0,
  )
  const remaining = Number(po.quantity) - totalQuantityUsed
  return {
    label: 'Remaining Balance',
    value: `${Math.max(0, remaining).toFixed(2)} Liters`,
    unit: 'liters',
    remaining,
    depleted: remaining <= 0,
  }
}

export const lookupFuelCode = async (supabase: any, code: string) => {
  const { data, error } = await supabase
    .from('ddm_ris_department_codes')
    .select(
      '*, purchase_order:po_id(*, ddm_ris(id,quantity,price,status,total_amount)), department:department_id(*)',
    )
    .eq('code', code.trim())
    .eq('status', 'Active')
    .limit(1)

  if (error) return { error_message: error.message, item: null }
  if (!data || data.length === 0) {
    return { error_message: 'This code does not exist', item: null }
  }

  return { error_message: '', item: data[0] }
}

export interface PortalHistoryItem {
  id: number
  date_requested: string
  requester: string
  destination: string
  vehicle: string
  type: string
  quantity: number
  price: number
  amount: number
  status: string
}

// The portal's "transaction history" is every fuel request submitted against
// this code's P.O. + department — the anonymous portal has no per-visitor
// identity beyond the code itself, and a code is shared by everyone at that
// department. Runs server-side for the same reason as the balance: RLS hides
// ddm_ris from the anon key.
export const getPortalHistory = async (
  supabase: any,
  item: any,
): Promise<PortalHistoryItem[]> => {
  const { data, error } = await supabase
    .from('ddm_ris')
    .select(
      'id,date_requested,requester,destination,type,quantity,price,total_amount,status,vehicle:vehicle_id(name,plate_number)',
    )
    .eq('po_id', item.po_id)
    .eq('department_id', item.department_id)
    .eq('is_deleted', false)
    .order('date_requested', { ascending: false })
    .order('id', { ascending: false })
    .limit(500)

  if (error || !data) return []

  return data.map((r: any) => ({
    id: r.id,
    date_requested: r.date_requested,
    requester: r.requester,
    destination: r.destination,
    vehicle: [r.vehicle?.name, r.vehicle?.plate_number]
      .filter(Boolean)
      .join(' - '),
    type: r.type,
    quantity: Number(r.quantity ?? 0),
    price: Number(r.price ?? 0),
    amount: getRisAmount(r),
    status: r.status,
  }))
}

// Only the fields the portal actually renders — the R.I.S. rows behind the
// balance never reach the browser.
export const toPortalItem = (item: any) => {
  const po = item.purchase_order
  return {
    id: item.id,
    code: item.code,
    status: item.status,
    department_id: item.department_id,
    po_id: item.po_id,
    department: {
      id: item.department?.id,
      name: item.department?.name,
    },
    purchase_order: po
      ? {
          id: po.id,
          po_number: po.po_number,
          type: po.type,
          diesel_price: po.diesel_price,
          gasoline_price: po.gasoline_price,
          oil_price: po.oil_price,
        }
      : null,
  }
}
