import { type NextRequest, NextResponse } from 'next/server'

import {
  createServiceClient,
  getPortalHistory,
  lookupFuelCode,
} from '@/utils/portal-fuel'

// Returns the fuel request transaction history for a portal code, so the PDF
// download button can list what's been submitted against this code's P.O. +
// department. Runs server-side for the same reason as /api/fuelcode: the
// portal is anonymous and RLS hides ddm_ris from the anon key.
export async function POST(req: NextRequest) {
  const { code }: { code: string } = await req.json()

  if (!code || code.trim() === '') {
    return NextResponse.json({ error_message: 'This code does not exist' })
  }

  const supabase = createServiceClient()
  const { error_message, item } = await lookupFuelCode(supabase, code)

  if (error_message || !item) {
    return NextResponse.json({ error_message })
  }

  const items = await getPortalHistory(supabase, item)

  return NextResponse.json({
    error_message: '',
    department: item.department?.name ?? '',
    po_number: item.purchase_order?.po_number ?? '',
    items,
  })
}
