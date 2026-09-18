import { type NextRequest, NextResponse } from 'next/server'

import {
  createServiceClient,
  getPortalBalance,
  lookupFuelCode,
  toPortalItem,
} from '@/utils/portal-fuel'

// Looks up a department request code for the public fuel request portal and
// returns the P.O.'s real remaining balance. This cannot run in the browser:
// the portal is anonymous and RLS hides ddm_ris from the anon key.
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

  return NextResponse.json({
    error_message: '',
    item: toPortalItem(item),
    balance: getPortalBalance(item.purchase_order),
  })
}
