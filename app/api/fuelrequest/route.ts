import { type NextRequest, NextResponse } from 'next/server'

import {
  createServiceClient,
  getPortalBalance,
  lookupFuelCode,
} from '@/utils/portal-fuel'
import { roundRisAmount } from '@/utils/ris-helper'

interface FuelRequestPayload {
  code: string
  requester: string
  destination: string
  vehicle_id: string
  type: string
  quantity: number
  starting_balance: number
  purpose: string
  date_requested: string
}

// Submits a fuel request from the public portal. The balance is re-checked here
// rather than trusted from the browser: the portal cannot read ddm_ris, and the
// figure it was shown may be minutes old by the time the form is submitted.
export async function POST(req: NextRequest) {
  const payload: FuelRequestPayload = await req.json()

  const quantity = Number(payload.quantity)
  const startingBalance = Number(payload.starting_balance)

  if (
    !payload.code ||
    !payload.requester?.trim() ||
    !payload.destination?.trim() ||
    !payload.vehicle_id ||
    !payload.purpose?.trim() ||
    !payload.date_requested ||
    !(quantity > 0) ||
    !(startingBalance >= 0)
  ) {
    return NextResponse.json({
      error_message: 'Please complete all the required fields.',
    })
  }

  const supabase = createServiceClient()
  const { error_message, item } = await lookupFuelCode(supabase, payload.code)

  if (error_message || !item) {
    return NextResponse.json({ error_message })
  }

  const po = item.purchase_order
  const balance = getPortalBalance(po)

  if (!po || !balance) {
    return NextResponse.json({
      error_message: 'This code is not linked to a P.O. Please contact MMO.',
    })
  }

  // The fuel type must be one the P.O. actually covers, otherwise the price
  // below would be taken from an unrelated (or zero) column.
  const allowedTypes =
    po.type === 'Fuel' ? ['Diesel', 'Gasoline'] : [po.type as string]
  if (!allowedTypes.includes(payload.type)) {
    return NextResponse.json({
      error_message: `This P.O. does not cover ${payload.type}.`,
    })
  }

  if (balance.depleted) {
    return NextResponse.json({
      error_message:
        'This P.O. no longer has a remaining balance. You can no longer submit a fuel request using this code.',
    })
  }

  const price = payload.type === 'Diesel' ? po.diesel_price : po.gasoline_price

  if (balance.unit === 'amount') {
    const requestedAmount = roundRisAmount(quantity * Number(price || 0))
    if (requestedAmount > balance.remaining) {
      return NextResponse.json({
        error_message: `This request (₱${requestedAmount.toFixed(
          2,
        )}) exceeds the remaining balance of ${balance.value}.`,
      })
    }
  } else if (quantity > balance.remaining) {
    return NextResponse.json({
      error_message: `This request (${quantity.toFixed(
        2,
      )} Liters) exceeds the remaining balance of ${balance.value}.`,
    })
  }

  const { error } = await supabase.from('ddm_ris').insert({
    requester: payload.requester.trim(),
    destination: payload.destination.trim(),
    department_id: item.department_id,
    po_id: item.po_id,
    vehicle_id: payload.vehicle_id,
    transaction_type: 'Purchase Order',
    origin: 'Portal',
    type: payload.type,
    quantity,
    starting_balance: startingBalance,
    price,
    purpose: payload.purpose.trim(),
    date_requested: payload.date_requested,
  })

  if (error) {
    return NextResponse.json({ error_message: error.message })
  }

  return NextResponse.json({ error_message: '' })
}
