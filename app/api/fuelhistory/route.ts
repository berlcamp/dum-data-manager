import { type NextRequest, NextResponse } from 'next/server'

import {
  createServiceClient,
  getPortalHistory,
  lookupFuelCode,
} from '@/utils/portal-fuel'
import { buildHistoryPdf } from '@/utils/portal-fuel-pdf'

// Returns the fuel request transaction history for a portal code as a PDF
// attachment. The portal submits a plain HTML form here (not fetch) so mobile
// browsers treat the response as a normal file download. Runs server-side for
// the same reason as /api/fuelcode: the portal is anonymous and RLS hides
// ddm_ris from the anon key.
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const code = `${form.get('code') ?? ''}`.trim()

  if (code === '') {
    return new NextResponse('This code does not exist', { status: 404 })
  }

  const supabase = createServiceClient()
  const { error_message, item } = await lookupFuelCode(supabase, code)

  if (error_message || !item) {
    return new NextResponse(error_message || 'This code does not exist', {
      status: 404,
    })
  }

  const items = await getPortalHistory(supabase, item)
  const pdf = await buildHistoryPdf({
    code,
    department: item.department?.name ?? '',
    poNumber: item.purchase_order?.po_number ?? '',
    poAllocatedAmount: Number(item.purchase_order?.amount ?? 0),
    items,
  })

  const filename = `FuelRequestHistory_${code.replace(/[^\w-]/g, '_')}.pdf`

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
